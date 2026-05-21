'use client';

import { User } from 'lucide-react';
import { useBillingUsage } from '@/hooks/useBillingUsage';

const PLAN_STYLES: Record<string, string> = {
  free: 'border-black/[0.09] bg-white text-[#555]',
  pro: 'border-[#1D9E75]/35 bg-[#E8F5F0] text-[#0F6E56]',
  enterprise: 'border-violet-200 bg-violet-50 text-violet-800',
};

type SidebarPlanTagProps = {
  refreshKey?: number;
  /** Icon-only pill when sidebar is collapsed */
  compact?: boolean;
};

export default function SidebarPlanTag({
  refreshKey = 0,
  compact = false,
}: SidebarPlanTagProps) {
  const { usage, loading, error } = useBillingUsage(refreshKey);

  if (loading || error || !usage) return null;

  const style =
    PLAN_STYLES[usage.plan.code] ?? PLAN_STYLES.free;
  const label = usage.plan.name;

  if (compact) {
    return (
      <span
        title={`${label} plan`}
        className={`inline-flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 ${style}`}
      >
        <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="max-w-[2.5rem] truncate text-[8px] font-bold leading-none">
          {label}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${style}`}
      title={`Active plan: ${label}`}
    >
      <User className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
