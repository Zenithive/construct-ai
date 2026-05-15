'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Search, ArrowDown, Upload as Paperclip } from 'lucide-react';
import { chatApi } from '@/services/apiClient';
import UploadComponent from './Upload';
import { renderContent } from '@/utils/parseMessage';
import type { Message, Source } from './ChatWithSidebar';

type ChatComponentProps = {
  selectedRegion: string; selectedCategory: string;
  regions: { value: string; label: string; flag?: string }[];
  categories: { value: string; label: string }[];
  sessionId: string; messages: Message[]; isLoading: boolean;
  streamingSources: { db_sources: any[]; web_sources: any[] };
  onSetMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  onRunStream: (query: string, region: string, category: string) => void;
  onMessageSent: () => void; onToggleSidebar: () => void; isSidebarOpen: boolean;
};

const BUBBLE_MAX = 'max-w-[85%] sm:max-w-2xl';

const ChatComponent = ({ selectedRegion, selectedCategory, regions, categories, sessionId, messages, isLoading, streamingSources, onSetMessages, onRunStream, onMessageSent, onToggleSidebar, isSidebarOpen }: ChatComponentProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [region, setRegion] = useState(selectedRegion);
  const [category, setCategory] = useState(selectedCategory);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isProcessingRef = useRef(false);
  const historyLoadedRef = useRef(false);

  const sampleQuestions = [
    'What are the fire safety requirements for high-rise buildings?',
    "What's the minimum wage for construction workers in this region?",
    'Are there specific requirements for crane operations?',
    'What are the environmental clearance requirements for new construction?',
  ];

  const parsePDFCitations = (text: string) => {
    const markdownLinkPattern = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi;
    return text.replace(markdownLinkPattern, (_match, linkText, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium break-words inline-block max-w-full transition-colors">${linkText}</a>`
    );
  };

  const renderCitationContent = (citation: string) => <span dangerouslySetInnerHTML={{ __html: parsePDFCitations(citation) }} />;

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

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 200;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage, adjustTextareaHeight]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const isUserAtBottom = () => { if (!scrollContainerRef.current) return true; const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current; return scrollHeight - scrollTop - clientHeight < 100; };
  const handleScroll = () => setIsAutoScroll(isUserAtBottom());

  useEffect(() => {
    if (messages.length > 0 || historyLoadedRef.current) return;
    (async () => {
      try {
        setIsLoadingHistory(true);
        const data = await chatApi.getMessages(sessionId) as any;
        if (!data?.messages) return;
        const loaded: Message[] = data.messages.map((msg: any) => ({ type: msg.message_type as 'user' | 'ai', content: msg.content, citations: msg.citations || undefined, confidence: msg.confidence || undefined, sources: msg.sources || undefined, timestamp: new Date(msg.created_at) }));
        onSetMessages(loaded);
      } catch (err: any) { console.error('Failed to load chat history:', err?.message || err); }
      finally { setIsLoadingHistory(false); historyLoadedRef.current = true; }
    })();
  }, [sessionId]);

  useEffect(() => { if (messages.length > 0 && isAutoScroll) scrollToBottom(); }, [messages, isAutoScroll]);
  useEffect(() => { setRegion(selectedRegion); setCategory(selectedCategory); }, [selectedRegion, selectedCategory]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessingRef.current || isLoading) return;
    isProcessingRef.current = true;
    const query = inputMessage.trim();
    setInputMessage(''); setIsAutoScroll(true);
    const userMessage: Message = { type: 'user', content: query, timestamp: new Date() };
    onSetMessages(prev => [...prev, userMessage]);
    try { await chatApi.saveMessage(sessionId, 'user', query, { region, category }); onMessageSent(); } catch (e) { console.error('Failed to save user message:', e); }
    onRunStream(query, region, category);
    isProcessingRef.current = false;
  };

  const showHistory = isLoadingHistory && messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white">
      <div
        id="chat-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50/50"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-5 sm:py-5">
          {showHistory ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
              <p className="mt-3 text-sm text-gray-500">Loading chat history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-lg py-10 text-center sm:py-14">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 sm:text-2xl">How can I help you today?</h3>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">Ask about construction regulations, safety standards, or compliance requirements</p>
              <div className="mt-6 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
                {sampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setInputMessage(question)}
                    className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left text-sm leading-snug text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-5">
              {messages.map((message, index) => (
                <div key={index}>
                  {message.type === 'user' && (
                    <div className="flex justify-end">
                      <div
                        className={`${BUBBLE_MAX} rounded-2xl rounded-br-md border border-blue-200/70 bg-blue-50 px-4 py-3 text-[15px] leading-relaxed text-gray-900 shadow-sm transition-shadow duration-150 hover:shadow`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  )}
                  {message.type === 'ai' && (() => {
                    const isLastAndStreaming = index === messages.length - 1 && isLoading && streamingSources.web_sources.length > 0;
                    const webSources = isLastAndStreaming ? streamingSources.web_sources : (message.sources || []).filter((s: any) => s.url);
                    if (webSources.length === 0) return null;
                    return (
                      <div className="mb-2 flex justify-start">
                        <div className={BUBBLE_MAX}>
                          {isLastAndStreaming && (
                            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                              <span>Searching {webSources.length} sources…</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {webSources.map((source: any, idx: number) => {
                              let domain = '';
                              try { domain = source.url ? new URL(source.url).hostname.replace('www.', '') : ''; } catch { /* ignore */ }
                              return (
                                <a
                                  key={`web-${idx}`}
                                  href={source.url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex max-w-[11rem] flex-col gap-0.5 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/60"
                                >
                                  <span className="line-clamp-2 text-xs font-medium leading-tight text-gray-700">{source.title || 'Web Page'}</span>
                                  <span className="truncate text-[10px] text-gray-400">{domain}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {message.type === 'ai' && message.content && (
                    <div className="flex justify-start">
                      <div
                        className={`${BUBBLE_MAX} rounded-2xl rounded-bl-md border border-gray-200/90 bg-white px-4 py-3 shadow-sm`}
                      >
                        {renderMessageContent(message.content, message.sources)}
                        {message.citations && (
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            <p className="mb-2 text-xs font-medium text-gray-500">Sources</p>
                            {message.citations.map((citation, i) => (
                              <div key={i} className="mb-1.5 border-l-2 border-blue-200 pl-3 text-xs text-gray-500">
                                {renderCitationContent(citation)}
                              </div>
                            ))}
                            {message.confidence && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="h-1 flex-1 rounded-full bg-gray-100">
                                  <div className="h-1 rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${message.confidence}%` }} />
                                </div>
                                <span className="shrink-0 text-xs text-gray-400">{message.confidence}% confidence</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages.length > 0 && messages[messages.length - 1].type === 'ai' && streamingSources.db_sources.length === 0 && streamingSources.web_sources.length === 0 && (
                <div className="flex justify-start">
                  <div className={`${BUBBLE_MAX} flex items-center gap-2 rounded-2xl rounded-bl-md border border-gray-200/90 bg-white px-4 py-3 shadow-sm`}>
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

      <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-gray-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm sm:px-4 sm:pb-4 sm:pt-3">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 pl-3 shadow-sm transition-[border-color,box-shadow] focus-within:border-gray-300 focus-within:shadow-md sm:pl-3.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={e => { setInputMessage(e.target.value); requestAnimationFrame(adjustTextareaHeight); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Message ConstructAI..."
              className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-snug text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <div className="flex shrink-0 items-center gap-1 pb-1 pr-0.5">
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                title="Upload documents"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">ConstructAI can make mistakes. Verify important information.</p>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button type="button" onClick={() => setShowUploadModal(false)} className="absolute right-4 top-4 z-10 text-gray-500 transition-colors hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <UploadComponent />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
