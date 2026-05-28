'use client';

import React from 'react';
import { useBillingUsage } from '@/hooks/useBillingUsage';

interface Props { refreshKey?: number; }

const ChatUsageBar: React.FC<Props> = ({ refreshKey = 0 }) => {
  const { usage } = useBillingUsage(refreshKey);

  if (!usage || usage.plan.messageLimit === null) return null;

  const pct  = Math.min(100, Math.round((usage.used / usage.plan.messageLimit) * 100));
  const warn = pct >= 80;
  const full = pct >= 100;

  return (
    <div className="px-4 py-2 border-b border-black/[0.06] bg-white">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#999]">
          {usage.used} of {usage.plan.messageLimit} messages used
        </span>
        {warn && (
          <span className={`text-[11px] font-medium ${full ? 'text-red-500' : 'text-amber-500'}`}>
            {full ? 'Limit reached' : 'Almost full'}
          </span>
        )}
      </div>
      <div className="h-1 rounded-full bg-[#f0f0ec] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${full ? 'bg-red-400' : warn ? 'bg-amber-400' : 'bg-[#1D9E75]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ChatUsageBar;
