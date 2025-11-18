import { useState, useRef, useEffect } from 'react';
import { Send, Search, ArrowDown, Menu } from 'lucide-react';
import supabase from '../supaBase/supabaseClient';

// Types
type Message = {
  type: 'user' | 'ai';
  content: string;
  citations?: string[];
  confidence?: number;
  timestamp: Date;
};

const ChatComponent = ({ selectedRegion, selectedCategory, regions, categories, sessionId, onMessageSent, onToggleSidebar, isSidebarOpen }) => {

  const [messages, setMessages] = useState([] as Message[]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);
  const [region, setRegion] = useState(selectedRegion);
  const [category, setCategory] = useState(selectedCategory);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamingSources, setStreamingSources] = useState<{db_sources: any[], web_sources: any[]}>({db_sources: [], web_sources: []});

  const sampleQuestions = [
    "What are the fire safety requirements for high-rise buildings?",
    "What's the minimum wage for construction workers in this region?",
    "Are there specific requirements for crane operations?",
    "What are the environmental clearance requirements for new construction?"
  ];

  // Utility function to parse all markdown links (PDFs, websites, etc.)
  const parsePDFCitations = (text: string) => {

    // Pattern to match any markdown link: [Link Text](URL)
    // This works for PDFs, websites, and all other links
    const markdownLinkPattern = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi;

    const result = text.replace(markdownLinkPattern, (match, linkText, url) => {

      // Open URL directly without PDF.js viewer wrapper
      // Works for PDFs, websites, and all link types
      // Added break-words and max-width for proper wrapping
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium break-words inline-block max-w-full">${linkText}</a>`;
    });

    return result;
  };

  // Function to parse markdown formatting (headers, bold, lists, etc.)
  const parseMarkdown = (text: string) => {
    let result = text;

    // Headers with better styling - handle trailing # symbols properly
    result = result.replace(/^#### (.+?)(#+)?$/gm, '<h4 class="text-lg font-bold text-gray-800 mt-5 mb-2 border-b border-gray-100 pb-1.5">$1</h4>');
    result = result.replace(/^### (.+?)(#+)?$/gm, '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-2">$1</h3>');
    result = result.replace(/^## (.+?)(#+)?$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b-2 border-blue-200 pb-2">$1</h2>');
    result = result.replace(/^# (.+?)(#+)?$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-6 border-b-2 border-blue-500 pb-3">$1</h1>');

    // Bold text with better contrast
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');

    // Italic text
    result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');

    // Code blocks (triple backticks) - Added better wrapping and scrolling
    result = result.replace(/```(\w+)?\n([\s\S]*?)\n```/g, '<div class="my-4 overflow-x-auto rounded-lg border border-gray-300"><pre class="bg-gray-100 p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap break-all"><code>$2</code></pre></div>');

    // Inline code - Added word break support
    result = result.replace(/`([^`]+)`/g, '<code class="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-sm font-mono break-words">$1</code>');

    // Bullet points with better styling and word wrapping
    result = result.replace(/^- (.+)$/gm, '<li class="flex items-start space-x-2 py-1.5"><span class="text-blue-500 font-bold mt-1 flex-shrink-0">•</span><span class="flex-1 break-words">$1</span></li>');

    // Numbered lists with better word wrapping
    result = result.replace(/^\d+\. (.+)$/gm, '<li class="flex items-start space-x-2 py-1.5"><span class="text-blue-500 font-bold mt-1 min-w-[1.5rem] flex-shrink-0">$&</span></li>');

    // Wrap consecutive list items in ul tags with better styling
    result = result.replace(/(<li[^>]*>.*<\/li>\s*)+/gs, (match) => {
      return `<ul class="space-y-1 my-4 pl-2 border-l-4 border-blue-200 break-words">${match}</ul>`;
    });

    // Horizontal rules with better styling
    result = result.replace(/^---$/gm, '<hr class="border-gray-300 my-6 border-t-2">');

    // Blockquotes with better word wrapping
    result = result.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 italic text-gray-700 break-words bg-blue-50 rounded-r-lg">$1</blockquote>');

    // Enhanced table parsing with proper header support
    // Match markdown tables with header, separator, and body rows
    const tablePattern = /(\|.+\|\n)(\|[\s:-]+\|[\s:-]*\n)((?:\|.+\|\n?)+)/gm;

    result = result.replace(tablePattern, (match, headerRow, separatorRow, bodyRows) => {
      // Parse header row
      const headerCells = headerRow.trim().split('|').filter(cell => cell.trim()).map(cell => cell.trim());
      const headerHtml = `<thead class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <tr>${headerCells.map(cell => `<th class="border border-blue-500 px-4 py-3 text-left font-semibold text-sm uppercase tracking-wider">${cell}</th>`).join('')}</tr>
      </thead>`;

      // Parse body rows - FILTER OUT separator rows (rows with only dashes, colons, spaces, and pipes)
      const bodyRowsArray = bodyRows.trim().split('\n').filter(row => {
        const trimmedRow = row.trim();
        // Skip empty rows or rows that are just separators (only contain |, -, :, spaces)
        return trimmedRow && !/^\|[\s:-]+\|[\s:-]*$/.test(trimmedRow);
      });

      const bodyHtml = `<tbody class="bg-white divide-y divide-gray-200">
        ${bodyRowsArray.map((row, index) => {
          const cells = row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
          const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
          return `<tr class="${bgClass} hover:bg-blue-50 transition-colors">
            ${cells.map(cell => `<td class="border border-gray-200 px-4 py-3 text-sm text-gray-800 break-words">${cell}</td>`).join('')}
          </tr>`;
        }).join('')}
      </tbody>`;

      return `<div class="my-6 overflow-x-auto rounded-lg shadow-md border border-gray-200">
        <table class="min-w-full border-collapse">${headerHtml}${bodyHtml}</table>
      </div>`;
    });

    // Fallback: Handle simple tables without proper markdown separator
    result = result.replace(/(\|.+\|\n){2,}/g, (match) => {
      const rows = match.trim().split('\n').filter(row => {
        const trimmedRow = row.trim();
        // Skip empty rows or rows that are just separators (only contain |, -, :, spaces)
        return trimmedRow && !/^\|[\s:-]+\|[\s:-]*$/.test(trimmedRow);
      });

      if (rows.length === 0) return match;

      // First row as header
      const headerCells = rows[0].split('|').filter(cell => cell.trim()).map(cell => cell.trim());
      const headerHtml = `<thead class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <tr>${headerCells.map(cell => `<th class="border border-blue-500 px-4 py-3 text-left font-semibold text-sm uppercase tracking-wider">${cell}</th>`).join('')}</tr>
      </thead>`;

      // Remaining rows as body (skip separator rows)
      const bodyHtml = rows.slice(1).map((row, index) => {
        const cells = row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        return `<tr class="${bgClass} hover:bg-blue-50 transition-colors">
          ${cells.map(cell => `<td class="border border-gray-200 px-4 py-3 text-sm text-gray-800 break-words">${cell}</td>`).join('')}
        </tr>`;
      }).join('');

      return `<div class="my-6 overflow-x-auto rounded-lg shadow-md border border-gray-200">
        <table class="min-w-full border-collapse">
          ${headerHtml}
          <tbody class="bg-white divide-y divide-gray-200">${bodyHtml}</tbody>
        </table>
      </div>`;
    });

    // Line breaks (double space + newline becomes <br>)
    result = result.replace(/ {2}\n/g, '<br>');

    // Paragraphs (wrap text blocks)
    result = result.replace(/\n\n+/g, '</p><p class="mb-4">');
    result = `<p class="mb-4">${result}</p>`;

    // Clean up empty paragraphs
    result = result.replace(/<p class="mb-4"><\/p>/g, '');
    result = result.replace(/<p class="mb-4">(<h[1-6]|<hr|<ul|<blockquote|<table)/g, '$1');
    result = result.replace(/(<\/h[1-6]>|<\/hr>|<\/ul>|<\/blockquote>|<\/table>)<\/p>/g, '$1');

    return result;
  };

  // Function to render citation content with HTML
  const renderCitationContent = (citation: string) => {
    const parsedContent = parsePDFCitations(citation);
    return <span dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  // Function to render message content with parsed PDF links and markdown
  const renderMessageContent = (content: string) => {
    // First parse PDF citations, then markdown formatting
    let parsedContent = parsePDFCitations(content);
    parsedContent = parseMarkdown(parsedContent);

    return <div className="text-sm sm:text-base max-w-none leading-relaxed break-words overflow-wrap-anywhere" dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  // Function to save a message to Supabase
  const saveMessageToSupabase = async (message: Message) => {
    if (!userId) {
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          session_id: sessionId,
          message_type: message.type,
          content: message.content,
          citations: message.citations || null,
          confidence: message.confidence || null,
          region: region,
          category: category
        });

      if (error) {
      } else {
        // Notify parent that message was sent (to refresh sidebar)
        if (onMessageSent) {
          onMessageSent();
        }
      }
    } catch (err) {
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    const messagesArea = document.querySelector('.messages-area-chat');
    if (messagesArea) {
      messagesArea.scrollTop = 0;
    }
  };

  // Check if user is at the bottom of the scroll container
  const isUserAtBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Consider "at bottom" if within 100px of the bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  // Handle scroll event to detect if user scrolls up
  const handleScroll = () => {
    const atBottom = isUserAtBottom();
    setIsAutoScroll(atBottom);
  };

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setIsLoadingHistory(true);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          setIsLoadingHistory(false);
          return;
        }

        setUserId(user.id);

        // Fetch chat history from Supabase for this session
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) {
          setMessages([]);
          setIsLoadingHistory(false);
          return;
        }

        // Transform Supabase data to Message format
        const loadedMessages: Message[] = (data || []).map((msg) => ({
          type: msg.message_type as 'user' | 'ai',
          content: msg.content,
          citations: msg.citations || undefined,
          confidence: msg.confidence || undefined,
          timestamp: new Date(msg.created_at)
        }));

        setMessages(loadedMessages);

      } catch (err) {
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
        scrollToTop();
      }
    };

    loadChatHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only scroll to bottom when there are messages AND user hasn't scrolled up
    if (messages.length > 0 && isAutoScroll) {
      scrollToBottom();
    }
  }, [messages, isAutoScroll]);

  useEffect(() => {
    setRegion(selectedRegion);
    setCategory(selectedCategory);
  }, [selectedRegion, selectedCategory]);

  // Cleanup effect: abort any ongoing requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const generateMockResponse = (question: string): Message => {
    const responses = {
      "fire": {
        content: `Based on the National Building Code of ${regions.find(r => r.value === region)?.label} (NBC) 2016, fire safety requirements for high-rise buildings include:\n\n• Fire exits: Minimum 2 fire exits per floor for buildings above 15m\n• Fire detection: Automatic fire detection system mandatory\n• Sprinkler systems: Required for buildings above 30m height\n• Fire lift: Dedicated fire lift for buildings above 60m\n\nKey Regulation: NBC 2016, Part 4, Section 1`,
        citations: ["NBC 2016, Part 4, Section 1.2.3", "Fire Prevention and Fire Safety Code 2019"],
        confidence: 95
      },
      "wage": {
        content: "According to the Minimum Wages Act 1948 and recent state notifications:\n\n• Skilled workers: ₹450-550 per day (varies by state)\n• Semi-skilled workers: ₹400-450 per day\n• Unskilled workers: ₹350-400 per day\n• Overtime: 2x regular rate after 8 hours\n\nNote: Rates updated quarterly. Current rates effective from Oct 2024.",
        citations: ["Minimum Wages Act 1948", "State Notification 2024-Q3"],
        confidence: 90
      },
      "crane": {
        content: "Crane operations in India are governed by:\n\n• Operator certification: Valid crane operator license required\n• Load limits: Must not exceed 80% of rated capacity\n• Inspection frequency: Monthly inspection by certified engineer\n• Safety zones: 3m minimum clearance from power lines\n\nKey Standards: IS 4137:1989 for mobile cranes",
        citations: ["IS 4137:1989", "Factories Act 1948, Section 35"],
        confidence: 92
      },
      "default": {
        content: "I understand you're asking about construction regulations. Based on the current database for " + regions.find(r => r.value === region)?.label + ", here are the key points:\n\n• Regulations vary by project type and location\n• Most construction projects require multiple approvals\n• Safety standards are mandatory for all projects\n• Environmental clearances may be required\n\nRecommendation: Please provide more specific details about your project type and location for a more targeted answer.",
        citations: ["General Construction Guidelines"],
        confidence: 75
      }
    };
    // fetching using axios
    // const handleSendMessage = async () => {
    //   if (!inputMessage.trim()) return;

    //   const userMessage: Message = { type: 'user', content: inputMessage, timestamp: new Date() };
    //   setMessages(prev => [...prev, userMessage]);
    //   setInputMessage('');
    //   setIsLoading(true);

    //   try {
    //     // Axios POST request to the API
    //     const response = await axios.post("/api/v1/documents/upload", {
    //       query: inputMessage,
    //       region,   // optional
    //       category  // optional
    //     });

    //     const aiMessage: Message = {
    //       type: 'ai',
    //       content: response.data?.answer || 'No response from API',
    //       citations: response.data?.citations || [],
    //       confidence: response.data?.confidence || 80,
    //       timestamp: new Date()
    //     };

    //     setMessages(prev => [...prev, aiMessage]);

    //   } catch (err) {
    //     console.error('API Error:', err);
    //     setMessages(prev => [
    //       ...prev,
    //       { type: 'ai', content: 'Failed to fetch response from API.', timestamp: new Date() }
    //     ]);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };

    //-----------------


    const key = question.toLowerCase().includes('fire') ? 'fire' :
      question.toLowerCase().includes('wage') || question.toLowerCase().includes('labor') ? 'wage' :
        question.toLowerCase().includes('crane') ? 'crane' : 'default';

    return {
      type: 'ai' as const,
      content: responses[key].content,
      citations: responses[key].citations,
      confidence: responses[key].confidence,
      timestamp: new Date()
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessingRef.current) return;

    isProcessingRef.current = true;

    const userMessage: Message = { type: 'user', content: inputMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);

    // Re-enable auto-scroll when user sends a message
    setIsAutoScroll(true);

    // Save user message to Supabase
    await saveMessageToSupabase(userMessage);

    const query = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setStreamingSources({db_sources: [], web_sources: []}); // Reset sources

    try {
      // Create initial AI message that will be updated with streaming content
      const aiMessage: Message = {
        type: 'ai',
        content: '',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Create AbortController (for cleanup on unmount, no timeout)
      abortControllerRef.current = new AbortController();

      // Get the country value (use the internal value, not label)
      const requestBody = {
        query: query,
        top_k: 10,
        include_sources: true
      };

      const response = await fetch('https://api.constructionai.chat/api/v1/query/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let previousContent = '';
      let finalAIMessage: Message | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE format
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const jsonData = JSON.parse(line.substring(6));

              // Handle metadata (sources)
              if (jsonData.type === 'metadata' && jsonData.data) {
                setStreamingSources({
                  db_sources: jsonData.data.db_sources || [],
                  web_sources: jsonData.data.web_sources || []
                });
              }

              // Handle content
              if (jsonData.type === 'content' && jsonData.data) {
                const fullContent = jsonData.data.full_content || '';

                // Only append new content that wasn't in previous chunk
                if (fullContent !== previousContent) {
                  const currentContent = fullContent;
                  previousContent = fullContent;

                  // Update the AI message with new content
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.type === 'ai') {
                      // Create a new object instead of mutating
                      const updatedMessage = {
                        ...lastMessage,
                        content: currentContent
                      };
                      newMessages[newMessages.length - 1] = updatedMessage;
                      finalAIMessage = updatedMessage; // Track the final message
                    }
                    return newMessages;
                  });

                  // Print only new words being streamed
                }
              }
            } catch (e) {
            }
          }
        }
      }

      // Save the complete AI message to Supabase after streaming is done
      if (finalAIMessage) {
        await saveMessageToSupabase(finalAIMessage);
      }
    } catch (error: any) {
      // Check if it's an abort error (component unmounted)
      if (error.name === 'AbortError') {
        console.log('Request was aborted - component unmounted');
        // Don't update message if component is unmounting
        return;
      } else {
        // Fallback to mock response on other errors
        console.error('Error during streaming:', error);
        const aiResponse = generateMockResponse(query);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.type === 'ai') {
            // Create a new object instead of mutating
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: aiResponse.content,
              citations: aiResponse.citations,
              confidence: aiResponse.confidence
            };
            // Save the error/fallback AI message to Supabase
            saveMessageToSupabase(newMessages[newMessages.length - 1]);
          }
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setStreamingSources({db_sources: [], web_sources: []}); // Clear sources after streaming completes
      isProcessingRef.current = false;
      abortControllerRef.current = null; // Clean up abort controller
    }
  };

  //delete

  //


  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Toggle Sidebar Button */}
      <div className="flex-shrink-0 border-b bg-white px-4 py-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Controls Header - Responsive */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="text-sm border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
            >
              {regions.map(region => (
                <option key={region.value} value={region.value}>
                  {region.flag} {region.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Search className="h-4 w-4 text-blue-600" />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs sm:text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">
          {messages.length > 0 ? `💬 ${messages.length} messages` : '👋 Start a conversation'}
        </div>
      </div> */}


      {/* Messages Area - Constrained height with scroll */}
      <div
        id="chat-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="p-4 sm:p-6 space-y-4 bg-gradient-to-b from-white to-gray-50 relative"
        style={{
          flex: '1 1 0',
          overflowY: 'scroll',
          overflowX: 'hidden',
          maxHeight: '100%',
          minHeight: 0
        }}
      >
        {isLoadingHistory ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium text-lg">Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 sm:py-12 max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <Search className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Ask about construction regulations</h3>
            <p className="text-base sm:text-lg text-gray-600 mb-8 px-4">Get instant AI-powered answers with proper citations and sources</p>

            <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto px-4">
              {sampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="group text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                      <span className="text-xs font-bold text-blue-600 group-hover:text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{question}</div>
                  </div>
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
                  <div className="flex justify-end animate-in slide-in-from-bottom">
                    <div className="max-w-[85%] sm:max-w-3xl p-4 sm:p-5 rounded-2xl shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <div className="whitespace-pre-wrap text-sm sm:text-base font-medium">{message.content}</div>
                      <div className="text-xs opacity-60 mt-3 font-medium">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Show sources FIRST if this is AI message and web sources are available */}
                {message.type === 'ai' && index === messages.length - 1 && isLoading && streamingSources.web_sources.length > 0 && (
                  <div className="flex justify-start mb-3 mt-4">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-3 max-w-3xl">
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-600 mb-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                        <span>Searching {streamingSources.web_sources.length} web sources</span>
                      </div>

                      {/* Web Sources only in horizontal scroll */}
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {streamingSources.web_sources.map((source, idx) => {
                          const domain = source.url ? new URL(source.url).hostname.replace('www.', '') : '';

                          return (
                            <a
                              key={`web-${idx}`}
                              href={source.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 w-40 p-2 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all group bg-white"
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </div>
                                <span className="text-xs text-gray-400">🌐</span>
                              </div>
                              <p className="text-xs font-medium text-gray-800 group-hover:text-blue-600 line-clamp-2 leading-tight">
                                {source.title || 'Web Page'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {domain}
                              </p>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Message - AFTER sources */}
                {message.type === 'ai' && message.content && (
                <div className="flex justify-start animate-in slide-in-from-bottom">
                  <div className="max-w-[85%] sm:max-w-3xl p-4 sm:p-5 rounded-2xl shadow-md bg-white border-2 border-gray-100">
                    {renderMessageContent(message.content)}
                    {message.citations && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <span className="mr-2">📚</span> Sources:
                        </div>
                        {message.citations.map((citation, i) => (
                          <div key={i} className="text-xs sm:text-sm mb-2 pl-4 border-l-2 border-blue-200">
                            📄 {renderCitationContent(citation)}
                          </div>
                        ))}
                        <div className="mt-3 flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                              style={{width: `${message.confidence}%`}}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-600">{message.confidence}%</span>
                        </div>
                      </div>
                    )}
                    <div className="text-xs opacity-60 mt-3 font-medium">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                )}
              </div>
            ))}

            {/* Show searching indicator when sources haven't arrived yet */}
            {isLoading && messages.length > 0 && messages[messages.length - 1].type === 'ai' && streamingSources.db_sources.length === 0 && streamingSources.web_sources.length === 0 && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white border-2 border-gray-100 shadow-md rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm font-medium text-gray-600">Searching sources...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button - appears when user scrolls up */}
        {!isAutoScroll && messages.length > 0 && (
          <button
            onClick={() => {
              setIsAutoScroll(true);
              scrollToBottom();
            }}
            className="fixed bottom-[110px] right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl z-10 flex items-center space-x-2"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
            {/* <span className="text-sm font-medium pr-1">New messages</span> */}
          </button>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white p-4 sm:p-5 shadow-lg">
        <div className="flex space-x-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about construction laws, safety standards, or compliance..."
            className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md transition-all duration-200 hover:shadow-lg"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;