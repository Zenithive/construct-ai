'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, MapPin, Send } from 'lucide-react';
import { AI_BASE_URL } from '@/services/apiClient';

declare global { interface Window { handlePdfLinkClick?: (event: any, linkElement: any) => void } }

const ChecklistComponent = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [checklists, setChecklists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('india');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const countries = [{ value: 'india', label: 'India', flag: '🇮🇳' }, { value: 'usa', label: 'United States', flag: '🇺🇸' }, { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' }, { value: 'canada', label: 'Canada', flag: '🇨🇦' }, { value: 'australia', label: 'Australia', flag: '🇦🇺' }];
  const lawCategories = [{ value: 'building-codes', label: 'Building Codes' }, { value: 'safety-regulations', label: 'Safety Regulations' }, { value: 'environmental', label: 'Environmental Compliance' }, { value: 'labor-laws', label: 'Labor Laws' }, { value: 'fire-safety', label: 'Fire Safety' }, { value: 'structural', label: 'Structural Requirements' }, { value: 'electrical', label: 'Electrical Standards' }, { value: 'plumbing', label: 'Plumbing Codes' }];
  const checklistTemplates = [
    { id: 'site-prep', title: 'Site Preparation', icon: '🏗️', description: 'Essential site preparation checklist', query: 'Generate a comprehensive site preparation checklist for construction project' },
    { id: 'safety-inspection', title: 'Safety Inspection', icon: '🦺', description: 'Workplace safety compliance', query: 'Generate a construction site safety inspection checklist' },
    { id: 'material-quality', title: 'Material Quality', icon: '📦', description: 'Material inspection and quality control', query: 'Generate a material quality control and inspection checklist' },
    { id: 'building-permit', title: 'Building Permit', icon: '📋', description: 'Building permit requirements', query: 'Generate a building permit application checklist' },
    { id: 'final-inspection', title: 'Final Inspection', icon: '✅', description: 'Project completion inspection', query: 'Generate a final construction project inspection checklist' },
    { id: 'environmental', title: 'Environmental', icon: '🌱', description: 'Environmental compliance', query: 'Generate an environmental compliance checklist for construction' },
  ];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [checklists]);

  const parsePDFCitations = (text: string) => {
    if (typeof text !== 'string') return String(text || '');
    return text.replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi, (_, linkText, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">${linkText}</a>`
    );
  };

  const parseMarkdown = (text: string) => {
    if (typeof text !== 'string') return String(text || '');
    let result = text;
    result = result.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-2">$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b-2 border-blue-200 pb-2">$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-6 border-b-2 border-blue-500 pb-3">$1</h1>');
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
    result = result.replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><input type="checkbox" class="mt-1 rounded border-gray-300 text-blue-600"><span class="flex-1">$1</span></li>');
    result = result.replace(/^- (.+)$/gm, '<li class="flex items-start space-x-2 py-1"><span class="text-blue-500 font-bold mt-1">•</span><span class="flex-1">$1</span></li>');
    result = result.replace(/(<li[\s\S]*?<\/li>\s*)+/gs, match => `<ul class="space-y-1 my-4 pl-2 border-l-4 border-blue-200">${match}</ul>`);
    result = result.replace(/^---$/gm, '<hr class="border-gray-300 my-6 border-t-2">');
    result = result.replace(/\n\n+/g, '</p><p class="mb-4">');
    result = `<p class="mb-4">${result}</p>`;
    result = result.replace(/<p class="mb-4"><\/p>/g, '');
    return result;
  };

  const renderChecklistContent = (content: string) => {
    let parsedContent = parsePDFCitations(content);
    parsedContent = parseMarkdown(parsedContent);
    return <div className="text-sm sm:text-base max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  const generateChecklistFromQuery = async (query: string) => {
    setInputMessage(''); setIsLoading(true);
    try {
      const categoryLabels = selectedCategories.map(cat => lawCategories.find(c => c.value === cat)?.label).filter(Boolean);
      const response = await fetch(`${AI_BASE_URL}/api/v1/checklist/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: query, country: selectedCountry, categories: categoryLabels }) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const selectedCountryLabel = countries.find(c => c.value === selectedCountry)?.label || 'Selected Region';
      let checklistContent = `# ${query} - ${selectedCountryLabel}\n\n`;
      if (categoryLabels.length > 0) checklistContent += `## Selected Categories\n${categoryLabels.join(', ')}\n\n`;
      checklistContent += `## Compliance Checklist\n\n`;
      const items = data.checklist || data;
      if (Array.isArray(items)) items.forEach((item: any) => { checklistContent += `- [ ] ${item}\n`; });
      else if (typeof data === 'string') checklistContent += data;
      setChecklists(prev => [...prev, { type: 'ai', content: checklistContent, citations: data.sources || data.citations || undefined, confidence: data.confidence || 85, timestamp: new Date() }]);
    } catch (error: any) {
      setChecklists(prev => [...prev, { type: 'ai', content: `# Error Generating Checklist\n\n- [ ] Check network connectivity\n- [ ] Verify API endpoint availability\n\n*Error: ${error.message}*`, timestamp: new Date() }]);
    }
    setIsLoading(false);
  };

  const generateChecklist = async () => {
    if (!inputMessage.trim()) return;
    setChecklists(prev => [...prev, { type: 'user', content: inputMessage, timestamp: new Date() }]);
    await generateChecklistFromQuery(inputMessage);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white rounded-lg shadow-sm"><MapPin className="h-4 w-4 text-blue-600" /></div>
            <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="text-sm border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm">
              {countries.map(c => <option key={c.value} value={c.value}>{c.flag} {c.label}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white rounded-lg shadow-sm"><CheckSquare className="h-4 w-4 text-blue-600" /></div>
            <select value={selectedCategories.length > 0 ? selectedCategories[0] : 'all'} onChange={e => setSelectedCategories(e.target.value === 'all' ? [] : [e.target.value])} className="text-sm border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm">
              <option value="all">All Categories</option>
              {lawCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="text-xs sm:text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">{checklists.length > 0 ? `📋 ${checklists.length} messages` : '👋 Start generating checklists'}</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-white to-gray-50">
        {checklists.length === 0 && (
          <div className="text-center py-8 sm:py-12 max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg"><CheckSquare className="h-8 w-8 sm:h-10 sm:w-10 text-white" /></div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Generate compliance checklists</h3>
            <p className="text-base sm:text-lg text-gray-600 mb-8 px-4">Get customized checklists with proper citations and sources</p>
            <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto px-4">
              {checklistTemplates.map(template => (
                <button key={template.id} onClick={() => { setChecklists(prev => [...prev, { type: 'user', content: template.query, timestamp: new Date() }]); generateChecklistFromQuery(template.query); }} className="group text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start space-x-3"><div className="text-2xl">{template.icon}</div><div className="flex-1"><h4 className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{template.title}</h4><p className="text-xs text-gray-500 mt-1">{template.description}</p></div></div>
                </button>
              ))}
            </div>
          </div>
        )}
        {checklists.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-3xl p-4 sm:p-5 rounded-2xl shadow-md ${message.type === 'user' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-white border-2 border-gray-100'}`}>
              {message.type === 'ai' ? renderChecklistContent(message.content) : <div className="whitespace-pre-wrap sm:text-base font-medium">{message.content}</div>}
              {message.citations && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center"><span className="mr-2">📚</span> Sources:</div>
                  {message.citations.map((citation: string, i: number) => <div key={i} className="text-xs sm:text-sm mb-2 pl-4 border-l-2 border-blue-200">📄 <span dangerouslySetInnerHTML={{ __html: parsePDFCitations(citation) }} /></div>)}
                  <div className="mt-3 flex items-center space-x-2"><div className="flex-1 bg-gray-200 rounded-full h-2"><div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" style={{ width: `${message.confidence}%` }} /></div><span className="text-xs font-semibold text-gray-600">{message.confidence}%</span></div>
                </div>
              )}
              <div className="text-xs opacity-60 mt-3 font-medium">{message.timestamp.toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start animate-pulse"><div className="bg-white border-2 border-gray-100 shadow-md rounded-2xl p-4 sm:p-5"><div className="flex items-center space-x-3"><div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" /><span className="text-sm font-medium text-gray-600">AI is thinking...</span></div></div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white p-4 sm:p-5 shadow-lg">
        <div className="flex space-x-3 max-w-4xl mx-auto">
          <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && generateChecklist()} placeholder="Ask for compliance checklists, safety standards, or requirements..." className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
          <button onClick={generateChecklist} disabled={!inputMessage.trim() || isLoading} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md transition-all duration-200 hover:shadow-lg"><Send className="h-5 w-5" /></button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistComponent;
