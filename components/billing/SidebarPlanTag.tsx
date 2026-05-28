'use client';

import React from 'react';
import { User } from 'lucide-react';
import { useBillingUsage } from '@/hooks/useBillingUsage';

interface Props { refreshKey?: number; compact?: boolean; }

const SidebarPlanTag: React.FC<Props> = ({ refreshKey = 0, compact = false }) => {
  const { usage } = useBillingUsage(refreshKey);
  if (!usage) return null;

  const plan = usage.plan.code;

  const styles: Record<string, string> = {
    free:       'bg-[#f0f0ec] text-[#555] border-black/[0.09]',
    pro:        'bg-[#E1F5EE] text-[#0F6E56] border-[#5DCAA5]/30',
    enterprise: 'bg-[#111] text-white border-transparent',
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold tracking-wide border ${styles[plan] ?? styles.free}`}>
        {plan.slice(0, 3).toUpperCase()}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium capitalize ${styles[plan] ?? styles.free}`}>
      <User className="w-2.5 h-2.5" />
      {plan}
    </span>
  );
};

export default SidebarPlanTag;
