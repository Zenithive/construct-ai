import { useState, useRef, useEffect } from 'react';
import { Send, Search, ArrowDown, Upload as Paperclip } from 'lucide-react';
import { chatApi } from '../api/apiClient';
import UploadComponent from './Upload';
import { renderContent } from '../utils/parseMessage';
import type { Message, Source } from './ChatWithSidebar';

// ─── Props ────────────────────────────────────────────────────────────────────

type ChatComponentProps = {
  selectedRegion: string;
  selectedCategory: string;
  regions: { value: string; label: string; flag?: string }[];
  categories: { value: string; label: string }[];
  sessionId: string;
  // lifted state from ChatWithSidebar
  messages: Message[];
  isLoading: boolean;
  streamingSources: { db_sources: any[]; web_sources: any[] };
  onSetMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  onRunStream: (query: string, region: string, category: string) => void;
  onMessageSent: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ChatComponent = ({
  selectedRegion, selectedCategory, regions, categories,
  sessionId, messages, isLoading, streamingSources,
  onSetMessages, onRunStream, onMessageSent, onToggleSidebar, isSidebarOpen,
}: ChatComponentProps) => {

  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [region, setRegion] = useState(selectedRegion);
  const [category, setCategory] = useState(selectedCategory);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  // Track whether we've already loaded history for this session
  const historyLoadedRef = useRef(false);

  const sampleQuestions = [
    "What are the fire safety requirements for high-rise buildings?",
    "What's the minimum wage for construction workers in this region?",
    "Are there specific requirements for crane operations?",
    "What are the environmental clearance requirements for new construction?",
  ];

  // ── Markdown / citation helpers ──────────────────────────────────────────

  const parsePDFCitations = (text: string) => {
    const markdownLinkPattern = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi;
    return text.replace(markdownLinkPattern, (_match, linkText, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium break-words inline-block max-w-full">${linkText}</a>`
    );
  };

  const renderCitationContent = (citation: string) => (
    <span dangerouslySetInnerHTML={{ __html: parsePDFCitations(citation) }} />
  );

  const renderMessageContent = (content: string, sources?: Source[]) => (
    <div
      className="text-base max-w-none leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: renderContent(content, sources || []) }}
    />
  );

  // ── Scroll helpers ───────────────────────────────────────────────────────

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const isUserAtBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const handleScroll = () => setIsAutoScroll(isUserAtBottom());

  // ── Load history (only when messages are empty for this session) ─────────

  useEffect(() => {
    // If the parent already has messages for this session (e.g. mid-stream),
    // don't overwrite them with a history fetch.
    if (messages.length > 0 || historyLoadedRef.current) return;

    const loadChatHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const data = await chatApi.getMessages(sessionId);
        if (!data?.messages) return;

        const loaded: Message[] = data.messages.map((msg: any) => ({
          type: msg.message_type as 'user' | 'ai',
          content: msg.content,
          citations: msg.citations || undefined,
          confidence: msg.confidence || undefined,
          sources: msg.sources || undefined,
          timestamp: new Date(msg.created_at),
        }));

        onSetMessages(loaded);
      } catch (err: any) {
        console.error('Failed to load chat history:', err?.message || err);
      } finally {
        setIsLoadingHistory(false);
        historyLoadedRef.current = true;
      }
    };

    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Auto-scroll when messages update ────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0 && isAutoScroll) scrollToBottom();
  }, [messages, isAutoScroll]);

  // ── Sync region/category from parent ────────────────────────────────────

  useEffect(() => {
    setRegion(selectedRegion);
    setCategory(selectedCategory);
  }, [selectedRegion, selectedCategory]);

  // ── Send message ─────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessingRef.current || isLoading) return;
    isProcessingRef.current = true;

    const query = inputMessage.trim();
    setInputMessage('');
    setIsAutoScroll(true);

    // Add user message to lifted state
    const userMessage: Message = { type: 'user', content: query, timestamp: new Date() };
    onSetMessages(prev => [...prev, userMessage]);

    // Save user message
    try {
      await chatApi.saveMessage(sessionId, 'user', query, { region, category });
      onMessageSent();
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

    // Kick off the stream (runs in parent, survives session switches)
    onRunStream(query, region, category);

    isProcessingRef.current = false;
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const showHistory = isLoadingHistory && messages.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Messages Area */}
      <div
        id="chat-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="p-4 sm:p-6 space-y-6 bg-white relative"
        style={{ flex: '1 1 0', overflowY: 'scroll', overflowX: 'hidden', maxHeight: '100%', minHeight: 0 }}
      >
        {showHistory ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 sm:py-20 max-w-xl mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl mb-5">
              <Search className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">How can I help you today?</h3>
            <p className="text-base text-gray-500 mb-8">
              Ask about construction regulations, safety standards, or compliance requirements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {sampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="p-4 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-base text-gray-600 text-left transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={index}>
                {/* User Message */}
                {message.type === 'user' && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] sm:max-w-2xl px-4 py-3 rounded-2xl bg-gray-100 text-gray-900">
                      <div className="whitespace-pre-wrap text-base">{message.content}</div>
                    </div>
                  </div>
                )}

                {/* Web source cards — streaming or from history */}
                {message.type === 'ai' && (() => {
                  const isLastAndStreaming = index === messages.length - 1 && isLoading && streamingSources.web_sources.length > 0;
                  const webSources = isLastAndStreaming
                    ? streamingSources.web_sources
                    : (message.sources || []).filter((s: any) => s.url);

                  if (webSources.length === 0) return null;

                  return (
                    <div className="flex justify-start mb-2">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-w-2xl">
                        {isLastAndStreaming && (
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
                            <span>Searching {webSources.length} sources…</span>
                          </div>
                        )}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {webSources.map((source: any, idx: number) => {
                            let domain = '';
                            try { domain = source.url ? new URL(source.url).hostname.replace('www.', '') : ''; } catch {}
                            return (
                              <a
                                key={`web-${idx}`}
                                href={source.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 w-36 p-2 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-white transition-all bg-white"
                              >
                                <p className="text-xs font-medium text-gray-700 line-clamp-2 leading-tight">{source.title || 'Web Page'}</p>
                                <p className="text-xs text-gray-400 mt-1 truncate">{domain}</p>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* AI Message */}
                {message.type === 'ai' && message.content && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] sm:max-w-2xl">
                      {renderMessageContent(message.content, message.sources)}
                      {message.citations && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">📚 Sources</p>
                          {message.citations.map((citation, i) => (
                            <div key={i} className="text-xs mb-1.5 pl-3 border-l-2 border-blue-200 text-gray-500">
                              {renderCitationContent(citation)}
                            </div>
                          ))}
                          {message.confidence && (
                            <div className="mt-2 flex items-center space-x-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1">
                                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${message.confidence}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{message.confidence}% confidence</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing / searching indicator */}
            {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].type === 'ai' &&
              streamingSources.db_sources.length === 0 &&
              streamingSources.web_sources.length === 0 && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2 px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button */}
        {!isAutoScroll && messages.length > 0 && (
          <button
            onClick={() => { setIsAutoScroll(true); scrollToBottom(); }}
            className="fixed bottom-24 right-6 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 p-2.5 rounded-full shadow-md transition-all z-10"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white px-4 pb-4 pt-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end space-x-2 bg-white border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus-within:border-gray-400 transition-colors">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Message ConstructAI..."
              className="mb-1 flex-1 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
            />
            <div className="flex items-center space-x-1 flex-shrink-0 gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-lg transition-colors"
                title="Upload documents"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-4"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            ConstructAI can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <UploadComponent />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
