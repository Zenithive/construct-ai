'use client';

import { useCallback, useEffect, useState } from 'react';
import { billingApi, type BillingUsageResponse } from '@/services/apiClient';
import { getUsageWarningLevel } from '@/components/billing/usage-utils';

export function useBillingUsage(refreshKey = 0) {
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await billingApi.getUsage();
      setUsage(data);
    } catch {
      setError(true);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const warningLevel = getUsageWarningLevel(usage);
  const isAtLimit =
    usage != null && usage.limit !== null && (usage.remaining ?? 0) <= 0;
  const isUnlimited = usage?.limit === null;

  return {
    usage,
    loading,
    error,
    reload,
    warningLevel,
    isAtLimit,
    isUnlimited,
  };
}
