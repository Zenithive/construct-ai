'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

const Logo = () => (
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
);

const validatePassword = (v: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/.test(v);

// Inner component that uses useSearchParams (must be wrapped in Suspense)
const ResetPasswordInner = () => {
  const searchParams  = useSearchParams();
  const token         = searchParams.get('token');
  const router        = useRouter();

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConf, setShowConf]       = useState(false);
  const [isLoading, setLoading]       = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);
  const [passError, setPassError]     = useState('');
  const [confError, setConfError]     = useState('');

  const inputClass = (hasErr: boolean) =>
    `w-full px-4 py-3 pr-11 bg-[#f7f7f5] border ${hasErr ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-black/[0.09] focus:border-[#1D9E75] focus:ring-[#E1F5EE]'} rounded-lg text-[#111] placeholder-[#999] text-sm focus:outline-none focus:ring-2 transition-all duration-150`;

  // No token in URL — show invalid link screen
  if (!token) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-xl font-medium text-[#111] mb-2">Invalid reset link</h2>
        <p className="text-sm text-[#555] mb-6">
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-medium rounded-lg transition-colors"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setPassError(''); setConfError('');

    let hasErr = false;
    if (!validatePassword(password)) {
      setPassError('Must have uppercase, lowercase, number & special character (min 6 chars)');
      hasErr = true;
    }
    if (password !== confirm) {
      setConfError('Passwords do not match.');
      hasErr = true;
    }
    if (hasErr) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password.'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/'), 2500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-[#E1F5EE] rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-7 h-7 text-[#1D9E75]" />
        </div>
        <h2 className="text-xl font-medium text-[#111] mb-2">Password updated</h2>
        <p className="text-sm text-[#555] mb-1">Your password has been reset successfully.</p>
        <p className="text-xs text-[#999]">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <h2 className="text-2xl font-medium text-[#111] text-center mb-1.5 tracking-tight">
          Set new password
        </h2>
        <p className="text-sm text-[#555] text-center">
          Choose a strong password for your account.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div>
          <label className="block text-xs font-medium text-[#555] mb-1.5">New password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Enter new password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPassError(''); }}
              className={inputClass(!!passError)}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555] p-1 rounded-lg hover:bg-black/[0.04] transition-colors"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passError && <p className="text-red-500 text-xs mt-1.5 ml-0.5">{passError}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-medium text-[#555] mb-1.5">Confirm password</label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setConfError(''); }}
              className={inputClass(!!confError)}
            />
            <button
              type="button"
              onClick={() => setShowConf(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555] p-1 rounded-lg hover:bg-black/[0.04] transition-colors"
              aria-label={showConf ? 'Hide password' : 'Show password'}
            >
              {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confError && <p className="text-red-500 text-xs mt-1.5 ml-0.5">{confError}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Updating…
            </>
          ) : 'Update password'}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-black/[0.07]">
        <p className="text-center text-sm text-[#555]">
          Back to{' '}
          <Link href="/" className="font-medium text-[#1D9E75] hover:text-[#0F6E56] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
};

// Outer component wraps inner in Suspense (required for useSearchParams in Next.js 14)
const ResetPassword = () => (
  <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center p-4">
    <div className="w-full max-w-md">
      <Logo />
      <div className="bg-white border border-black/[0.09] rounded-xl p-8 shadow-sm">
        <Suspense fallback={
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/[0.09] border-t-[#1D9E75]" />
          </div>
        }>
          <ResetPasswordInner />
        </Suspense>
      </div>
    </div>
  </div>
);

export default ResetPassword;
