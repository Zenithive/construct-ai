import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, AlertCircle, CheckSquare, Bell, Settings, User, MapPin, Search, Download, Share2, Clock, Shield, BookOpen, Zap } from 'lucide-react';

// Types
type Message = {
  type: 'user' | 'ai';
  content: string;
  citations?: string[];
  confidence?: number;
  timestamp: Date;
};

// Chat Component
const ChatComponent = ({ selectedRegion, selectedCategory, regions, categories }) => {
  const [messages, setMessages] = useState([] as Message[]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [region, setRegion] = useState(selectedRegion);
    const [category, setCategory] = useState(selectedCategory);

  const sampleQuestions = [
    "What are the fire safety requirements for high-rise buildings?",
    "What's the minimum wage for construction workers in this region?",
    "Are there specific requirements for crane operations?",
    "What are the environmental clearance requirements for new construction?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateMockResponse = (question: string): Message => {
    const responses = {
      "fire": {
        content: "Based on the National Building Code of India (NBC) 2016, fire safety requirements for high-rise buildings include:\n\n• Fire exits: Minimum 2 fire exits per floor for buildings above 15m\n• Fire detection: Automatic fire detection system mandatory\n• Sprinkler systems: Required for buildings above 30m height\n• Fire lift: Dedicated fire lift for buildings above 60m\n\nKey Regulation: NBC 2016, Part 4, Section 1",
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
        content: "I understand you're asking about construction regulations. Based on the current database for " + regions.find(r => r.value === region)?.label
 + ", here are the key points:\n\n• Regulations vary by project type and location\n• Most construction projects require multiple approvals\n• Safety standards are mandatory for all projects\n• Environmental clearances may be required\n\nRecommendation: Please provide more specific details about your project type and location for a more targeted answer.",
        citations: ["General Construction Guidelines"],
        confidence: 75
      }
    };
  
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
    if (!inputMessage.trim()) return;

    const userMessage: Message = { type: 'user', content: inputMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const aiResponse = generateMockResponse(inputMessage);
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              className="border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {regions.map(region => (
                <option key={region.value} value={region.value}>
                  {region.flag} {region.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {messages.length > 0 ? `${messages.length} messages` : 'Start a conversation'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ask about construction regulations</h3>
            <p className="text-gray-500 mb-6">Get instant answers with proper citations</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {sampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm text-gray-700">{question}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl p-4 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white border shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.citations && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Sources:</div>
                  {message.citations.map((citation, i) => (
                    <div key={i} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                      📄 {citation}
                    </div>
                  ))}
                  <div className="mt-2 text-xs text-gray-500">
                    Confidence: {message.confidence}%
                  </div>
                </div>
              )}
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about construction laws, safety standards, or compliance..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;