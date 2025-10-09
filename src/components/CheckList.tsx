
import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, Download, Share2, MapPin, Scale, Send} from 'lucide-react';

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


  const handleCategoryChange = (categoryValue) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryValue)) {
        return prev.filter(cat => cat !== categoryValue);
      } else {
        return [...prev, categoryValue];
      }
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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

  // Function to parse PDF citations and create clickable links - enhanced for resources section
  const parsePDFCitations = (text) => {
    console.log('🔍 Parsing text:', text, 'Type:', typeof text);

    // Ensure text is a string
    if (typeof text !== 'string') {
      console.warn('parsePDFCitations received non-string:', text);
      return String(text || '');
    }

    let result = text;

    // Enhanced patterns to match different citation formats in resources section
    const patterns = [
      // Original pattern: [📄 Source, pp. X-Y](PDF_URL#page=X)
      /\[([^\]]*📄[^\]]*)\]\((https?:\/\/[^\)]+\.pdf[^\)]*)\)/gi,
      // Pattern for resources: [Source Name, Page X](PDF_URL)
      /\[([^[\]]*(?:page|p\.)\s*\d+[^[\]]*)\]\((https?:\/\/[^\)]+\.pdf[^\)]*)\)/gi,
      // Pattern for simple PDF links: [Document Name](PDF_URL#page=X)
      /\[([^[\]]+)\]\((https?:\/\/[^\)]+\.pdf[^\)]*)\)/gi,
      // Pattern for naked PDF URLs with page numbers
      /(https?:\/\/[^\s]+\.pdf(?:#page=\d+)?)/gi
    ];

    // Process each pattern to create clickable PDF links
    patterns.forEach(pattern => {
      result = result.replace(pattern, (match, linkText, pdfUrl) => {
        console.log('🔍 PDF link match:', { match, linkText, pdfUrl, pattern: pattern.toString() });

        // Handle naked URL pattern (no linkText)
        if (!pdfUrl && linkText && linkText.startsWith('http')) {
          pdfUrl = linkText;
          linkText = 'Open PDF';
        }

        // Extract page number from URL or link text
        let pageNum = null;

        // First try to get page from URL fragment
        const urlPageMatch = pdfUrl.match(/#page=(\d+)/);
        if (urlPageMatch) {
          pageNum = parseInt(urlPageMatch[1], 10);
        } else {
          // Try to extract page number from link text - enhanced regex for resources
          const textPageMatches = [
            /(?:page|p\.)\s*(\d+)/i,
            /pp?\.\s*(\d+)(?:-\d+)?/i,
            /\b(\d+)\s*(?:page|p\.)/i
          ];

          for (const pageRegex of textPageMatches) {
            const textPageMatch = linkText.match(pageRegex);
            if (textPageMatch) {
              pageNum = parseInt(textPageMatch[1], 10);
              break;
            }
          }
        }

        // Clean the PDF URL (remove existing page fragment and decode if needed)
        let cleanUrl = pdfUrl.replace(/#page=\d+/, '').trim();

        // Handle already encoded URLs
        try {
          cleanUrl = decodeURIComponent(cleanUrl);
        } catch (e) {
          console.warn('URL decode failed:', e);
        }

        // Create fallback options for PDF viewing with page navigation
        const createPdfLink = (url, page) => {
          const encodedUrl = encodeURIComponent(url);

          // Multiple fallback options with page support
          const options = [
            // Option 1: PDF.js from official CDN with page navigation
            `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodedUrl}${page ? `#page=${page}` : ''}`,
            // Option 2: Alternative PDF.js viewer
            `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/web/viewer.html?file=${encodedUrl}${page ? `#page=${page}` : ''}`,
            // Option 3: Google Docs viewer (limited page support)
            `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`,
            // Option 4: Direct link with page fragment
            url + (page ? `#page=${page}` : '')
          ];

          return options;
        };

        const pdfViewerUrls = createPdfLink(cleanUrl, pageNum);
        console.log('🔍 PDF viewer URLs with page navigation:', { urls: pdfViewerUrls, pageNum });

        // Create enhanced link with retry logic and page navigation
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
    // Ensure citation is a string
    const citationString = typeof citation === 'string' ? citation : String(citation || '');
    const parsedContent = parsePDFCitations(citationString);
    return <span dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  const generateChecklist = async () => {
    if (!inputMessage.trim()) return;

    const userRequest = { type: 'user', content: inputMessage, timestamp: new Date() };
    setChecklists(prev => [...prev, userRequest]);
    const query = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get the country value and selected categories
      const country = selectedCountry;
      const categoryLabels = selectedCategories.map(cat =>
        lawCategories.find(c => c.value === cat)?.label
      ).filter(Boolean);

      // Prepare API request body
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
      console.log('🔍 Response keys:', Object.keys(data));
      console.log('🔍 Response type:', typeof data);

      // Format the response into a checklist
      let checklistContent = '';
      const selectedCountryLabel = countries.find(c => c.value === selectedCountry)?.label || 'Selected Region';

      // Try different possible response formats
      if (data.checklist && Array.isArray(data.checklist)) {
        // Format: { checklist: ["item1", "item2", ...] }
        checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;

        if (categoryLabels.length > 0) {
          checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
        }

        checklistContent += `## Compliance Checklist\n\n`;

        data.checklist.forEach((item, index) => {
          checklistContent += `- [ ] ${item}\n`;
        });
      } else if (Array.isArray(data)) {
        // Format: ["item1", "item2", ...]
        checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;

        if (categoryLabels.length > 0) {
          checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
        }

        checklistContent += `## Compliance Checklist\n\n`;

        data.forEach((item, index) => {
          checklistContent += `- [ ] ${item}\n`;
        });
      } else if (typeof data === 'string') {
        // Format: "item1\nitem2\n..." or markdown string
        checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;

        if (categoryLabels.length > 0) {
          checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
        }

        if (data.includes('- [ ]') || data.includes('#')) {
          // Already formatted markdown
          checklistContent += data;
        } else {
          // Plain text items, convert to checklist
          checklistContent += `## Compliance Checklist\n\n`;
          const items = data.split('\n').filter(item => item.trim());
          items.forEach(item => {
            checklistContent += `- [ ] ${item.trim()}\n`;
          });
        }
      } else if (data && typeof data === 'object') {
        // Try to find checklist data in any property
        const possibleKeys = ['checklist', 'items', 'content', 'response', 'result'];
        let found = false;

        for (const key of possibleKeys) {
          if (data[key]) {
            console.log(`🔍 Found data in key: ${key}`, data[key]);

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
          // Show raw response for debugging
          checklistContent = `# Generated Checklist - ${selectedCountryLabel}\n\n## Debug Info\n\nAPI Response Format:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n## Items\n- [ ] Review API response format\n- [ ] Contact support if issues persist`;
        }
      } else {
        // Fallback if API response format is completely unexpected
        checklistContent = `# Generated Checklist - ${selectedCountryLabel}\n\n## Debug Info\n\nUnexpected API response type: ${typeof data}\nResponse: ${JSON.stringify(data)}\n\n## Items\n- [ ] Review API response format\n- [ ] Contact support if issues persist`;
      }

      // Extract citations and confidence from API response
      let citations = [];
      let confidence = 85; // Default confidence

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

      // Fallback response on error
      const errorResponse = {
        type: 'ai',
        content: `# Error Generating Checklist\n\n## Issue\nUnable to connect to checklist generation service.\n\n## Fallback Items\n- [ ] Check network connectivity\n- [ ] Verify API endpoint availability\n- [ ] Contact support for assistance\n- [ ] Try again in a few moments\n\n*Error: ${error.message}*`,
        timestamp: new Date()
      };

      setChecklists(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };

  // Function to parse markdown formatting (same as ChatComponent)
  const parseMarkdown = (text) => {
    // Ensure text is a string
    if (typeof text !== 'string') {
      console.warn('parseMarkdown received non-string:', text);
      return String(text || '');
    }

    let result = text;

    // Headers with better styling
    result = result.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-2">$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b-2 border-blue-200 pb-2">$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-6 border-b-2 border-blue-500 pb-3">$1</h1>');

    // Bold text with better contrast
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');

    // Italic text
    result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');

    // Code blocks (triple backticks)
    result = result.replace(/```(\w+)?\n([\s\S]*?)\n```/g, '<pre class="bg-gray-100 border border-gray-300 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm font-mono text-gray-800">$2</code></pre>');

    // Inline code
    result = result.replace(/`([^`]+)`/g, '<code class="text-red-600 px-1 text-sm font-mono">$1</code>');

    // Checklist items (specific to checklist component)
    result = result.replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><input type="checkbox" class="mt-1 rounded border-gray-300 text-blue-600"><span class="flex-1">$1</span></li>');

    // Regular bullet points with better styling
    result = result.replace(/^- (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><span class="text-blue-500 font-bold mt-1">•</span><span class="flex-1">$1</span></li>');

    // Numbered lists
    result = result.replace(/^\d+\. (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><span class="text-blue-500 font-bold mt-1 min-w-[1.5rem]">$&</span></li>');

    // Wrap consecutive list items in ul tags with better styling
    result = result.replace(/(<li[^>]*>.*<\/li>\s*)+/gs, (match) => {
      return `<ul class="space-y-1 my-4 pl-2 border-l-4 border-blue-200">${match}</ul>`;
    });

    // Horizontal rules with better styling
    result = result.replace(/^---$/gm, '<hr class="border-gray-300 my-6 border-t-2">');

    // Blockquotes
    result = result.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 italic text-gray-700">$1</blockquote>');

    // Tables (basic support)
    result = result.replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map(cell => cell.trim());
      return `<tr>${cells.map(cell => `<td class="border border-gray-300 px-3 py-2">${cell}</td>`).join('')}</tr>`;
    });

    // Wrap table rows
    result = result.replace(/(<tr>.*<\/tr>\s*)+/gs, (match) => {
      return `<table class="w-full border-collapse border border-gray-300 my-4">${match}</table>`;
    });

    // Line breaks (double space + newline becomes <br>)
    result = result.replace(/  \n/g, '<br>');

    // Paragraphs (wrap text blocks)
    result = result.replace(/\n\n+/g, '</p><p class="mb-4">');
    result = `<p class="mb-4">${result}</p>`;

    // Clean up empty paragraphs
    result = result.replace(/<p class="mb-4"><\/p>/g, '');
    result = result.replace(/<p class="mb-4">(<h[1-6]|<hr|<ul|<blockquote|<table)/g, '$1');
    result = result.replace(/(<\/h[1-6]>|<\/hr>|<\/ul>|<\/blockquote>|<\/table>)<\/p>/g, '$1');

    return result;
  };

  // Function to render message content with parsed PDF links and markdown
  const renderChecklistContent = (content) => {
    // First parse PDF citations, then markdown formatting
    let parsedContent = parsePDFCitations(content);
    parsedContent = parseMarkdown(parsedContent);

    return <div className="text-sm sm:text-base max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };


  //api integration 

  return (
    <>
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Controls Header - Fixed height */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b bg-gray-50 gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="text-sm border rounded px-2 py-1 sm:px-3 sm:py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
            >
              {countries.map(country => (
                <option key={country.value} value={country.value}>
                  {country.flag} {country.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedCategories.length > 0 ? selectedCategories[0] : 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedCategories([]);
                } else {
                  setSelectedCategories([e.target.value]);
                }
              }}
              className="text-sm border rounded px-2 py-1 sm:px-3 sm:py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
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
        <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-right">
          {checklists.length > 0 ? `${checklists.length} messages` : 'Start a conversation'}
        </div>
      </div>

      {/* Messages Area - Constrained height with scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {checklists.length === 0 && (
          <div className="text-center py-4 sm:py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
              <CheckSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">Generate compliance checklists</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 px-4">Get customized checklists with proper citations</p>
          </div>
        )}

        {checklists.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-3xl p-3 sm:p-4 rounded-lg ${
              message.type === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white border shadow-sm'
            }`}>
              {message.type === 'ai' ? renderChecklistContent(message.content) : <div className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</div>}

              {message.citations && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2">Sources:</div>
                  {message.citations.map((citation, i) => (
                    <div key={i} className="text-xs sm:text-sm mb-1">
                      📄 {renderCitationContent(citation)}
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
            <div className="bg-white border shadow-sm rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t bg-white p-3 sm:p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && generateChecklist()}
            placeholder="Ask for compliance checklists, safety standards, or requirements..."
            className="flex-1 border rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={generateChecklist}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default ChecklistComponent;