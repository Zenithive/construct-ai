'use client';

import { useState, useCallback, useEffect } from 'react';
import { Copy, ThumbsUp, ThumbsDown, Check, X } from 'lucide-react';
import { chatApi } from '@/services/apiClient';

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

const DISLIKE_REASONS = [
  "Not factually correct",
  "Outdated or incorrect regulations",
  "Doesn't answer my question",
  "Not helpful",
  "Missing important information",
  "Too vague or unclear",
];

type FeedbackState = 'idle' | 'submitting' | 'done';

/* ── Dislike feedback modal ──────────────────────────────────────────────── */
function DislikeFeedbackModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const reason = selected === 'other' ? custom.trim() : (selected ?? custom.trim());
    setSubmitting(true);
    await onSubmit(reason);
    setSubmitting(false);
  };

  const canSubmit = selected !== null || custom.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-black/[0.08] p-5 sm:p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-[15px] font-semibold text-gray-900 pr-6">
          What was wrong with this response?
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Your feedback helps us improve ConstructionAI.
        </p>

        {/* Predefined reasons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {DISLIKE_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setSelected(selected === reason ? null : reason)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                selected === reason
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-black/[0.1] bg-white text-gray-600 hover:border-black/[0.18] hover:bg-gray-50'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="mt-3">
          <textarea
            rows={3}
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              if (e.target.value.trim()) setSelected(null);
            }}
            placeholder="Add more details (optional)..."
            className="w-full resize-none rounded-xl border border-black/[0.1] bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-black/[0.18] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#0F6E56] disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AI response action bar: Copy · Like · Dislike ──────────────────────── */
export function MessageActions({
  content,
  messageId,
  sessionId,
  initialFeedbackType,
}: {
  content: string;
  messageId?: string;
  sessionId?: string;
  /** From chat history — restores thumbs state */
  initialFeedbackType?: 'like' | 'dislike' | null;
}) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(initialFeedbackType === 'like');
  const [disliked, setDisliked] = useState(initialFeedbackType === 'dislike');
  const [likeState, setLikeState] = useState<FeedbackState>('idle');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setLiked(initialFeedbackType === 'like');
    setDisliked(initialFeedbackType === 'dislike');
  }, [initialFeedbackType, messageId]);

  const handleCopy = useCallback(async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleLike = async () => {
    if (liked) return; // already liked — no toggle back
    setLiked(true);
    setDisliked(false);
    setLikeState('submitting');
    if (messageId && sessionId) {
      try {
        await chatApi.submitFeedback(messageId, sessionId, 'like');
        setLikeState('done');
      } catch (e) {
        console.error('Failed to submit like feedback:', e);
        setLikeState('idle');
      }
    } else {
      setLikeState('done');
    }
  };

  const handleDislike = () => {
    if (disliked) return; // already disliked — no toggle back
    setShowModal(true);
  };

  const handleModalSubmit = async (reason: string) => {
    setDisliked(true);
    setLiked(false);
    setLikeState('idle');
    if (messageId && sessionId) {
      try {
        await chatApi.submitFeedback(messageId, sessionId, 'dislike', reason);
      } catch (e) {
        console.error('Failed to submit dislike feedback:', e);
      }
    }
    setShowModal(false);
  };

  const handleModalClose = () => setShowModal(false);

  return (
    <>
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
          title={liked ? 'Liked' : 'Good response'}
          disabled={likeState === 'submitting'}
          className={`rounded-lg p-1.5 transition-all duration-150 ${
            liked
              ? 'bg-[#E1F5EE] text-[#1D9E75]'
              : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#555]'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>

        {/* Thumbs Down */}
        <button
          type="button"
          onClick={handleDislike}
          title={disliked ? 'Feedback submitted' : 'Bad response'}
          className={`rounded-lg p-1.5 transition-all duration-150 ${
            disliked
              ? 'bg-red-50 text-red-500'
              : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#555]'
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {showModal && (
        <DislikeFeedbackModal onSubmit={handleModalSubmit} onClose={handleModalClose} />
      )}
    </>
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
