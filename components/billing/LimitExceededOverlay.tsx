'use client';

import { Lock } from 'lucide-react';

type LimitExceededOverlayProps = {
  show: boolean;
  planName?: string;
  onUpgrade: () => void;
};

export default function LimitExceededOverlay({
  show,
  planName = 'Free',
  onUpgrade,
}: LimitExceededOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#fafaf8]/80 backdrop-blur-[2px]">
      <div className="mx-4 max-w-sm rounded-xl border border-black/[0.09] bg-white p-5 text-center shadow-lg">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-5 w-5 text-amber-700" />
        </div>
        <h3 className="text-base font-semibold text-[#111]">Message limit reached</h3>
        <p className="mt-1.5 text-sm text-[#666]">
          You&apos;ve used all messages included in your {planName} plan for this billing
          period. Upgrade to keep chatting.
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-4 w-full rounded-lg bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0F6E56]"
        >
          View plans & upgrade
        </button>
      </div>
    </div>
  );
}
