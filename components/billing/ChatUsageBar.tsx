'use client';

import type { BillingUsageResponse } from '@/services/apiClient';
import {
  getUsageWarningLevel,
  usageBarColor,
  usageProgressPercent,
} from '@/components/billing/usage-utils';

type ChatUsageBarProps = {
  usage: BillingUsageResponse | null;
  onUpgrade?: () => void;
};

/** Compact usage strip above the chat composer (visible when sidebar is collapsed too). */
export default function ChatUsageBar({ usage, onUpgrade }: ChatUsageBarProps) {
  if (!usage) return null;

  const isUnlimited = usage.limit === null;
  const level = getUsageWarningLevel(usage);
  const used = usage.used;
  const limit = usage.limit ?? 0;
  const remaining = usage.remaining ?? 0;
  const pct = usageProgressPercent(usage);

  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-[#555]">
        <span>
          {isUnlimited ? (
            <span className="font-medium text-[#1D9E75]">{usage.plan.name} · Unlimited</span>
          ) : (
            <>
              <span className="font-medium">{used}</span>
              <span className="text-[#999]"> / {limit} messages</span>
              <span className="text-[#999]"> · </span>
              <span
                className={
                  level === 'exceeded' || level === 'critical'
                    ? 'font-semibold text-amber-700'
                    : 'font-medium'
                }
              >
                {remaining} left
              </span>
            </>
          )}
        </span>
        {!isUnlimited && onUpgrade && (level !== 'none' || usage.plan.code === 'free') && (
          <button
            type="button"
            onClick={onUpgrade}
            className="shrink-0 font-semibold text-[#1D9E75] hover:underline"
          >
            Upgrade
          </button>
        )}
      </div>
      {!isUnlimited && (
        <div className="h-1 overflow-hidden rounded-full bg-[#E8F5F0]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${usageBarColor(level)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
