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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
          <p className="text-gray-600 text-sm">We&apos;ve sent a 6-digit code to</p>
          <p className="text-blue-600 font-medium">{email}</p>
        </div>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{message}</div>}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center space-x-2">
            {otp.map((digit, index) => (
              <input key={index} ref={el => { if (el) inputRefs.current[index] = el; }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1} value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleKeyDown(index, e)} onPaste={handlePaste} className="w-12 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors" disabled={isLoading} />
            ))}
          </div>
          <button type="submit" disabled={isLoading || otp.join('').length !== 6} className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isLoading || otp.join('').length !== 6 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-2">Didn&apos;t receive the code?</p>
          <button onClick={handleResend} disabled={isResending} className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:text-gray-400">
            {isResending ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>
        <div className="mt-4 text-center">
          <button onClick={() => router.push('/register')} className="text-gray-500 hover:text-gray-700 text-sm">← Back to Registration</button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
