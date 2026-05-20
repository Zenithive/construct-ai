'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = searchParams?.get('email') || '';
  const firstName = searchParams?.get('firstName') || '';

  useEffect(() => { if (!email) { setError('Email not found. Please register again.'); setTimeout(() => router.push('/register'), 3000); } }, [email, router]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (message) { const t = setTimeout(() => setMessage(null), 5000); return () => clearTimeout(t); } }, [message]);

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) { const n = [...otp]; n[index] = ''; setOtp(n); return; }
    const n = [...otp]; n[index] = cleaned[0]; setOtp(n);
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const n = [...otp]; pasted.split('').forEach((c, i) => { n[i] = c; }); setOtp(n);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setMessage(null); setIsLoading(true);
    const otpCode = otp.join('');
    if (otpCode.length !== 6) { setError('Please enter the complete 6-digit OTP.'); setIsLoading(false); return; }
    try {
      const res = await fetch('/api/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp: otpCode }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed.'); setIsLoading(false); return; }
      setMessage('Email verified! Redirecting to dashboard...');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch { setError('An unexpected error occurred.'); setIsLoading(false); }
  };

  const handleResend = async () => {
    setError(null); setMessage(null); setIsResending(true);
    try {
      const res = await fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to resend OTP.'); setIsResending(false); return; }
      setMessage('OTP resent! Check your email.'); setOtp(['', '', '', '', '', '']); inputRefs.current[0]?.focus();
    } catch { setError('Failed to resend OTP.'); } finally { setIsResending(false); }
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
          <div className="text-center mb-6">
            <h2 className="text-2xl font-medium text-[#111] mb-1.5 tracking-tight">Verify your email</h2>
            <p className="text-[#555] text-sm">We&apos;ve sent a 6-digit code to</p>
            <p className="text-[#1D9E75] font-medium text-sm mt-0.5">{email}</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          {message && <div className="bg-[#E1F5EE] border border-[#5DCAA5]/40 text-[#0F6E56] p-3 rounded-lg mb-4 text-sm">{message}</div>}
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center space-x-2">
              {otp.map((digit, index) => (
                <input key={index} ref={el => { if (el) inputRefs.current[index] = el; }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1} value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleKeyDown(index, e)} onPaste={handlePaste} className="w-12 h-12 text-center text-lg font-medium text-[#111] border border-black/[0.09] rounded-lg focus:border-[#1D9E75] focus:ring-2 focus:ring-[#E1F5EE] focus:outline-none bg-[#f7f7f5] transition-colors" disabled={isLoading} />
              ))}
            </div>
            <button type="submit" disabled={isLoading || otp.join('').length !== 6} className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-150 ${isLoading || otp.join('').length !== 6 ? 'bg-[#f0f0ec] text-[#999] cursor-not-allowed' : 'bg-[#1D9E75] hover:bg-[#0F6E56] text-white'}`}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-[#555] text-sm mb-2">Didn&apos;t receive the code?</p>
            <button onClick={handleResend} disabled={isResending} className="text-[#1D9E75] hover:text-[#0F6E56] font-medium text-sm disabled:text-[#999] transition-colors">
              {isResending ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => router.push('/register')} className="text-[#999] hover:text-[#555] text-sm transition-colors">← Back to Registration</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
