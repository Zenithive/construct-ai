'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Search, ArrowDown, Upload as Paperclip, X, FileText, Loader2, CheckCircle, AlertCircle, Zap, Menu } from 'lucide-react';
import { chatApi, uploadApi, AI_BASE_URL, getUserId, LimitExceededError, billingApi } from '@/services/apiClient';
import { renderContent } from '@/utils/parseMessage';
import { normalizeFeedbackType } from '@/lib/feedback';
import type { Message, Source } from './ChatWithSidebar';
import { MessageActions, CopyIconButton } from './chat/MessageActions';
import { ReferencesSection } from './chat/ReferencesSection';
import { useBillingUsage } from '@/hooks/useBillingUsage';
import axios from 'axios';

type ChatComponentProps = {
  selectedCountry: string;
  selectedCategory: string;
  regions: { value: string; label: string; flag?: string }[];
  categories: { value: string; label: string }[];
  sessionId: string;
  messages: Message[];
  isLoading: boolean;
  streamingSources: { db_sources: any[]; web_sources: any[] };
  onSetMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  onRunStream: (query: string, category: string) => void;
  onMessageSent: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
};

type AttachedFile = {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  errorMsg?: string;
};

const BUBBLE_MAX = 'max-w-[85%] sm:max-w-2xl';

const ChatComponent = ({
  selectedCountry, selectedCategory, regions, categories,
  sessionId, messages, isLoading, streamingSources,
  onSetMessages, onRunStream, onMessageSent, onToggleSidebar, isSidebarOpen,
}: ChatComponentProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [category, setCategory] = useState(selectedCategory);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Check billing usage — disable input if limit reached
  const { usage } = useBillingUsage();
  const isLimitReached = usage !== null && usage.limit !== null && usage.used >= usage.limit;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const historyLoadedRef = useRef(false);

  const sampleQuestions = [
    'What are the fire safety requirements for high-rise buildings?',
    "What's the minimum wage for construction workers in this region?",
    'Are there specific requirements for crane operations?',
    'What are the environmental clearance requirements for new construction?',
  ];

  // ── Markdown / citation helpers ───────────────────────────────────────────

  const parsePDFCitations = (text: string) => {
    const markdownLinkPattern = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi;
    return text.replace(markdownLinkPattern, (_match, linkText, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#1D9E75] hover:text-[#0F6E56] underline font-medium break-words inline-block max-w-full transition-colors">${linkText}</a>`
    );
  };

  const renderCitationContent = (citation: string) => (
    <span dangerouslySetInnerHTML={{ __html: parsePDFCitations(citation) }} />
  );

  const renderMessageContent = (content: string, sources?: Source[]) => (
    <div
      className="text-base max-w-none leading-relaxed break-words text-gray-800
        [&_p]:mb-3 [&_p:last-child]:mb-0
        [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:first:mt-0
        [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:first:mt-0 [&_h2]:border-b [&_h2]:border-gray-200 [&_h2]:pb-1
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:first:mt-0
        [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-gray-900 [&_h4]:mt-3 [&_h4]:mb-1
        [&_ul]:my-2.5 [&_ol]:my-2.5
        [&_blockquote]:border-l-gray-300 [&_blockquote]:text-gray-600
        [&_code]:text-sm [&_pre]:text-sm"
      dangerouslySetInnerHTML={{ __html: renderContent(content, sources || []) }}
    />
  );

  // ── Textarea auto-resize ──────────────────────────────────────────────────

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => { adjustTextareaHeight(); }, [inputMessage, adjustTextareaHeight]);

  // ── Scroll helpers ────────────────────────────────────────────────────────

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const isUserAtBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };
  const handleScroll = () => setIsAutoScroll(isUserAtBottom());

  // ── Load history ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0 || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    (async () => {
      try {
        setIsLoadingHistory(true);
        const data = await chatApi.getMessages(sessionId) as any;
        if (!data?.messages) return;
        const loaded: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.message_type as 'user' | 'ai',
          content: msg.content,
          citations: msg.citations || undefined,
          confidence: msg.confidence || undefined,
          sources: msg.sources || undefined,
          timestamp: new Date(msg.created_at),
          feedback_type: normalizeFeedbackType(msg.feedback_type) ?? undefined,
          feedback_reason: msg.feedback_reason ?? undefined,
        }));
        onSetMessages(loaded);
      } catch (err: any) {
        console.error('Failed to load chat history:', err?.message || err);
      } finally {
        setIsLoadingHistory(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => { if (messages.length > 0 && isAutoScroll) scrollToBottom(); }, [messages, isAutoScroll]);
  useEffect(() => { setCategory(selectedCategory); }, [selectedCategory]);

  // ── File upload — background, non-blocking ────────────────────────────────

  const sendFileToAIBackend = async (file: File) => {
    try {
      const userId = getUserId();
      if (!userId) return false;
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('user_id', userId);
      formData.append('session_id', sessionId);
      const response = await axios.post(`${AI_BASE_URL}/api/v1/documents/upload`, formData);
      return response.data.status === 'processing';
    } catch {
      return false;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        const errEntry: AttachedFile = {
          id: `err-${Date.now()}-${file.name}`,
          file,
          status: 'error',
          errorMsg: 'Only PDF, DOC, DOCX allowed',
        };
        setAttachedFiles(prev => [...prev, errEntry]);
        continue;
      }

      const tempId = `upload-${Date.now()}-${file.name}`;
      // Add chip immediately so user sees it while typing
      setAttachedFiles(prev => [...prev, { id: tempId, file, status: 'uploading' }]);

      // Upload in background — does NOT block the textarea
      (async () => {
        try {
          await uploadApi.uploadFile(file, sessionId);
          await sendFileToAIBackend(file);
          setAttachedFiles(prev =>
            prev.map(f => f.id === tempId ? { ...f, status: 'success' } : f)
          );
        } catch {
          setAttachedFiles(prev =>
            prev.map(f => f.id === tempId ? { ...f, status: 'error', errorMsg: 'Upload failed' } : f)
          );
        }
      })();
    }
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessingRef.current || isLoading) return;
    isProcessingRef.current = true;
    const query = inputMessage.trim();
    setInputMessage('');
    setIsAutoScroll(true);

    // Capture successfully uploaded file names to show in the message bubble
    const uploadedNames = attachedFiles
      .filter(f => f.status === 'success')
      .map(f => f.file.name);

    // Clear successful chips on send; keep errored ones visible
    setAttachedFiles(prev => prev.filter(f => f.status === 'error'));

    const userMessage: Message = {
      type: 'user',
      content: query,
      timestamp: new Date(),
      ...(uploadedNames.length > 0 ? { attachments: uploadedNames } : {}),
    };
    onSetMessages(prev => [...prev, userMessage]);
    try {
      await chatApi.saveMessage(sessionId, 'user', query, { region: selectedCountry, category });
      onMessageSent();
    } catch (e) {
      if (e instanceof LimitExceededError) {
        // Replace the user message with a limit-reached AI bubble
        const limitMsg: Message = {
          type: 'ai',
          content: '__LIMIT_REACHED__',
          timestamp: new Date(),
        };
        onSetMessages(prev => [...prev, limitMsg]);
        isProcessingRef.current = false;
        return;
      }
      console.error('Failed to save user message:', e);
    }
    onRunStream(query, category);
    // Reset only after stream is kicked off — isLoading will block further sends
    isProcessingRef.current = false;
  };

  const showHistory = isLoadingHistory && messages.length === 0;
  const hasUploading = attachedFiles.some(f => f.status === 'uploading');

  // Inject a virtual limit-reached bubble at the end when limit is hit,
  // so it shows on every page load without being saved to the DB.
  const displayMessages = (() => {
    if (!isLimitReached || messages.length === 0) return messages;
    const last = messages[messages.length - 1];
    if (last.type === 'ai' && last.content === '__LIMIT_REACHED__') return messages;
    return [...messages, { type: 'ai' as const, content: '__LIMIT_REACHED__', timestamp: new Date() }];
  })();

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#fafaf8]">

      {/* ── Mobile top bar — always visible on mobile, sticky ── */}
      <div className="md:hidden flex items-center gap-3 px-4 h-12 border-b border-black/[0.09] bg-white flex-shrink-0 sticky top-0 z-30">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 text-[#555] hover:text-[#111] hover:bg-[#f0f0ec] rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#1D9E75] rounded-md flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M3 7l9-4 9 4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-[#111]">Construction<span className="text-[#1D9E75]">AI</span></span>
        </div>
      </div>

      {/* ── Messages scroll area ─────────────────────────────────────────── */}
      <div
        id="chat-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#fafaf8]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-5 sm:py-5">
          {showHistory ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/[0.09] border-t-[#1D9E75]" />
              <p className="mt-3 text-sm text-gray-500">Loading chat history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-lg py-10 text-center sm:py-14">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#E1F5EE] bg-[#E1F5EE]">
                <Search className="h-6 w-6 text-[#1D9E75]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 sm:text-2xl">How can I help you today?</h3>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                Ask about construction regulations, safety standards, or compliance requirements
              </p>
              <div className="mt-6 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
                {sampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setInputMessage(question)}
                    className="rounded-lg border border-black/[0.09] bg-white px-3.5 py-3 text-left text-sm leading-snug text-[#555] transition-colors hover:border-black/[0.14] hover:bg-[#f7f7f5]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-5">
              {displayMessages.map((message, index) => {
                const isThisStreaming = index === displayMessages.length - 1 && isLoading;

                return (
                  <div key={index}>
                    {/* ── User message ── */}
                    {message.type === 'user' && (
                      <div className="group flex flex-col items-end">
                        <div className={`${BUBBLE_MAX} rounded-2xl rounded-br-md border border-[#5DCAA5]/30 bg-[#E1F5EE] px-4 py-3 text-[15px] leading-relaxed text-[#111] shadow-sm transition-shadow duration-150 hover:shadow`}>
                          {/* Attached file chips inside the bubble */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {message.attachments.map((name, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1.5 rounded-lg border border-[#5DCAA5]/40 bg-white/70 px-2.5 py-1 text-xs font-medium text-[#0F6E56]"
                                >
                                  <FileText className="h-3 w-3 flex-shrink-0" />
                                  <span className="max-w-[200px] truncate">{name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                        <div className="mt-1 flex items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <CopyIconButton text={message.content} />
                        </div>
                      </div>
                    )}

                    {/* ── References section (above AI bubble) ── */}
                    {message.type === 'ai' && (() => {
                      const isLastAndStreaming = isThisStreaming && streamingSources.web_sources.length > 0;
                      const webSources = isLastAndStreaming
                        ? streamingSources.web_sources
                        : (message.sources || []).filter((s: any) => s.url);
                      if (webSources.length === 0) return null;
                      return (
                        <div className="mb-3 flex justify-start">
                          <div className={BUBBLE_MAX}>
                            <ReferencesSection sources={webSources} isStreaming={isLastAndStreaming} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── AI response bubble ── */}
                    {message.type === 'ai' && message.content && (
                      <div className="flex justify-start">
                        {message.content === '__LIMIT_REACHED__' ? (
                          /* ── Limit reached inline bubble ── */
                          <div className={`${BUBBLE_MAX} rounded-2xl rounded-bl-md border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm`}>
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Zap className="w-4 h-4 text-amber-500" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#111] mb-1">Free trial limit reached</p>
                                <p className="text-sm text-[#555]">
                                  You've used all your free messages. Subscribe to a plan to continue chatting.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-11">
                              <button
                                onClick={async () => {
                                  setUpgradingPlan('pro');
                                  try {
                                    const { url } = await billingApi.createCheckoutSession('pro');
                                    if (url) window.location.href = url;
                                  } catch (e) { console.error(e); }
                                  finally { setUpgradingPlan(null); }
                                }}
                                disabled={!!upgradingPlan}
                                className="flex-1 bg-[#1D9E75] hover:bg-[#0F6E56] text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {upgradingPlan === 'pro' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                Upgrade to Pro
                              </button>
                              <button
                                onClick={() => { window.location.href = 'mailto:info@zenithive.com?subject=Enterprise Plan Enquiry'; }}
                                className="flex-1 bg-[#111] hover:bg-[#333] text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                              >
                                Contact Sales
                              </button>
                            </div>
                          </div>
                        ) : (
                        <div className={`${BUBBLE_MAX} rounded-2xl rounded-bl-md border border-black/[0.09] bg-white px-4 py-3 shadow-sm`}>
                          {renderMessageContent(message.content, message.sources)}

                          {message.citations && (
                            <div className="mt-3 border-t border-gray-100 pt-3">
                              <p className="mb-2 text-xs font-medium text-gray-500">Sources</p>
                              {message.citations.map((citation, i) => (
                                <div key={i} className="mb-1.5 border-l-2 border-[#5DCAA5] pl-3 text-xs text-[#555]">
                                  {renderCitationContent(citation)}
                                </div>
                              ))}
                              {message.confidence && (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="h-1 flex-1 rounded-full bg-gray-100">
                                    <div className="h-1 rounded-full bg-[#1D9E75] transition-all duration-300" style={{ width: `${message.confidence}%` }} />
                                  </div>
                                  <span className="shrink-0 text-xs text-gray-400">{message.confidence}% confidence</span>
                                </div>
                              )}
                            </div>
                          )}

                          {!isThisStreaming && (
                            <MessageActions
                              content={message.content}
                              messageId={message.id}
                              sessionId={sessionId}
                              initialFeedbackType={message.feedback_type ?? null}
                            />
                          )}
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading &&
                displayMessages.length > 0 &&
                displayMessages[displayMessages.length - 1].type === 'ai' &&
                streamingSources.db_sources.length === 0 &&
                streamingSources.web_sources.length === 0 && (
                <div className="flex justify-start">
                  <div className={`${BUBBLE_MAX} flex items-center gap-2 rounded-2xl rounded-bl-md border border-black/[0.09] bg-white px-4 py-3 shadow-sm`}>
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
            </div>
          )}
        </div>

        {!isAutoScroll && messages.length > 0 && (
          <button
            type="button"
            onClick={() => { setIsAutoScroll(true); scrollToBottom(); }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-lg transition-all hover:bg-gray-50 sm:right-6"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-black/[0.09] bg-[#fafaf8]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm sm:px-4 sm:pb-4 sm:pt-3">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-xl border border-black/[0.09] bg-white shadow-sm transition-[border-color,box-shadow] focus-within:border-black/[0.14] focus-within:shadow-md">

            {/* ── Attached file chips ── */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-3">
                {attachedFiles.map(af => (
                  <div
                    key={af.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      af.status === 'uploading'
                        ? 'border-[#5DCAA5]/40 bg-[#E1F5EE]/60 text-[#0F6E56]'
                        : af.status === 'success'
                        ? 'border-[#5DCAA5]/40 bg-[#E1F5EE] text-[#0F6E56]'
                        : 'border-red-200 bg-red-50 text-red-600'
                    }`}
                  >
                    {af.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />}
                    {af.status === 'success'   && <CheckCircle className="h-3 w-3 flex-shrink-0" />}
                    {af.status === 'error'     && <AlertCircle className="h-3 w-3 flex-shrink-0" />}
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <span className="max-w-[160px] truncate">{af.file.name}</span>
                    {af.status === 'uploading' && (
                      <span className="text-[#1D9E75]/70">Uploading…</span>
                    )}
                    {af.status === 'error' && (
                      <span className="text-red-500">{af.errorMsg}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(af.id)}
                      className="ml-0.5 rounded p-0.5 hover:bg-black/[0.08] transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Textarea + action buttons ── */}
            <div className="flex items-end gap-2 p-1.5 pl-3 sm:pl-3.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={e => { setInputMessage(e.target.value); requestAnimationFrame(adjustTextareaHeight); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!hasUploading) void handleSendMessage();
                  }
                }}
                placeholder="Message ConstructionAI..."
                className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-snug text-[#111] placeholder:text-[#999] focus:outline-none"
              />
              <div className="flex shrink-0 items-center gap-1 pb-1 pr-0.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-2 text-[#999] transition-colors hover:bg-black/[0.05] hover:text-[#555]"
                  title="Attach document"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading || hasUploading || isLimitReached}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1D9E75] text-white shadow-sm transition-colors hover:bg-[#0F6E56] disabled:cursor-not-allowed disabled:opacity-40"
                  title={hasUploading ? 'Wait for upload to finish' : isLimitReached ? 'Message limit reached' : undefined}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-[#999]">
            {isLimitReached
              ? <span className="text-amber-500 font-medium">Free trial limit reached. Subscribe to continue chatting.</span>
              : 'ConstructionAI can make mistakes. Verify important information.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
