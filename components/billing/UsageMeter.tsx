'use client';

import React from 'react';
import { useBillingUsage } from '@/hooks/useBillingUsage';

interface Props { isOpen: boolean; refreshKey?: number; }

const UsageMeter: React.FC<Props> = ({ isOpen, refreshKey = 0 }) => {
  const { usage, isLoading } = useBillingUsage(refreshKey);

  if (isLoading || !usage || usage.plan.messageLimit === null) return null;

  const pct  = Math.min(100, Math.round((usage.used / usage.plan.messageLimit) * 100));
  const warn = pct >= 80;
  const full = pct >= 100;

  if (!isOpen) {
    return (
      <div className="flex justify-center px-2 pb-1">
        <div className="w-8 h-1 rounded-full bg-[#f0f0ec] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${full ? 'bg-red-400' : warn ? 'bg-amber-400' : 'bg-[#1D9E75]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2 flex-shrink-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#999]">
          {usage.used} / {usage.plan.messageLimit} messages
        </span>
        <span className={`text-[10px] font-medium ${full ? 'text-red-500' : warn ? 'text-amber-500' : 'text-[#999]'}`}>
          {pct}%
        </span>
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

export default UsageMeter;
