'use client';

import { useState, useCallback } from 'react';
import { Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react';

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for older browsers
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

/* ── AI response action bar: Copy · Like · Dislike ──────────────────────── */
export function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const handleCopy = useCallback(async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    if (next) setDisliked(false);
  };

  const handleDislike = () => {
    const next = !disliked;
    setDisliked(next);
    if (next) setLiked(false);
  };

  return (
    <div className="mt-3 flex items-center gap-0.5 border-t border-black/[0.06] pt-2.5">
      {/* Copy */}
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy response'}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
          copied
            ? 'bg-[#E1F5EE] text-[#1D9E75]'
            : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#555]'
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <div className="mx-1 h-4 w-px bg-black/[0.09]" />

      {/* Thumbs Up */}
      <button
        type="button"
        onClick={handleLike}
        title="Good response"
        className={`rounded-lg p-1.5 transition-all duration-150 ${
          liked
            ? 'bg-[#E1F5EE] text-[#1D9E75]'
            : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#555]'
        }`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>

      {/* Thumbs Down */}
      <button
        type="button"
        onClick={handleDislike}
        title="Bad response"
        className={`rounded-lg p-1.5 transition-all duration-150 ${
          disliked
            ? 'bg-red-50 text-red-500'
            : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#555]'
        }`}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── User message copy button (visible on group-hover) ───────────────────── */
export function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy message'}
      className={`rounded-lg p-1.5 transition-all duration-150 ${
        copied
          ? 'text-[#1D9E75]'
          : 'text-[#999] hover:bg-black/[0.05] hover:text-[#555]'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
