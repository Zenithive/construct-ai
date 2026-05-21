'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatComponent from './ChatComponent';
import UpgradeModal from './billing/UpgradeModal';
import UsageWarning from './billing/UsageWarning';
import { useBillingUsage } from '@/hooks/useBillingUsage';
import { billingApi, chatApi, LimitExceededError, getUser, saveCurrentSessionId } from '@/services/apiClient';
import { COUNTRY_LABEL_TO_CODE, DEFAULT_COUNTRY_CODE, DEFAULT_COUNTRY_LABEL} from '@/constants/countries';

export type Source = { url?: string; title?: string };
export type Message = {
  id?: string;
  type: 'user' | 'ai';
  content: string;
  citations?: string[];
  confidence?: number;
  timestamp: Date;
  sources?: Source[];
  feedback_type?: 'Like' | 'Dislike' | null;
  feedback_reason?: string | null;
};
export type SessionStreamState = { messages: Message[]; isLoading: boolean; streamingSources: { db_sources: any[]; web_sources: any[] } };

const ChatWithSidebar = ({ selectedRegion, selectedCategory, regions, categories }: any) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => {
    const user = getUser();
    return COUNTRY_LABEL_TO_CODE[(user?.country as string) ?? ''] ?? DEFAULT_COUNTRY_CODE;
  });
  const [selectedCountryLabel, setSelectedCountryLabel] = useState<string>(() => {
    const user = getUser();
    return (user?.country as string) || DEFAULT_COUNTRY_LABEL;
  });
  const [limitBlocked, setLimitBlocked] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const { usage, isAtLimit } = useBillingUsage(usageRefreshKey);
  const openUpgrade = useCallback(() => setUpgradeOpen(true), []);
  const bumpUsage = useCallback(() => setUsageRefreshKey((k) => k + 1), []);
  const sidebarRef = useRef<any>(null);
  const isCreatingSession = useRef(false);
  const [sessionStates, setSessionStates] = useState<Map<string, SessionStreamState>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const getSessionState = (sid: string): SessionStreamState =>
    sessionStates.get(sid) ?? { messages: [], isLoading: false, streamingSources: { db_sources: [], web_sources: [] } };

  const patchSessionState = useCallback((sid: string, patch: Partial<SessionStreamState> | ((prev: SessionStreamState) => Partial<SessionStreamState>)) => {
    setSessionStates(prev => {
      const current = prev.get(sid) ?? { messages: [], isLoading: false, streamingSources: { db_sources: [], web_sources: [] } };
      const updates = typeof patch === 'function' ? patch(current) : patch;
      const next = new Map(prev);
      next.set(sid, { ...current, ...updates });
      return next;
    });
  }, []);

  const rollbackLastSend = useCallback((sessionId: string) => {
    patchSessionState(sessionId, prev => {
      const msgs = [...prev.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].type === 'ai' && !msgs[msgs.length - 1].content) {
        msgs.pop();
      }
      if (msgs.length > 0 && msgs[msgs.length - 1].type === 'user') {
        msgs.pop();
      }
      return {
        messages: msgs,
        isLoading: false,
        streamingSources: { db_sources: [], web_sources: [] },
      };
    });
  }, [patchSessionState]);

  useEffect(() => {
    saveCurrentSessionId(currentSessionId);
  }, [currentSessionId]);

  useEffect(() => {
    if (isAtLimit) {
      setLimitBlocked(true);
    }
  }, [isAtLimit, usage?.plan.name]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;

    const sessionId = params.get('session_id');
    window.history.replaceState({}, '', '/dashboard');

    const finish = () => {
      setLimitBlocked(false);
      bumpUsage();
    };

    if (sessionId) {
      billingApi
        .confirmCheckout(sessionId)
        .then(finish)
        .catch((e) => {
          console.error('[checkout] confirm failed (webhook may still apply):', e);
          finish();
        });
    } else {
      finish();
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await chatApi.getSessions() as any;
        const sessions = data.sessions || [];
        if (sessions.length > 0) {
          setCurrentSessionId(sessions[0].id);
        } else {
          const created = await chatApi.createSession('New Conversation') as any;
          setCurrentSessionId(created.session.id);
          sidebarRef.current?.refreshSessions?.();
        }
      } catch (err) { console.error('Failed to initialize session:', err); }
    })();
  }, []);

  const createNewSession = async () => {
    if (isCreatingSession.current) return;
    isCreatingSession.current = true;
    try {
      const data = await chatApi.createSession('New Conversation') as any;
      setCurrentSessionId(data.session.id);
      sidebarRef.current?.refreshSessions?.();
    } catch (err) { console.error('Failed to create session:', err); }
    finally { isCreatingSession.current = false; }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await chatApi.deleteSession(sessionId);
      abortControllers.current.get(sessionId)?.abort();
      abortControllers.current.delete(sessionId);
      setSessionStates(prev => { const n = new Map(prev); n.delete(sessionId); return n; });
      if (sessionId === currentSessionId) {
        const data = await chatApi.getSessions() as any;
        const remaining = (data.sessions || []).filter((s: any) => s.id !== sessionId);
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id);
        } else {
          const created = await chatApi.createSession('New Conversation') as any;
          setCurrentSessionId(created.session.id);
        }
        sidebarRef.current?.refreshSessions?.();
      }
    } catch (err) { console.error('Failed to delete session:', err); }
  };

  const runStream = useCallback(async (
    sessionId: string,
    query: string,
    displayContent: string,
    region: string,
    category: string,
  ) => {
    if (
      limitBlocked ||
      (usage != null && usage.limit !== null && (usage.remaining ?? 0) <= 0)
    ) {
      setLimitBlocked(true);
      openUpgrade();
      return;
    }

    patchSessionState(sessionId, prev => ({
      isLoading: true,
      streamingSources: { db_sources: [], web_sources: [] },
      messages: [...prev.messages, { type: 'ai', content: '', timestamp: new Date() }],
    }));

    const controller = new AbortController();
    abortControllers.current.set(sessionId, controller);

    try {
        const response = await chatApi.sendMessage(
          sessionId,
          {
            query,
            content: displayContent,
            country_code: selectedCountryCode,
            region,
            category,
          },
          controller.signal
        );

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response body');

        let previousContent = '';
        let currentSources: Source[] = [];
        let buffer = '';
        let receivedAnyContent = false;
        let aiMessageId: string | undefined;

        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed.includes('[DONE]')) return;
          try {
            const jsonData = JSON.parse(trimmed.slice(6));

            if (jsonData.type === 'user_message' && jsonData.data?.id) {
              const userId = jsonData.data.id as string;
              let patched = false;
              patchSessionState(sessionId, prev => ({
                messages: prev.messages.map((m) => {
                  if (!patched && m.type === 'user' && !m.id) {
                    patched = true;
                    return { ...m, id: userId };
                  }
                  return m;
                }),
              }));
            }

            if (jsonData.type === 'metadata' && jsonData.data) {
              const sources = [...(jsonData.data.db_sources || []), ...(jsonData.data.web_sources || [])];
              currentSources = sources;
              patchSessionState(sessionId, prev => ({
                streamingSources: {
                  db_sources: jsonData.data.db_sources || [],
                  web_sources: jsonData.data.web_sources || [],
                },
                messages: prev.messages.map((m, i) =>
                  i === prev.messages.length - 1 && m.type === 'ai'
                    ? { ...m, sources }
                    : m
                ),
              }));
            }

            if (jsonData.type === 'content' && jsonData.data) {
              const fullContent =
                jsonData.data.full_content ||
                jsonData.data.content ||
                jsonData.data.text ||
                '';
              if (fullContent && fullContent !== previousContent) {
                receivedAnyContent = true;
                previousContent = fullContent;
                patchSessionState(sessionId, prev => ({
                  messages: prev.messages.map((m, i) =>
                    i === prev.messages.length - 1 && m.type === 'ai'
                      ? { ...m, content: fullContent }
                      : m
                  ),
                }));
              }
            }

            if (jsonData.type === 'done' && jsonData.data?.aiMessageId) {
              aiMessageId = jsonData.data.aiMessageId as string;
              bumpUsage();
            }

            if (jsonData.type === 'error') {
              throw new Error(jsonData.data?.message || jsonData.message || 'Stream error');
            }
          } catch (e: unknown) {
            if (e instanceof Error && e.message?.includes('Stream error')) throw e;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer.split('\n').forEach(processLine);
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(processLine);
        }

        if (!receivedAnyContent) throw new Error('Empty response from server');

        if (aiMessageId) {
          patchSessionState(sessionId, prev => ({
            messages: prev.messages.map((m, i) =>
              i === prev.messages.length - 1 && m.type === 'ai'
                ? { ...m, id: aiMessageId, sources: currentSources }
                : m
            ),
          }));
        }

        sidebarRef.current?.refreshSessions?.();
        bumpUsage();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;

        if (error instanceof LimitExceededError) {
          rollbackLastSend(sessionId);
          setLimitBlocked(true);
          bumpUsage();
          openUpgrade();
          return;
        }

        const msg =
          error instanceof Error
            ? error.message?.toLowerCase().includes('fetch')
              ? 'Unable to reach the server. Please check your connection.'
              : `Something went wrong (${error.message}). Please try again.`
            : 'Something went wrong. Please try again.';
        patchSessionState(sessionId, prev => ({
          messages: prev.messages.map((m, i) =>
            i === prev.messages.length - 1 && m.type === 'ai' ? { ...m, content: msg } : m
          ),
        }));
    }

    patchSessionState(sessionId, { isLoading: false, streamingSources: { db_sources: [], web_sources: [] } });
    abortControllers.current.delete(sessionId);
  }, [patchSessionState, rollbackLastSend, selectedCountryCode, limitBlocked, usage, openUpgrade, bumpUsage]);

  const currentState = currentSessionId ? getSessionState(currentSessionId) : null;

  return (
    <div className="flex h-full overflow-hidden bg-[#fafaf8]">
      <ChatSidebar
        ref={sidebarRef}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectSession={setCurrentSessionId}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onCountryChange={(code, label) => {
          setSelectedCountryCode(code);
          setSelectedCountryLabel(label);
        }}
        usageRefreshKey={usageRefreshKey}
        onRefreshUsage={bumpUsage}
      />
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {usage && (
          <div className="flex-shrink-0 px-3 pt-2 sm:px-4">
            <UsageWarning usage={usage} onUpgrade={openUpgrade} />
          </div>
        )}
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        {currentSessionId ? (
          <ChatComponent
            key={currentSessionId}
            selectedCountry={selectedCountryLabel}
            selectedCategory={selectedCategory}
            regions={regions}
            categories={categories}
            sessionId={currentSessionId}
            messages={currentState!.messages}
            isLoading={currentState!.isLoading}
            streamingSources={currentState!.streamingSources}
            usage={usage}
            onSetMessages={(updater: any) =>
              patchSessionState(currentSessionId, (prev) => ({
                messages:
                  typeof updater === 'function' ? updater(prev.messages) : updater,
              }))
            }
            onRunStream={(q: string, c: string, display: string) =>
              runStream(currentSessionId, q, display, selectedCountryLabel, c)
            }
            isLimitBlocked={limitBlocked}
            onRequestUpgrade={openUpgrade}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E1F5EE] border-t-[#1D9E75]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWithSidebar;
