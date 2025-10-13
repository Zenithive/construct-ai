
import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, MapPin, Send, Zap, Scale } from 'lucide-react';

// Extend Window interface for custom properties
declare global {
  interface Window {
    handlePdfLinkClick?: (event: any, linkElement: any) => void;
  }
}

const ChecklistComponent = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [checklists, setChecklists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('india');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const messagesEndRef = useRef(null);

  // Countries data similar to ChatComponent
  const countries = [
    { value: 'india', label: 'India', flag: '🇮🇳' },
    { value: 'usa', label: 'United States', flag: '🇺🇸' },
    { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'canada', label: 'Canada', flag: '🇨🇦' },
    { value: 'australia', label: 'Australia', flag: '🇦🇺' }
  ];

  // Law categories data
  const lawCategories = [
    { value: 'building-codes', label: 'Building Codes' },
    { value: 'safety-regulations', label: 'Safety Regulations' },
    { value: 'environmental', label: 'Environmental Compliance' },
    { value: 'labor-laws', label: 'Labor Laws' },
    { value: 'fire-safety', label: 'Fire Safety' },
    { value: 'structural', label: 'Structural Requirements' },
    { value: 'electrical', label: 'Electrical Standards' },
    { value: 'plumbing', label: 'Plumbing Codes' }
  ];

  // Pre-defined checklist templates
  const checklistTemplates = [
    {
      id: 'site-prep',
      title: 'Site Preparation',
      icon: '🏗️',
      description: 'Essential site preparation checklist',
      query: 'Generate a comprehensive site preparation checklist for construction project'
    },
    {
      id: 'safety-inspection',
      title: 'Safety Inspection',
      icon: '🦺',
      description: 'Workplace safety compliance',
      query: 'Generate a construction site safety inspection checklist'
    },
    {
      id: 'material-quality',
      title: 'Material Quality',
      icon: '📦',
      description: 'Material inspection and quality control',
      query: 'Generate a material quality control and inspection checklist'
    },
    {
      id: 'building-permit',
      title: 'Building Permit',
      icon: '📋',
      description: 'Building permit requirements',
      query: 'Generate a building permit application checklist'
    },
    {
      id: 'final-inspection',
      title: 'Final Inspection',
      icon: '✅',
      description: 'Project completion inspection',
      query: 'Generate a final construction project inspection checklist'
    },
    {
      id: 'environmental',
      title: 'Environmental',
      icon: '🌱',
      description: 'Environmental compliance',
      query: 'Generate an environmental compliance checklist for construction'
    }
  ];

  const handleTemplateClick = (template) => {
    // Add user message
    const userRequest = { type: 'user', content: template.query, timestamp: new Date() };
    setChecklists(prev => [...prev, userRequest]);
    // Generate checklist
    generateChecklistFromQuery(template.query);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    const messagesArea = document.querySelector('.messages-area-checklist');
    if (messagesArea) {
      messagesArea.scrollTop = 0;
    }
  };

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop();
  }, []);

  useEffect(() => {
    // Only scroll to bottom when there are messages
    if (checklists.length > 0) {
      scrollToBottom();
    }
  }, [checklists]);

  // Enhanced PDF link click handler with page navigation support
  useEffect(() => {
    window.handlePdfLinkClick = (event, linkElement) => {
      event.preventDefault();

      const fallbackUrls = JSON.parse(linkElement.dataset.fallbackUrls || '[]');
      const primaryUrl = linkElement.href;
      const page = linkElement.dataset.page;

      console.log('🔍 Attempting to open PDF:', { primaryUrl, fallbackUrls, page });

      // Show loading indicator
      const originalText = linkElement.textContent;
      linkElement.textContent = page ? `Opening PDF at page ${page}...` : 'Opening PDF...';
      linkElement.style.opacity = '0.7';

      // Try to open the primary URL
      const openPdf = (url, index = 0) => {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

        if (!newWindow) {
          console.warn(`Failed to open PDF viewer ${index + 1}, trying next fallback...`);

          // Try next fallback URL
          if (index < fallbackUrls.length) {
            setTimeout(() => openPdf(fallbackUrls[index], index + 1), 500);
          } else {
            // All options failed, show enhanced error message
            const directUrl = linkElement.href.split('?file=')[1] ?
              decodeURIComponent(linkElement.href.split('?file=')[1].split('#')[0]) :
              linkElement.href;

            alert(`Unable to open PDF${page ? ` at page ${page}` : ''}. Please try:\n1. Allow popups for this site\n2. Download the PDF directly\n3. Copy the link below and open in a new tab\n\nDirect PDF URL: ${directUrl}${page ? `#page=${page}` : ''}`);

            // Reset link appearance
            linkElement.textContent = originalText;
            linkElement.style.opacity = '1';
          }
          return;
        }

        // Check if the window actually loaded (basic check)
        setTimeout(() => {
          try {
            if (newWindow.closed) {
              console.warn(`PDF viewer ${index + 1} was blocked or closed, trying fallback...`);
              if (index < fallbackUrls.length) {
                openPdf(fallbackUrls[index], index + 1);
              } else {
                // Reset link appearance if all failed
                linkElement.textContent = originalText;
                linkElement.style.opacity = '1';
              }
            } else {
              console.log(`✅ PDF viewer ${index + 1} opened successfully${page ? ` at page ${page}` : ''}`);
              // Reset link appearance on success
              setTimeout(() => {
                linkElement.textContent = originalText;
                linkElement.style.opacity = '1';
              }, 1000);
            }
          } catch (e) {
            console.warn('Could not check window status:', e);
            // Reset link appearance
            setTimeout(() => {
              linkElement.textContent = originalText;
              linkElement.style.opacity = '1';
            }, 2000);
          }
        }, 1000);
      };

      openPdf(primaryUrl);
    };

    // Cleanup function to remove global handler
    return () => {
      delete window.handlePdfLinkClick;
    };
  }, []);

  // Function to parse PDF citations and create clickable links
  const parsePDFCitations = (text) => {
    if (typeof text !== 'string') {
      return String(text || '');
    }

    let result = text;

    const patterns = [
      /\[([^\]]*📄[^\]]*)\]\((https?:\/\/[^\)]+\.pdf[^\)]*)\)/gi,
      /\[([^[\]]*(?:page|p\.)\s*\d+[^[\]]*)\]\((https?:\/\/[^\)]+\.pdf[^\)]*)\)/gi,
      /\[([^[\]]+)\]\((https?:\/\/[^\)]+\.pdf[^\)]*)\)/gi,
      /(https?:\/\/[^\s]+\.pdf(?:#page=\d+)?)/gi
    ];

    patterns.forEach(pattern => {
      result = result.replace(pattern, (match, linkText, pdfUrl) => {
        // Ensure pdfUrl is defined and is a string
        if (!pdfUrl && linkText && typeof linkText === 'string' && linkText.startsWith('http')) {
          pdfUrl = linkText;
          linkText = 'Open PDF';
        }

        // If pdfUrl is still not a string, return the original match
        if (!pdfUrl || typeof pdfUrl !== 'string') {
          return match;
        }

        let pageNum = null;
        const urlPageMatch = pdfUrl.match(/#page=(\d+)/);
        if (urlPageMatch) {
          pageNum = parseInt(urlPageMatch[1], 10);
        }

        let cleanUrl = pdfUrl.replace(/#page=\d+/, '').trim();

        try {
          cleanUrl = decodeURIComponent(cleanUrl);
        } catch (e) {
          console.warn('URL decode failed:', e);
        }

        const createPdfLink = (url, page) => {
          const encodedUrl = encodeURIComponent(url);
          const options = [
            `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodedUrl}${page ? `#page=${page}` : ''}`,
            `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/web/viewer.html?file=${encodedUrl}${page ? `#page=${page}` : ''}`,
            `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`,
            url + (page ? `#page=${page}` : '')
          ];
          return options;
        };

        const pdfViewerUrls = createPdfLink(cleanUrl, pageNum);
        const linkId = `pdf-link-${Math.random().toString(36).substr(2, 9)}`;

        return `<a
          id="${linkId}"
          href="${pdfViewerUrls[0]}"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 hover:text-blue-800 underline font-medium pdf-citation-link"
          data-fallback-urls='${JSON.stringify(pdfViewerUrls.slice(1))}'
          data-page="${pageNum || ''}"
          onclick="handlePdfLinkClick(event, this)"
          title="${pageNum ? `Open PDF at page ${pageNum}` : 'Open PDF'}"
        >${linkText}${pageNum ? ` (Page ${pageNum})` : ''}</a>`;
      });
    });

    return result;
  };

  // Function to render citation content with HTML
  const renderCitationContent = (citation) => {
    const citationString = typeof citation === 'string' ? citation : String(citation || '');
    const parsedContent = parsePDFCitations(citationString);
    return <span dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  const generateChecklistFromQuery = async (query) => {
    setInputMessage('');
    setIsLoading(true);

    try {
      const country = selectedCountry;
      const categoryLabels = selectedCategories.map(cat =>
        lawCategories.find(c => c.value === cat)?.label
      ).filter(Boolean);

      const requestBody = {
        prompt: query,
        country: country,
        categories: categoryLabels
      };

      console.log('🔍 Checklist API Request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('http://20.106.19.100:8001/api/v1/checklist/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Checklist API Response:', data);

      let checklistContent = '';
      const selectedCountryLabel = countries.find(c => c.value === selectedCountry)?.label || 'Selected Region';

      if (data.checklist && Array.isArray(data.checklist)) {
        checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;
        if (categoryLabels.length > 0) {
          checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
        }
        checklistContent += `## Compliance Checklist\n\n`;
        data.checklist.forEach((item) => {
          checklistContent += `- [ ] ${item}\n`;
        });
      } else if (Array.isArray(data)) {
        checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;
        if (categoryLabels.length > 0) {
          checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
        }
        checklistContent += `## Compliance Checklist\n\n`;
        data.forEach((item) => {
          checklistContent += `- [ ] ${item}\n`;
        });
      } else if (typeof data === 'string') {
        checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;
        if (categoryLabels.length > 0) {
          checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
        }
        if (data.includes('- [ ]') || data.includes('#')) {
          checklistContent += data;
        } else {
          checklistContent += `## Compliance Checklist\n\n`;
          const items = data.split('\n').filter(item => item.trim());
          items.forEach(item => {
            checklistContent += `- [ ] ${item.trim()}\n`;
          });
        }
      } else if (data && typeof data === 'object') {
        const possibleKeys = ['checklist', 'items', 'content', 'response', 'result'];
        let found = false;

        for (const key of possibleKeys) {
          if (data[key]) {
            if (Array.isArray(data[key])) {
              checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;
              if (categoryLabels.length > 0) {
                checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
              }
              checklistContent += `## Compliance Checklist\n\n`;
              data[key].forEach(item => {
                checklistContent += `- [ ] ${item}\n`;
              });
              found = true;
              break;
            } else if (typeof data[key] === 'string') {
              checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;
              if (categoryLabels.length > 0) {
                checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
              }
              checklistContent += data[key];
              found = true;
              break;
            }
          }
        }

        if (!found) {
          checklistContent = `# Generated Checklist - ${selectedCountryLabel}\n\n## Debug Info\n\nAPI Response Format:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n## Items\n- [ ] Review API response format\n- [ ] Contact support if issues persist`;
        }
      } else {
        checklistContent = `# Generated Checklist - ${selectedCountryLabel}\n\n## Debug Info\n\nUnexpected API response type: ${typeof data}\nResponse: ${JSON.stringify(data)}\n\n## Items\n- [ ] Review API response format\n- [ ] Contact support if issues persist`;
      }

      let citations = [];
      let confidence = 85;

      if (data.sources && Array.isArray(data.sources)) {
        citations = data.sources;
      } else if (data.citations && Array.isArray(data.citations)) {
        citations = data.citations;
      }

      if (data.confidence && typeof data.confidence === 'number') {
        confidence = data.confidence;
      }

      const aiResponse = {
        type: 'ai',
        content: checklistContent,
        citations: citations.length > 0 ? citations : undefined,
        confidence: confidence,
        timestamp: new Date()
      };

      setChecklists(prev => [...prev, aiResponse]);
      setIsLoading(false);

    } catch (error) {
      console.error('Error calling checklist API:', error);
      const errorResponse = {
        type: 'ai',
        content: `# Error Generating Checklist\n\n## Issue\nUnable to connect to checklist generation service.\n\n## Fallback Items\n- [ ] Check network connectivity\n- [ ] Verify API endpoint availability\n- [ ] Contact support for assistance\n- [ ] Try again in a few moments\n\n*Error: ${error.message}*`,
        timestamp: new Date()
      };
      setChecklists(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };

  const generateChecklist = async () => {
    if (!inputMessage.trim()) return;

    const userRequest = { type: 'user', content: inputMessage, timestamp: new Date() };
    setChecklists(prev => [...prev, userRequest]);
    const query = inputMessage;
    generateChecklistFromQuery(query);
  };

  // Function to parse markdown formatting
  const parseMarkdown = (text) => {
    if (typeof text !== 'string') {
      return String(text || '');
    }

    let result = text;

    result = result.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-2">$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b-2 border-blue-200 pb-2">$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-6 border-b-2 border-blue-500 pb-3">$1</h1>');
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
    result = result.replace(/```(\w+)?\n([\s\S]*?)\n```/g, '<pre class="bg-gray-100 border border-gray-300 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm font-mono text-gray-800">$2</code></pre>');
    result = result.replace(/`([^`]+)`/g, '<code class="text-red-600 px-1 text-sm font-mono">$1</code>');
    result = result.replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><input type="checkbox" class="mt-1 rounded border-gray-300 text-blue-600"><span class="flex-1">$1</span></li>');
    result = result.replace(/^- (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><span class="text-blue-500 font-bold mt-1">•</span><span class="flex-1">$1</span></li>');
    result = result.replace(/^\d+\. (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><span class="text-blue-500 font-bold mt-1 min-w-[1.5rem]">$&</span></li>');
    result = result.replace(/(<li[^>]*>.*<\/li>\s*)+/gs, (match) => {
      return `<ul class="space-y-1 my-4 pl-2 border-l-4 border-blue-200">${match}</ul>`;
    });
    result = result.replace(/^---$/gm, '<hr class="border-gray-300 my-6 border-t-2">');
    result = result.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 italic text-gray-700">$1</blockquote>');
    result = result.replace(/  \n/g, '<br>');
    result = result.replace(/\n\n+/g, '</p><p class="mb-4">');
    result = `<p class="mb-4">${result}</p>`;
    result = result.replace(/<p class="mb-4"><\/p>/g, '');
    result = result.replace(/<p class="mb-4">(<h[1-6]|<hr|<ul|<blockquote|<table)/g, '$1');
    result = result.replace(/(<\/h[1-6]>|<\/hr>|<\/ul>|<\/blockquote>|<\/table>)<\/p>/g, '$1');

    return result;
  };

  // Function to render message content with parsed PDF links and markdown
  const renderChecklistContent = (content) => {
    let parsedContent = parsePDFCitations(content);
    parsedContent = parseMarkdown(parsedContent);
    return <div className="text-sm sm:text-base max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="text-sm border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
            >
              {countries.map(country => (
                <option key={country.value} value={country.value}>
                  {country.flag} {country.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckSquare className="h-4 w-4 text-blue-600" />
            </div>
            <select
              value={selectedCategories.length > 0 ? selectedCategories[0] : 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedCategories([]);
                } else {
                  setSelectedCategories([e.target.value]);
                }
              }}
              className="text-sm border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
            >
              <option value="all">All Categories</option>
              {lawCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs sm:text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">
          {checklists.length > 0 ? `📋 ${checklists.length} messages` : '👋 Start generating checklists'}
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area-checklist flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-white to-gray-50">
        {checklists.length === 0 && (
          <div className="text-center py-8 sm:py-12 max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <CheckSquare className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Generate compliance checklists</h3>
            <p className="text-base sm:text-lg text-gray-600 mb-8 px-4">Get customized checklists with proper citations and sources</p>

            <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto px-4">
              {checklistTemplates.map((template, index) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="group text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{template.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {checklists.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom`}>
            <div className={`max-w-[85%] sm:max-w-3xl p-4 sm:p-5 rounded-2xl shadow-md ${
              message.type === 'user'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-white border-2 border-gray-100'
            }`}>
              {message.type === 'ai' ? renderChecklistContent(message.content) : <div className="whitespace-pre-wrap text-sm sm:text-base font-medium">{message.content}</div>}

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
        ))}

        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border-2 border-gray-100 shadow-md rounded-2xl p-4 sm:p-5">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm font-medium text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white p-4 sm:p-5 shadow-lg">
        <div className="flex space-x-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && generateChecklist()}
            placeholder="Ask for compliance checklists, safety standards, or requirements..."
            className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
          <button
            onClick={generateChecklist}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md transition-all duration-200 hover:shadow-lg"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default ChecklistComponent;
