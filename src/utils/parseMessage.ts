/**
 * Converts inline citation markers into domain hyperlinks using the sources array.
 *
 * Each "🌐 Regulation" marker in the text corresponds sequentially to a source
 * from db_sources or web_sources. We replace each one with a clickable domain link.
 * If no sources are available, falls back to a plain 🌐 icon.
 */
export const formatInlineCitations = (text: string, sources: any[] = []): string => {
  let sourceIndex = 0;

  const result = text
    // Replace "🌐 SomeLabel" with a domain hyperlink from sources
    .replace(/🌐\s*[\w][\w\s]*/g, () => {
      const source = sources[sourceIndex] || null;
      sourceIndex++;

      if (source?.url) {
        try {
          const domain = new URL(source.url).hostname.replace('www.', '');
          return `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors align-middle no-underline" title="${source.title || domain}">🌐 ${domain}</a>`;
        } catch {
          // Invalid URL — fall back to title or icon
          const label = source.title ? source.title.slice(0, 30) : '🌐';
          return `<span class="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-md text-xs bg-blue-50 text-blue-600 border border-blue-200 align-middle">🌐 ${label}</span>`;
        }
      }

      // No source available — show plain icon
      return `<span class="inline-flex items-center mx-0.5 px-1 py-0.5 rounded-md text-xs bg-gray-100 text-gray-500 border border-gray-200 align-middle">🌐</span>`;
    })
    // [1], [2,3] → superscript badge
    .replace(/\[(\d+(?:,\s*\d+)*)\]/g, (_, nums) => {
      return `<sup class="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 ml-0.5 align-super">[${nums}]</sup>`;
    });

  return result;
};

/**
 * Converts markdown links [text](url) to anchor tags.
 */
export const parsePDFCitations = (text: string): string => {
  const markdownLinkPattern = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi;
  return text.replace(markdownLinkPattern, (_, linkText, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium break-words inline-block max-w-full">${linkText}</a>`;
  });
};

/**
 * Parses markdown text into HTML.
 */
export const parseMarkdown = (text: string, sources: any[] = []): string => {
  // 1. Format inline citation markers as domain hyperlinks
  let result = formatInlineCitations(text, sources);

  // 2. Headers
  result = result.replace(/^#### (.+?)(#+)?$/gm, '<h4 class="text-base font-semibold text-gray-900 mt-4 mb-1">$1</h4>');
  result = result.replace(/^### (.+?)(#+)?$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-5 mb-2">$1</h3>');
  result = result.replace(/^## (.+?)(#+)?$/gm, '<h2 class="text-xl font-semibold text-gray-900 mt-6 mb-2 border-b border-gray-200 pb-1">$1</h2>');
  result = result.replace(/^# (.+?)(#+)?$/gm, '<h1 class="text-2xl font-semibold text-gray-900 mt-6 mb-3">$1</h1>');

  // 3. Bold and italic
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  result = result.replace(/\*([^*\n]+)\*/g, '<em class="italic text-gray-700">$1</em>');

  // 4. Code blocks
  result = result.replace(
    /```(\w+)?\n([\s\S]*?)\n```/g,
    '<div class="my-3 overflow-x-auto rounded-lg border border-gray-200"><pre class="bg-gray-50 p-4 text-base font-mono text-gray-800 whitespace-pre-wrap break-all"><code>$2</code></pre></div>'
  );

  // 5. Inline code
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded text-base font-mono">$1</code>'
  );

  // 6. Bullet points
  result = result.replace(
    /^[\-\*] (.+)$/gm,
    '<li class="flex items-start gap-2 py-0.5"><span class="text-gray-400 mt-1 flex-shrink-0">•</span><span class="flex-1 break-words">$1</span></li>'
  );

  // 7. Numbered lists
  result = result.replace(/^(\d+)\. (.+)$/gm, (_, num, content) => {
    return `<li class="flex items-start gap-2 py-0.5"><span class="text-gray-500 font-medium flex-shrink-0 min-w-[1.2rem]">${num}.</span><span class="flex-1 break-words">${content}</span></li>`;
  });

  // 8. Wrap consecutive <li> items in <ul>
  result = result.replace(/(<li[\s\S]*?<\/li>\s*)+/g, (match) => {
    return `<ul class="my-3 space-y-1 pl-1">${match}</ul>`;
  });

  // 9. Horizontal rules
  result = result.replace(/^---$/gm, '<hr class="border-gray-200 my-4">');

  // 10. Blockquotes
  result = result.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-4 border-gray-300 pl-4 py-1 my-3 text-gray-600 italic">$1</blockquote>'
  );

  // 11. Tables
  const tablePattern = /(\|.+\|\n)(\|[\s:-]+\|[\s:-]*\n)((?:\|.+\|\n?)+)/gm;
  result = result.replace(tablePattern, (_, headerRow, _sep, bodyRows) => {
    const headerCells = headerRow.trim().split('|').filter((c: string) => c.trim()).map((c: string) => c.trim());
    const headerHtml = `<thead class="bg-gray-50 border-b border-gray-200">
      <tr>${headerCells.map((c: string) => `<th class="px-4 py-2 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">${c}</th>`).join('')}</tr>
    </thead>`;
    const rows = bodyRows.trim().split('\n').filter((r: string) => r.trim() && !/^\|[\s:-]+\|[\s:-]*$/.test(r.trim()));
    const bodyHtml = `<tbody class="divide-y divide-gray-100">
      ${rows.map((row: string, i: number) => {
        const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim());
        return `<tr class="${i % 2 !== 0 ? 'bg-gray-50' : ''} hover:bg-blue-50 transition-colors">
          ${cells.map((c: string) => `<td class="px-4 py-2.5 text-base text-gray-700 break-words">${c}</td>`).join('')}
        </tr>`;
      }).join('')}
    </tbody>`;
    return `<div class="my-4 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table class="min-w-full border-collapse">${headerHtml}${bodyHtml}</table>
    </div>`;
  });

  // 12. Paragraphs
  const blocks = result.split(/\n\n+/);
  result = blocks.map((block: string) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|blockquote|hr|div|table|pre)/.test(trimmed)) return trimmed;
    return `<p class="mb-3 leading-relaxed text-base text-gray-800">${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return result;
};

/**
 * Full render pipeline: parse links → parse markdown → return HTML string.
 * Pass sources array so 🌐 markers get replaced with real domain links.
 */
export const renderContent = (content: string, sources: any[] = []): string => {
  let result = parsePDFCitations(content);
  result = parseMarkdown(result, sources);
  return result;
};
