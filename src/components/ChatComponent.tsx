import React, { useEffect, useRef, useState } from "react";
import { Send, MapPin, Search } from "lucide-react";
import supabase from "../supaBase/supabaseClient";
import SidebarLayout from "./ChatSidebar";

// ====================== TYPES ======================
export type Message = {
  type: "user" | "ai";
  content: string;
  citations?: string[];
  confidence?: number;
  timestamp: Date;
};

type Region = { value: string; label: string; flag?: string };
type Category = { value: string; label: string };

type ChatComponentProps = {
  selectedRegion: string;
  selectedCategory: string;
  regions: Region[];
  categories: Category[];
};

// ====================== COMPONENT ======================
const ChatComponent: React.FC<ChatComponentProps> = ({
  selectedRegion,
  selectedCategory,
  regions,
  categories,
}) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [region, setRegion] = useState<string>(selectedRegion);
  const [category, setCategory] = useState<string>(selectedCategory);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Sample quick questions
  const sampleQuestions = [
    "What are the fire safety requirements for high-rise buildings?",
    "What's the minimum wage for construction workers in this region?",
    "Are there specific requirements for crane operations?",
    "What are the environmental clearance requirements for new construction?",
  ];

  // ----------------- Utilities -----------------
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    const messagesArea = document.querySelector("#chat-scroll-area");
    if (messagesArea) (messagesArea as HTMLElement).scrollTop = 0;
  };

  // Parse PDF citations in a markdown-like string and return HTML string with links
  const parsePDFCitations = (text: string) => {
    if (!text) return "";
    const markdownLinkPattern = /\[([^\]]*📄[^\]]*)]\((https?:\/\/[^)]+\.pdf(?:#[^)]*)?)\)/gi;
    const replaced = text.replace(markdownLinkPattern, (match, linkText, pdfUrl) => {
      // try to extract page from fragment (#page=)
      const urlPageMatch = pdfUrl.match(/#page=(\d+)/);
      let pageNum: string | null = null;
      if (urlPageMatch) pageNum = urlPageMatch[1];

      const cleanUrl = pdfUrl.replace(/#page=\d+/, "");
      const viewerBase = "https://mozilla.github.io/pdf.js/web/viewer.html?file=";
      const viewerUrl = pageNum
        ? `${viewerBase}${encodeURIComponent(cleanUrl)}#page=${pageNum}`
        : `${viewerBase}${encodeURIComponent(cleanUrl)}`;

      return `<a href="${viewerUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">${linkText}</a>`;
    });

    return replaced;
  };

  // Basic markdown -> HTML transformation (keeps it small and correct for common cases)
  const parseMarkdown = (raw: string) => {
    if (!raw) return "";
    let result = raw;

    // Code blocks ``` ```
    result = result.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (m, lang, code) => {
      const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre class="bg-gray-100 border border-gray-300 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm font-mono">${escaped}</code></pre>`;
    });

    // Headers
    result = result.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-8 mb-6">$1</h1>');

    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');
    result = result.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    result = result.replace(/`([^`]+)`/g, '<code class="px-1 text-sm font-mono">$1</code>');

    // Lists (simple support)
    result = result.replace(/^\- (.+)$/gm, '<li class="py-1">$1</li>');
    result = result.replace(/(<li[\s\S]*?<\/li>\s*)+/g, (match) => `<ul class="my-4 pl-5">${match}</ul>`);

    // Numbered lists
    result = result.replace(/^\d+\. (.+)$/gm, '<li class="py-1">$1</li>');
    result = result.replace(/(<li[\s\S]*?<\/li>\s*)+/g, (match) => `<ol class="my-4 pl-5 list-decimal">${match}</ol>`);

    // Blockquotes
    result = result.replace(/^> (.+)$/gm, '<blockquote class="pl-4 italic border-l-4">$1</blockquote>');

    // Horizontal rule
    result = result.replace(/^---$/gm, '<hr class="my-6"/>');

    // Paragraphs: split on double newlines
    const paragraphs = result.split(/\n\n+/).map((p) => `<p class="mb-4">${p.replace(/\n/g, '<br/>')}</p>`);
    return paragraphs.join("");
  };

  // Create final HTML for a message: first parse PDF citations, then markdown
  const renderHtmlFromContent = (content: string) => {
    const withPdfLinks = parsePDFCitations(content);
    const withMarkdown = parseMarkdown(withPdfLinks);
    return withMarkdown;
  };

  // Render citation content (returns JSX element using dangerouslySetInnerHTML)
  const renderCitationContent = (citation: string) => {
    const parsed = parsePDFCitations(citation);
    return <span dangerouslySetInnerHTML={{ __html: parsed }} />;
  };

  // ----------------- Supabase persistence -----------------
  const saveMessageToSupabase = async (message: Message) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: userId,
        message_type: message.type,
        content: message.content,
        citations: message.citations || null,
        confidence: message.confidence || null,
        region: region,
        category: category,
      });
      if (error) console.error("Error saving message to Supabase:", error);
    } catch (err) {
      console.error("Unexpected error saving message:", err);
    }
  };

  // ----------------- Load history on mount -----------------
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Error fetching user:", userError);
          setIsLoadingHistory(false);
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading chat history:", error);
          setIsLoadingHistory(false);
          return;
        }

        const loadedMessages: Message[] = (data || []).map((msg: any) => ({
          type: msg.message_type as "user" | "ai",
          content: msg.content,
          citations: msg.citations || undefined,
          confidence: msg.confidence || undefined,
          timestamp: new Date(msg.created_at),
        }));

        setMessages(loadedMessages);
      } catch (err) {
        console.error("Unexpected error loading chat history:", err);
      } finally {
        setIsLoadingHistory(false);
        scrollToTop();
      }
    };

    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages]);

  // Update region/category when props change
  useEffect(() => {
    setRegion(selectedRegion);
    setCategory(selectedCategory);
  }, [selectedRegion, selectedCategory]);

  // ----------------- Mock generator (fallback) -----------------
  const generateMockResponse = (question: string): Message => {
    const key = question.toLowerCase().includes("fire")
      ? "fire"
      : question.toLowerCase().includes("wage") || question.toLowerCase().includes("labor")
      ? "wage"
      : question.toLowerCase().includes("crane")
      ? "crane"
      : "default";

    const responses: Record<string, any> = {
      fire: {
        content:
          `Based on the National Building Code of ${
            regions.find((r) => r.value === region)?.label || region
          } (NBC) 2016, fire safety requirements for high-rise buildings include:\n\n• Fire exits: Minimum 2 fire exits per floor for buildings above 15m\n• Fire detection: Automatic fire detection system mandatory\n• Sprinkler systems: Required for buildings above 30m height\n• Fire lift: Dedicated fire lift for buildings above 60m\n\nKey Regulation: NBC 2016, Part 4, Section 1, citations: ["NBC 2016, Part 4, Section 1.2.3", "Fire Prevention and Fire Safety Code 2019"]`,
        citations: ["NBC 2016, Part 4, Section 1.2.3"],
        confidence: 95,
      },
      wage: {
        content:
          "According to the Minimum Wages Act 1948 and recent state notifications:\n\n• Skilled workers: ₹450-550 per day (varies by state)\n• Semi-skilled workers: ₹400-450 per day\n• Unskilled workers: ₹350-400 per day\n• Overtime: 2x regular rate after 8 hours\n\nNote: Rates updated quarterly. Current rates effective from Oct 2024.",
        citations: ["Minimum Wages Act 1948"],
        confidence: 90,
      },
      crane: {
        content:
          "Crane operations in India are governed by:\n\n• Operator certification: Valid crane operator license required\n• Load limits: Must not exceed 80% of rated capacity\n• Inspection frequency: Monthly inspection by certified engineer\n• Safety zones: 3m minimum clearance from power lines\n\nKey Standards: IS 4137:1989 for mobile cranes",
        citations: ["IS 4137:1989"],
        confidence: 92,
      },
      default: {
        content:
          `I understand you're asking about construction regulations for ${regions.find((r) => r.value === region)?.label || region}. Please provide more specific details about your project type and location for a more targeted answer.`,
        citations: ["General Construction Guidelines"],
        confidence: 75,
      },
    };

    const sel = responses[key] || responses.default;
    return {
      type: "ai",
      content: sel.content,
      citations: sel.citations,
      confidence: sel.confidence,
      timestamp: new Date(),
    };
  };

  // ----------------- Send message (streaming API + fallback) -----------------
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = { type: "user", content: inputMessage, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);

    // Save user message
    await saveMessageToSupabase(userMessage);

    const query = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      // Insert placeholder AI message (will be updated while streaming)
      const aiPlaceholder: Message = { type: "ai", content: "", timestamp: new Date() };
      setMessages((prev) => [...prev, aiPlaceholder]);

      const country = region;
      const categoryLabels = category === "all" ? [] : [categories.find((c) => c.value === category)?.label || category];

      const requestBody = { query, country, categories: categoryLabels, top_k: 10, include_sources: true };

      const response = await fetch("http://20.106.19.100:8001/api/v1/query/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let previousContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Some streaming APIs use SSE-like lines with `data: ...`
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const jsonData = JSON.parse(line.substring(6));
              if (jsonData.type === "content" && jsonData.data) {
                const fullContent = jsonData.data.full_content || jsonData.data.content || "";
                if (fullContent !== previousContent) {
                  previousContent = fullContent;

                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.type === "ai") {
                      lastMessage.content = fullContent;
                    }
                    return newMessages;
                  });
                }
              }
            } catch (e) {
              // ignore JSON parse errors for partial chunks
            }
          }
        }
      }

      // After streaming finishes, save the final AI message
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          saveMessageToSupabase(lastMessage);
        }
        return prev;
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Error calling streaming API:", error);

      // Fallback to mock response
      const aiResponse = generateMockResponse(query);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.content = aiResponse.content;
          lastMessage.citations = aiResponse.citations;
          lastMessage.confidence = aiResponse.confidence;
          // Save fallback message
          saveMessageToSupabase(lastMessage);
        }
        return newMessages;
      });

      setIsLoading(false);
    }
  };

  // ----------------- Handlers -----------------
  const handleSelectMessage = (content: string) => {
    setInputMessage(content);
    scrollToBottom();
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputMessage("");
  };

  // ----------------- RENDER -----------------
  
   return (
    <div className="flex h-screen overflow-hidden transition-all duration-300 ease-in-out">
  {/* Sidebar */}
  <SidebarLayout
    messages={messages}
    onSelectMessage={handleSelectMessage}
    onNewChat={handleNewChat}
    isLoadingHistory={isLoadingHistory}
    isOpen={isOpen}
    setIsOpen={setIsOpen}
  />

  {/* Chat Area */}
  <div
    className={`flex flex-col flex-1 bg-white transition-all duration-300 ease-in-out 
    ${isOpen ? "lg:ml-60" : "lg:ml-0"} ml-0`}
  >
    {/* ===== Controls Header ===== */}
    {/*<div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 gap-3 sm:gap-4">
      */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-around p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 gap-3 sm:gap-4">

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
            {regions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.flag ? `${r.flag} ` : ""}
                {r.label}
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
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-xs sm:text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">
        {messages.length > 0
          ? `💬 ${messages.length} messages`
          : "👋 Start a conversation"}
      </div>
    </div>

    {/* ===== Messages Section ===== */}
    <div
      id="chat-scroll-area"
      className="p-4 sm:p-6 space-y-4 bg-gradient-to-b from-white to-gray-50 flex-1 overflow-y-scroll overflow-x-hidden"
    >
      {isLoadingHistory ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium text-lg">
            Loading chat history...
          </p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8 sm:py-12 max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Search className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Ask about construction regulations
          </h3>
          <p className="text-base sm:text-lg text-gray-600 mb-8 px-4">
            Get instant AI-powered answers with proper citations and sources
          </p>
          <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto px-4">
            {sampleQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(question)}
                className="group text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                    <span className="text-xs font-bold text-blue-600 group-hover:text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                    {question}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              } animate-in slide-in-from-bottom`}
            >
              <div
                className={`d ${
                  message.type === "user"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "bg-white border-2 border-gray-100"
                }`}
              >
                {message.type === "ai" ? (
                  <div
                    className="text-sm sm:text-base max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: renderHtmlFromContent(message.content),
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm sm:text-base font-medium">
                    {message.content}
                  </div>
                )}

                <div className="text-xs opacity-60 mt-3 font-medium">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white border-2 border-gray-100 shadow-md rounded-2xl p-4 sm:p-5">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm font-medium text-gray-600">
                    AI is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* ===== Input Section ===== */}
    <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white p-4 sm:p-5 shadow-lg">
      <div className="flex space-x-3 max-w-4xl mx-auto">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
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
</div>

);


};

export default ChatComponent;
