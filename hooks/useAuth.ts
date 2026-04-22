/**
 * hooks/useAuth.ts
 * Simple hook to read the current user from localStorage.
 */
'use client';

import { useState, useEffect } from 'react';
import { getUser, isAuthenticated } from '@/services/apiClient';

export function useAuth() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setUser(getUser());
  }, []);

  return { user, authenticated };
}
