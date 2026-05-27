'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { getToken, removeToken, removeUser } from '@/services/apiClient';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (message) { const t = setTimeout(() => setMessage(null), 5000); return () => clearTimeout(t); } }, [message]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setMessage(null);
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    try {
      const token = getToken();
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ newPassword }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update password.'); return; }
      setMessage('Password updated! Please log in again.');
      removeToken(); removeUser();
      setTimeout(() => router.push('/'), 2000);
    } catch { setError('An unexpected error occurred.'); }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M3 7l9-4 9 4" />
            </svg>
          </div>
          <span className="text-[15px] font-medium text-[#111]">
            Construction<span className="text-[#1D9E75]">AI</span><span className="text-[#999]">.chat</span>
          </span>
        </div>

        <div className="bg-white border border-black/[0.09] rounded-xl p-8 shadow-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-medium text-[#111] text-center mb-1.5 tracking-tight">Reset password</h2>
            <p className="text-sm text-[#555] text-center">Enter your new password below</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          {message && <div className="bg-[#E1F5EE] border border-[#5DCAA5]/40 text-[#0F6E56] p-3 rounded-lg mb-4 text-sm">{message}</div>}
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Enter new password (minimum 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className="w-full px-4 py-3 pr-11 bg-[#f7f7f5] border border-black/[0.09] rounded-lg text-[#111] placeholder-[#999] text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#E1F5EE] transition-colors" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555] focus:outline-none p-1 rounded-md hover:bg-black/[0.04] transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button type="submit" className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white py-3 rounded-lg font-medium text-sm transition-colors duration-150">Update password</button>
          </form>
          <p className="mt-5 text-center text-sm text-[#555]">Back to <Link href="/" className="text-[#1D9E75] hover:text-[#0F6E56] font-medium transition-colors">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
