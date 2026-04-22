'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatComponent from './ChatComponent';
import { chatApi, AI_BASE_URL } from '@/services/apiClient';

export type Source = { url?: string; title?: string };
export type Message = { type: 'user' | 'ai'; content: string; citations?: string[]; confidence?: number; timestamp: Date; sources?: Source[] };
export type SessionStreamState = { messages: Message[]; isLoading: boolean; streamingSources: { db_sources: any[]; web_sources: any[] } };

const ChatWithSidebar = ({ selectedRegion, selectedCategory, regions, categories }: any) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  useEffect(() => {
    (async () => {
      try {
        const data = await chatApi.getSessions() as any;
        const sessions = data.sessions || [];
        if (sessions.length > 0) {
          setCurrentSessionId(sessions[0].id);
        } else {
          // New user — auto-create a default session
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
          // Last session deleted — create a fresh one
          const created = await chatApi.createSession('New Conversation') as any;
          setCurrentSessionId(created.session.id);
        }
        sidebarRef.current?.refreshSessions?.();
      }
    } catch (err) { console.error('Failed to delete session:', err); }
  };

  const runStream = useCallback(async (sessionId: string, query: string, region: string, category: string) => {
    const saveMessage = async (msg: Message) => {
      try {
        await chatApi.saveMessage(sessionId, msg.type, msg.content, { citations: msg.citations, confidence: msg.confidence, region, category, sources: msg.sources });
        sidebarRef.current?.refreshSessions?.();
      } catch (e) { console.error('Failed to save message:', e); }
    };

    patchSessionState(sessionId, prev => ({ isLoading: true, streamingSources: { db_sources: [], web_sources: [] }, messages: [...prev.messages, { type: 'ai', content: '', timestamp: new Date() }] }));

    const controller = new AbortController();
    abortControllers.current.set(sessionId, controller);
    const MAX_RETRIES = 2;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        const response = await fetch(`${AI_BASE_URL}/api/v1/query/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, top_k: 10, include_sources: true }), signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response body');

        let previousContent = ''; let finalAIMessage: Message | null = null; let currentSources: Source[] = []; let buffer = ''; let receivedAnyContent = false;

        const processLine = (line: string) => {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) return;
          try {
            const jsonData = JSON.parse(line.substring(6));
            if (jsonData.type === 'metadata' && jsonData.data) {
              const sources = [...(jsonData.data.db_sources || []), ...(jsonData.data.web_sources || [])];
              currentSources = sources;
              patchSessionState(sessionId, prev => ({ streamingSources: { db_sources: jsonData.data.db_sources || [], web_sources: jsonData.data.web_sources || [] }, messages: prev.messages.map((m, i) => i === prev.messages.length - 1 && m.type === 'ai' ? { ...m, sources } : m) }));
            }
            if (jsonData.type === 'content' && jsonData.data) {
              const fullContent = jsonData.data.full_content || '';
              if (fullContent && fullContent !== previousContent) {
                receivedAnyContent = true; previousContent = fullContent;
                patchSessionState(sessionId, prev => ({ messages: prev.messages.map((m, i) => i === prev.messages.length - 1 && m.type === 'ai' ? { ...m, content: fullContent } : m) }));
                finalAIMessage = { type: 'ai', content: fullContent, sources: currentSources, timestamp: new Date() };
              }
            }
            if (jsonData.type === 'error') throw new Error(jsonData.message || 'Stream error');
          } catch (e: any) { if (e.message?.startsWith('Stream error')) throw e; }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) { buffer.split('\n').forEach(processLine); break; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n'); buffer = lines.pop() || ''; lines.forEach(processLine);
        }

        if (finalAIMessage) await saveMessage(finalAIMessage);
        else if (!receivedAnyContent) throw new Error('Empty response from server');
        break;
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        attempt++;
        if (attempt <= MAX_RETRIES) {
          patchSessionState(sessionId, prev => ({ messages: prev.messages.map((m, i) => i === prev.messages.length - 1 && m.type === 'ai' ? { ...m, content: '' } : m) }));
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          const errorMsg = error.message?.toLowerCase().includes('fetch') ? 'Unable to reach the server. Please check your connection.' : `Something went wrong (${error.message}). Please try again.`;
          patchSessionState(sessionId, prev => ({ messages: prev.messages.map((m, i) => i === prev.messages.length - 1 && m.type === 'ai' ? { ...m, content: errorMsg } : m) }));
        }
      }
    }
    patchSessionState(sessionId, { isLoading: false, streamingSources: { db_sources: [], web_sources: [] } });
    abortControllers.current.delete(sessionId);
  }, [patchSessionState]);

  const currentState = currentSessionId ? getSessionState(currentSessionId) : null;

  return (
    <div className="flex h-full overflow-hidden bg-white">
      <ChatSidebar ref={sidebarRef} currentSessionId={currentSessionId} onNewChat={createNewSession} onSelectSession={setCurrentSessionId} onDeleteSession={handleDeleteSession} isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {currentSessionId ? (
          <ChatComponent key={currentSessionId} selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} sessionId={currentSessionId} messages={currentState!.messages} isLoading={currentState!.isLoading} streamingSources={currentState!.streamingSources}
            onSetMessages={(updater: any) => patchSessionState(currentSessionId, prev => ({ messages: typeof updater === 'function' ? updater(prev.messages) : updater }))}
            onRunStream={(q: string, r: string, c: string) => runStream(currentSessionId, q, r, c)}
            onMessageSent={() => sidebarRef.current?.refreshSessions?.()}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWithSidebar;
