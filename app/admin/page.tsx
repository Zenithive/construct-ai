'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { getToken } from '@/services/apiClient';
import AdminDashboard from '@/components/admin/AdminDashboard';

type AuthState = 'loading' | 'authorized' | 'forbidden' | 'unauthenticated';

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthState('unauthenticated'); return; }

    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.ok)               setAuthState('authorized');
        else if (res.status === 403) setAuthState('forbidden');
        else if (res.status === 401) setAuthState('unauthenticated');
        else                      setAuthState('forbidden');
      })
      .catch(() => setAuthState('forbidden'));
  }, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#1D9E75]" />
          </div>
          <p className="text-sm text-[#999]">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    if (typeof window !== 'undefined') window.location.href = '/';
    return null;
  }

  if (authState === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="bg-white border border-black/[0.09] rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-base font-semibold text-[#111] mb-2">Access Denied</h1>
          <p className="text-sm text-[#999] mb-6">
            Your account does not have admin privileges.
          </p>
          <a href="/dashboard" className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-medium rounded-lg transition-colors">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}
