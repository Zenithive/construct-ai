'use client';

import type { BillingUsageResponse } from '@/services/apiClient';
import {
  getUsageWarningLevel,
  getUsageWarningMessage,
} from '@/components/billing/usage-utils';

type UsageWarningProps = {
  usage: BillingUsageResponse | null;
  onUpgrade?: () => void;
  className?: string;
};

export default function UsageWarning({
  usage,
  onUpgrade,
  className = '',
}: UsageWarningProps) {
  const level = getUsageWarningLevel(usage);
  const message = getUsageWarningMessage(usage);

  if (!message || level === 'none') return null;

  const isExceeded = level === 'exceeded';

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-sm ${
        isExceeded
          ? 'border border-red-200 bg-red-50 text-red-900'
          : 'border border-amber-200 bg-amber-50 text-amber-900'
      } ${className}`}
      role="status"
    >
      <span>{message}</span>
      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-white ${
            isExceeded ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1D9E75] hover:bg-[#0F6E56]'
          }`}
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
