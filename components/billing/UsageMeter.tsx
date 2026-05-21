'use client';

import { useRouter } from 'next/navigation';
import { useBillingUsage } from '@/hooks/useBillingUsage';
import {
  getUsageWarningMessage,
  usageBarColor,
  usageProgressPercent,
} from '@/components/billing/usage-utils';

type UsageMeterProps = {
  isOpen: boolean;
  refreshKey?: number;
};

export default function UsageMeter({
  isOpen,
  refreshKey = 0,
}: UsageMeterProps) {
  const router = useRouter();
  const { usage, error, warningLevel, isUnlimited } = useBillingUsage(refreshKey);

  if (!isOpen || error || !usage) return null;

  const used = usage.used;
  const limit = usage.limit ?? 0;
  const remaining = usage.remaining ?? 0;
  const pct = usageProgressPercent(usage);
  const warning = getUsageWarningMessage(usage);
  const showUpgrade =
    !isUnlimited &&
    (warningLevel !== 'none' || usage.plan.code === 'free');

  return (
    <div className="mx-2 mb-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm">
      {isUnlimited ? (
        <p className="text-xs font-medium text-[#555]">
          {usage.plan.name} · Unlimited messages
        </p>
      ) : (
        <>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#555]">
              {used} / {limit} {usage.plan.name} messages
            </p>
            <span
              className={`shrink-0 text-[10px] font-semibold ${
                warningLevel === 'exceeded' || warningLevel === 'critical'
                  ? 'text-amber-700'
                  : 'text-[#999]'
              }`}
            >
              {remaining} left
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E8F5F0]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${usageBarColor(warningLevel)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {warning && warningLevel !== 'exceeded' && (
            <p className="mt-1.5 text-[10px] text-amber-700">{warning}</p>
          )}
        </>
      )}
      {showUpgrade && (
        <button
          type="button"
          onClick={() => router.push('/pricing')}
          className="mt-2 w-full rounded-md bg-[#1D9E75] py-1.5 text-xs font-semibold text-white hover:bg-[#0F6E56]"
        >
          Upgrade plan
        </button>
      )}
    </div>
  );
}
