import type { BillingUsageResponse } from '@/services/apiClient';

export type UsageWarningLevel = 'none' | 'low' | 'critical' | 'exceeded';

export function getUsageWarningLevel(
  usage: BillingUsageResponse | null
): UsageWarningLevel {
  if (!usage || usage.limit === null) return 'none';
  const remaining = usage.remaining ?? 0;
  if (remaining <= 0) return 'exceeded';
  if (remaining <= 2) return 'critical';
  if (remaining <= 5) return 'low';
  return 'none';
}

export function getUsageWarningMessage(
  usage: BillingUsageResponse | null
): string | null {
  const level = getUsageWarningLevel(usage);
  if (level === 'none' || !usage || usage.limit === null) return null;
  const remaining = usage.remaining ?? 0;
  if (level === 'exceeded') {
    return `You've used all ${usage.limit} messages on the ${usage.plan.name} plan this period.`;
  }
  if (level === 'critical') {
    if (remaining === 1) {
      return 'Last message this period — upgrade to keep chatting.';
    }
    return `${remaining} messages left — upgrade soon.`;
  }
  return `${remaining} messages left this period.`;
}

export function usageProgressPercent(usage: BillingUsageResponse): number {
  if (usage.limit === null || usage.limit <= 0) return 0;
  return Math.min(100, (usage.used / usage.limit) * 100);
}

export function usageBarColor(level: UsageWarningLevel): string {
  switch (level) {
    case 'exceeded':
      return 'bg-red-500';
    case 'critical':
      return 'bg-amber-500';
    case 'low':
      return 'bg-amber-400';
    default:
      return 'bg-[#1D9E75]';
  }
}
