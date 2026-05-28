'use client';

import { useState, useEffect, useCallback } from 'react';
import { billingApi, type BillingUsageResponse } from '@/services/apiClient';

export function useBillingUsage(refreshKey = 0) {
  const [usage, setUsage]       = useState<BillingUsageResponse | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billingApi.getUsage();
      setUsage(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load usage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);

  return { usage, isLoading, error, refresh: fetch };
}
