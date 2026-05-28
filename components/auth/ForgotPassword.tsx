'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const Logo = () => (
  <div className="flex items-center justify-center gap-2.5 mb-8">
    <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center flex-shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M3 7l9-4 9 4" /></svg>
    </div>
    <span className="text-[15px] font-medium text-[#111]">Construction<span className="text-[#1D9E75]">AI</span><span className="text-[#999]">.chat</span></span>
  </div>
);

const ForgotPassword = () => {
  const [email, setEmail]       = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState('');
  const [sent, setSent]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.toLowerCase().trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setSent(true);
    } catch { setError('Network error. Please try again.'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Logo />
        <div className="bg-white border border-black/[0.09] rounded-xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-[#E1F5EE] rounded-full flex items-center justify-center mx-auto mb-5"><CheckCircle2 className="w-7 h-7 text-[#1D9E75]" /></div>
              <h2 className="text-xl font-medium text-[#111] mb-2">Check your inbox</h2>
              <p className="text-sm text-[#555] mb-1">We sent a password reset link to</p>
              <p className="text-sm font-medium text-[#111] mb-5">{email}</p>
              <p className="text-xs text-[#999] mb-7">The link expires in 1 hour. Check your spam folder if you don't see it.</p>
              <button onClick={() => { setSent(false); setEmail(''); }} className="text-sm text-[#1D9E75] hover:text-[#0F6E56] font-medium transition-colors">Try a different email</button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <div className="w-12 h-12 bg-[#E1F5EE] rounded-xl flex items-center justify-center mx-auto mb-4"><Mail className="w-6 h-6 text-[#1D9E75]" /></div>
                <h2 className="text-2xl font-medium text-[#111] text-center mb-1.5 tracking-tight">Forgot password?</h2>
                <p className="text-sm text-[#555] text-center">Enter your email and we'll send you a reset link.</p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#555] mb-1.5">Email address</label>
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    className="w-full px-4 py-3 bg-[#f7f7f5] border border-black/[0.09] rounded-lg text-sm text-[#111] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] focus:border-[#1D9E75] transition-all" autoFocus required />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                  {isLoading ? (<><svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Sending…</>) : 'Send reset link'}
                </button>
              </form>
              <div className="mt-6 pt-5 border-t border-black/[0.07]">
                <Link href="/" className="flex items-center justify-center gap-1.5 text-sm text-[#555] hover:text-[#111] transition-colors"><ArrowLeft className="w-4 h-4" />Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default ForgotPassword;
