/**
 * utils/parseMessage.ts
 * Markdown + citation rendering utilities for chat messages.
 *
 * Supported formats:
 *  - Headings          h1–h6  (#, ##, ###, ####, #####, ######)
 *  - Bold              **text** or __text__
 *  - Italic            *text* or _text_
 *  - Bold + Italic     ***text***
 *  - Strikethrough     ~~text~~
 *  - Inline code       `code`
 *  - Fenced code       ```lang\n...\n```
 *  - Bullet lists      - item / * item (nested with 2-space indent)
 *  - Numbered lists    1. item (nested with 3-space indent)
 *  - Task lists        - [ ] / - [x]
 *  - Tables            | col | col | with separator row
 *  - Blockquotes       > text (multi-level >>)
 *  - Horizontal rule   --- / *** / ___
 *  - Markdown links    [text](url)
 *  - Plain URLs        https://... auto-linked
 *  - Inline citations  🌐 domain / [1] numeric refs
 */

// ─── Citation helpers ────────────────────────────────────────────────────────

export const formatInlineCitations = (text: string, sources: any[] = []): string => {
  let sourceIndex = 0;
  return text
    .replace(/🌐\s*[\w][\w\s]*/g, () => {
      const source = sources[sourceIndex] || null;
      sourceIndex++;
      if (source?.url) {
        try {
          const domain = new URL(source.url).hostname.replace('www.', '');
          return `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors align-middle no-underline" title="${source.title || domain}">🌐 ${domain}</a>`;
        } catch {
          const label = source.title ? source.title.slice(0, 30) : '🌐';
          return `<span class="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-md text-xs bg-blue-50 text-blue-600 border border-blue-200 align-middle">🌐 ${label}</span>`;
        }
      }
      return `<span class="inline-flex items-center mx-0.5 px-1 py-0.5 rounded-md text-xs bg-gray-100 text-gray-500 border border-gray-200 align-middle">🌐</span>`;
    })
    .replace(/\[(\d+(?:,\s*\d+)*)\]/g, (_, nums) =>
      `<sup class="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 ml-0.5 align-super">[${nums}]</sup>`
    );
};

export const parsePDFCitations = (text: string): string => {
  const markdownLinkPattern = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi;
  return text.replace(markdownLinkPattern, (_, linkText, url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#1D9E75] hover:text-[#0F6E56] underline font-medium break-words inline-block max-w-full transition-colors">${linkText}</a>`
  );
};

// ─── Inline styles (applied inside block content) ────────────────────────────

const applyInlineStyles = (text: string): string => {
  // Bold + Italic  ***text*** or ___text___
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-semibold text-gray-900"><em class="italic">$1</em></strong>');
  text = text.replace(/___(.+?)___/g,        '<strong class="font-semibold text-gray-900"><em class="italic">$1</em></strong>');
  // Bold  **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  text = text.replace(/__(.+?)__/g,      '<strong class="font-semibold text-gray-900">$1</strong>');
  // Italic  *text* or _text_  (not inside words)
  text = text.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<em class="italic text-gray-700">$1</em>');
  text = text.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g,   '<em class="italic text-gray-700">$1</em>');
  // Strikethrough  ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<del class="line-through text-gray-400">$1</del>');
  // Inline code  `code`
  text = text.replace(/`([^`]+)`/g, '<code class="text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded text-sm font-mono border border-pink-100">$1</code>');
  // Plain URLs not already inside an href (auto-link)
  text = text.replace(
    /(?<!href=["'])(?<![">])(https?:\/\/[^\s<>"']+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#1D9E75] hover:text-[#0F6E56] underline break-all transition-colors">$1</a>'
  );
  return text;
};

// ─── Table parser ─────────────────────────────────────────────────────────────

const parseTable = (tableBlock: string): string => {
  const lines = tableBlock.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return tableBlock;

  const isSeparator = (line: string) => /^\|[\s\-:|]+\|$/.test(line.trim());
  if (!isSeparator(lines[1])) return tableBlock;

  // Detect column alignment from separator row
  const sepCells = lines[1].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const alignments = sepCells.map(c => {
    if (c.startsWith(':') && c.endsWith(':')) return 'center';
    if (c.endsWith(':')) return 'right';
    return 'left';
  });

  const parseRow = (line: string) =>
    line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());

  const alignClass = (a: string) =>
    a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

  const headers = parseRow(lines[0]);
  const dataRows = lines.slice(2);

  const headerHtml = headers
    .map((h, i) => {
      const align = alignClass(alignments[i] || 'left');
      return `<th class="px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-200 whitespace-nowrap ${align}">${applyInlineStyles(h)}</th>`;
    })
    .join('');

  const rowsHtml = dataRows
    .map((row, i) => {
      const cells = parseRow(row);
      const cellsHtml = cells
        .map((c, j) => {
          const align = alignClass(alignments[j] || 'left');
          return `<td class="px-4 py-2.5 text-sm text-gray-700 border-b border-gray-100 ${align}">${applyInlineStyles(c)}</td>`;
        })
        .join('');
      const rowBg = i % 2 !== 0 ? 'bg-gray-50/60' : '';
      return `<tr class="${rowBg} hover:bg-[#E1F5EE]/30 transition-colors">${cellsHtml}</tr>`;
    })
    .join('');

  return `<div class="my-4 overflow-x-auto rounded-lg border border-gray-200 shadow-sm"><table class="w-full border-collapse"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
};

// ─── List parser (handles nesting + task lists) ───────────────────────────────

const parseList = (block: string): string => {
  const lines = block.split('\n');
  const isOrdered = /^\s*\d+\./.test(lines[0]);

  const buildItems = (items: string[], baseIndent: number): string => {
    let html = '';
    let i = 0;
    while (i < items.length) {
      const line = items[i];
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;

      if (indent < baseIndent) break;
      if (indent > baseIndent) { i++; continue; }

      // Collect sub-items (lines more indented than current)
      const subItems: string[] = [];
      let j = i + 1;
      while (j < items.length) {
        const nextIndent = (items[j].match(/^(\s*)/) || ['', ''])[1].length;
        if (nextIndent <= baseIndent) break;
        subItems.push(items[j]);
        j++;
      }

      // Parse the current line content
      const content = line.replace(/^\s*(?:\d+\.|-|\*)\s*/, '');

      // Task list checkbox
      const taskMatch = content.match(/^\[([ xX])\]\s*(.*)/);
      let itemContent: string;
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === 'x';
        itemContent = `<label class="flex items-start gap-2 cursor-default">
          <input type="checkbox" ${checked ? 'checked' : ''} disabled class="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1D9E75] flex-shrink-0 accent-[#1D9E75]" />
          <span class="${checked ? 'line-through text-gray-400' : 'text-gray-700'}">${applyInlineStyles(taskMatch[2])}</span>
        </label>`;
      } else {
        itemContent = `<span class="flex-1 break-words">${applyInlineStyles(content)}</span>`;
      }

      // Recurse for sub-items
      const subHtml = subItems.length > 0 ? buildItems(subItems, baseIndent + 2) : '';

      if (isOrdered) {
        const num = (line.match(/^\s*(\d+)\./) || ['', ''])[1];
        html += `<li class="flex items-start gap-2 py-0.5"><span class="text-gray-500 font-medium flex-shrink-0 min-w-[1.4rem] pt-0.5">${num}.</span>${itemContent}${subHtml}</li>`;
      } else {
        html += `<li class="flex items-start gap-2 py-0.5"><span class="text-[#1D9E75] mt-1.5 flex-shrink-0 text-xs">●</span>${itemContent}${subHtml}</li>`;
      }

      i = j;
    }
    return html;
  };

  const itemsHtml = buildItems(lines, 0);
  const tag = isOrdered ? 'ol' : 'ul';
  const listClass = isOrdered
    ? 'my-3 space-y-1 pl-1 list-none'
    : 'my-3 space-y-1 pl-1 list-none';
  return `<${tag} class="${listClass}">${itemsHtml}</${tag}>`;
};

// ─── Main markdown parser ─────────────────────────────────────────────────────

export const parseMarkdown = (text: string, sources: any[] = []): string => {
  // 1. Inline citations first (before any other processing)
  let result = formatInlineCitations(text, sources);

  // 2. Fenced code blocks — protect from further processing
  const codeBlocks: string[] = [];
  result = result.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="text-xs text-gray-400 font-mono uppercase tracking-wide">${lang}</span>` : '';
    const html = `<div class="my-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50">${langLabel ? `<div class="px-4 pt-2">${langLabel}</div>` : ''}<pre class="p-4 text-sm font-mono text-gray-800 whitespace-pre overflow-x-auto"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>`;
    codeBlocks.push(html);
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
  });

  // 3. Tables — detect and convert before line-by-line processing
  result = result.replace(/((?:^\|.+\|\s*(?:\n|$))+)/gm, (match) => parseTable(match));

  // 4. Process line by line for block-level elements
  const lines = result.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings h1–h6
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = applyInlineStyles(headingMatch[2]);
      const styles: Record<number, string> = {
        1: 'text-2xl font-bold text-gray-900 mt-6 mb-3 first:mt-0',
        2: 'text-xl font-semibold text-gray-900 mt-5 mb-2 border-b border-gray-200 pb-1 first:mt-0',
        3: 'text-lg font-semibold text-gray-900 mt-4 mb-1.5 first:mt-0',
        4: 'text-base font-semibold text-gray-900 mt-3 mb-1',
        5: 'text-sm font-semibold text-gray-700 mt-3 mb-1 uppercase tracking-wide',
        6: 'text-sm font-medium text-gray-500 mt-2 mb-1 uppercase tracking-wide',
      };
      output.push(`<h${level} class="${styles[level]}">${content}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      output.push('<hr class="border-gray-200 my-5">');
      i++;
      continue;
    }

    // Blockquote (collect consecutive > lines)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>{1,2}\s?/, ''));
        i++;
      }
      const inner = applyInlineStyles(quoteLines.join('<br>'));
      output.push(`<blockquote class="border-l-4 border-[#1D9E75]/40 bg-[#E1F5EE]/30 pl-4 pr-3 py-2 my-3 rounded-r-lg text-gray-600 italic">${inner}</blockquote>`);
      continue;
    }

    // Lists — collect consecutive list lines (including blank lines between items)
    if (/^\s*(?:[-*]|\d+\.)\s/.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (/^\s*(?:[-*]|\d+\.)\s/.test(l) || (l.trim() === '' && listLines.length > 0 && i + 1 < lines.length && /^\s*(?:[-*]|\d+\.)\s/.test(lines[i + 1]))) {
          listLines.push(l);
          i++;
        } else {
          break;
        }
      }
      output.push(parseList(listLines.join('\n')));
      continue;
    }

    // Already-converted HTML blocks (tables, code placeholders, headings from above)
    if (/^<(div|table|ul|ol|h[1-6]|blockquote|hr|pre)/.test(line.trim()) || /^%%CODEBLOCK_/.test(line.trim())) {
      output.push(line);
      i++;
      continue;
    }

    // Blank line — paragraph break
    if (line.trim() === '') {
      output.push('');
      i++;
      continue;
    }

    // Regular paragraph text — collect until blank line or block element
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (
        l.trim() === '' ||
        /^(#{1,6}\s|>|\s*(?:[-*]|\d+\.)\s|(\-{3,}|\*{3,}|_{3,})$)/.test(l) ||
        /^<(div|table|ul|ol|h[1-6]|blockquote|hr|pre)/.test(l.trim()) ||
        /^%%CODEBLOCK_/.test(l.trim())
      ) break;
      paraLines.push(applyInlineStyles(l));
      i++;
    }
    if (paraLines.length > 0) {
      output.push(`<p class="mb-3 leading-relaxed text-base text-gray-800">${paraLines.join('<br>')}</p>`);
    }
  }

  // 5. Restore code blocks
  result = output.join('\n');
  codeBlocks.forEach((block, idx) => {
    result = result.replace(`%%CODEBLOCK_${idx}%%`, block);
  });

  return result;
};

// ─── Sanitizer ───────────────────────────────────────────────────────────────

/**
 * Strips dangerous HTML tags from AI-generated content before rendering.
 */
export const sanitizeAIHtml = (content: string): string => {
  content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<\/?(html|head|body)[^>]*>/gi, '');
  content = content.replace(/<(meta|link|title)[^>]*\/?>/gi, '');
  return content;
};

// ─── Main entry point ─────────────────────────────────────────────────────────

export const renderContent = (content: string, sources: any[] = []): string => {
  let result = sanitizeAIHtml(content);
  result = parsePDFCitations(result);
  result = parseMarkdown(result, sources);
  return result;
};
