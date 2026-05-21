'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Search, ArrowDown, Upload as Paperclip } from 'lucide-react';
import { chatApi } from '@/services/apiClient';
import { renderContent } from '@/utils/parseMessage';
import { normalizeFeedbackType } from '@/lib/feedback';
import { CHAT_ATTACHMENT_ACCEPT } from '@/lib/attachments';
import { useChatAttachments } from '@/hooks/useChatAttachments';
import type { Message, Source } from './ChatWithSidebar';
import { MessageActions, CopyIconButton } from './chat/MessageActions';
import { ReferencesSection } from './chat/ReferencesSection';
import { AttachmentPreview } from './chat/AttachmentPreview';

type ChatComponentProps = {
  selectedCountry: string;
  selectedCategory: string;
  regions: { value: string; label: string; flag?: string }[];
  categories: { value: string; label: string }[];
  sessionId: string; messages: Message[]; isLoading: boolean;
  streamingSources: { db_sources: any[]; web_sources: any[] };
  onSetMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  onRunStream: (query: string, category: string) => void;
  onMessageSent: () => void; onToggleSidebar: () => void; isSidebarOpen: boolean;
};

const BUBBLE_MAX = 'max-w-[85%] sm:max-w-2xl';

const ChatComponent = ({ selectedCountry, selectedCategory, regions, categories, sessionId, messages, isLoading, streamingSources, onSetMessages, onRunStream, onMessageSent, onToggleSidebar, isSidebarOpen }: ChatComponentProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [category, setCategory] = useState(selectedCategory);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const {
    attachments,
    error: attachmentError,
    isUploading,
    hasReadyAttachments,
    addFiles,
    removeAttachment,
    clearAttachments,
  } = useChatAttachments();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const historyLoadedRef = useRef(false);

  const canSend =
    (inputMessage.trim().length > 0 || hasReadyAttachments) && !isLoading && !isUploading;

  const sampleQuestions = [
    'What are the fire safety requirements for high-rise buildings?',
    "What's the minimum wage for construction workers in this region?",
    'Are there specific requirements for crane operations?',
    'What are the environmental clearance requirements for new construction?',
  ];

  const parsePDFCitations = (text: string) => {
    const markdownLinkPattern = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi;
    return text.replace(markdownLinkPattern, (_match, linkText, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#1D9E75] hover:text-[#0F6E56] underline font-medium break-words inline-block max-w-full transition-colors">${linkText}</a>`
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
      } catch (err: any) { console.error('Failed to load chat history:', err?.message || err); }
      finally { setIsLoadingHistory(false); historyLoadedRef.current = true; }
    })();
  }, [sessionId]);

  useEffect(() => { if (messages.length > 0 && isAutoScroll) scrollToBottom(); }, [messages, isAutoScroll]);
  useEffect(() => { setCategory(selectedCategory); }, [selectedCategory]);

  const handleSendMessage = async () => {
    if (!canSend || isProcessingRef.current) return;
    isProcessingRef.current = true;
    const query = inputMessage.trim();
    const attachmentNote =
      attachments.length > 0
        ? `\n\n[Attached: ${attachments.filter(a => a.status === 'success').map(a => a.name).join(', ')}]`
        : '';
    const fullQuery = query || 'Please analyze the attached document(s).';
    const displayContent = query ? query + attachmentNote : fullQuery;
    setInputMessage('');
    clearAttachments();
    setIsAutoScroll(true);
    requestAnimationFrame(adjustTextareaHeight);
    const userMessage: Message = { type: 'user', content: displayContent.trim(), timestamp: new Date() };
    onSetMessages(prev => [...prev, userMessage]);
    try {
      await chatApi.saveMessage(sessionId, 'user', displayContent.trim(), { region: selectedCountry, category });
      onMessageSent();
    } catch (e) {
      console.error('Failed to save user message:', e);
    }
    onRunStream(fullQuery, category);
    isProcessingRef.current = false;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    void addFiles(files);
    e.target.value = '';
  };

  const showHistory = isLoadingHistory && messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#fafaf8]">
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
              <p className="mt-2 text-sm text-gray-500 sm:text-base">Ask about construction regulations, safety standards, or compliance requirements</p>
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
              {messages.map((message, index) => {
                const isThisStreaming = index === messages.length - 1 && isLoading;

                return (
                  <div key={index}>
                    {/* ── User message ─────────────────────────────────── */}
                    {message.type === 'user' && (
                      <div className="group flex flex-col items-end">
                        <div
                          className={`${BUBBLE_MAX} rounded-2xl rounded-br-md border border-[#5DCAA5]/30 bg-[#E1F5EE] px-4 py-3 text-[15px] leading-relaxed text-[#111] shadow-sm transition-shadow duration-150 hover:shadow`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                        {/* Copy icon — visible on hover */}
                        <div className="mt-1 flex items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <CopyIconButton text={message.content} />
                        </div>
                      </div>
                    )}

                    {/* ── References section (above AI bubble) ─────────── */}
                    {message.type === 'ai' && (() => {
                      const isLastAndStreaming = isThisStreaming && streamingSources.web_sources.length > 0;
                      const webSources = isLastAndStreaming
                        ? streamingSources.web_sources
                        : (message.sources || []).filter((s: any) => s.url);
                      if (webSources.length === 0) return null;
                      return (
                        <div className="mb-3 flex justify-start">
                          <div className={BUBBLE_MAX}>
                            <ReferencesSection
                              sources={webSources}
                              isStreaming={isLastAndStreaming}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── AI response bubble ────────────────────────────── */}
                    {message.type === 'ai' && message.content && (
                      <div className="flex justify-start">
                        <div
                          className={`${BUBBLE_MAX} rounded-2xl rounded-bl-md border border-black/[0.09] bg-white px-4 py-3 shadow-sm`}
                        >
                          {renderMessageContent(message.content, message.sources)}

                          {/* Inline DB citations */}
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

                          {/* Action bar — hidden while streaming */}
                          {!isThisStreaming && (
                            <MessageActions
                              content={message.content}
                              messageId={message.id}
                              sessionId={sessionId}
                              initialFeedbackType={message.feedback_type ?? null}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && messages.length > 0 && messages[messages.length - 1].type === 'ai' && streamingSources.db_sources.length === 0 && streamingSources.web_sources.length === 0 && (
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

      <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-black/[0.09] bg-[#fafaf8]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm sm:px-4 sm:pb-4 sm:pt-3">
        <div className="mx-auto w-full max-w-3xl">
          {attachmentError && (
            <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700">
              {attachmentError}
            </p>
          )}
          <div className="rounded-xl border border-black/[0.09] bg-white shadow-sm transition-[border-color,box-shadow] focus-within:border-black/[0.14] focus-within:shadow-md">
            <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />
            <div className="flex items-end gap-2 p-1.5 pl-3 sm:pl-3.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={CHAT_ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={handleFileInputChange}
                aria-hidden
              />
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={e => {
                  setInputMessage(e.target.value);
                  requestAnimationFrame(adjustTextareaHeight);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Message ConstructionAI..."
                className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-snug text-[#111] placeholder:text-[#999] focus:outline-none"
              />
              <div className="flex shrink-0 items-center gap-1 pb-1 pr-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="rounded-lg p-2 text-[#999] transition-colors hover:bg-black/[0.05] hover:text-[#555] disabled:cursor-not-allowed disabled:opacity-40"
                  title="Attach documents"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!canSend}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1D9E75] text-white shadow-sm transition-colors hover:bg-[#0F6E56] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-[#999]">
            ConstructionAI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
