'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthForm from './AuthForm';
import { authApi, setToken, setUser } from '@/services/apiClient';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (message) { const t = setTimeout(() => setMessage(null), 5000); return () => clearTimeout(t); } }, [message]);

  const handleSignUp = async (e: React.FormEvent, recaptchaToken?: string | null) => {
    e.preventDefault();
    setError(null); setMessage(null);
    if (!recaptchaToken) { setError('Please complete the reCAPTCHA verification.'); return; }
    setIsLoading(true);
    try {
      const data = await authApi.register(email, password, firstName, lastName) as any;
      setToken(data.token);
      setUser(data.user);
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      // Send OTP
      try { await fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); } catch {}
      setMessage('Account created! Redirecting to verification...');
      setIsLoading(false);
      setTimeout(() => router.push(`/verify-otp?email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`), 1500);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#fafaf8]">
    <div className="flex min-h-full flex-col items-center justify-center p-4 py-8">
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
            <h2 className="text-2xl font-medium text-[#111] text-center mb-1.5 tracking-tight">Create an account</h2>
            <p className="text-sm text-[#555] text-center">Start your free account today</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          {message && <div className="bg-[#E1F5EE] border border-[#5DCAA5]/40 text-[#0F6E56] px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>}
          <AuthForm email={email} setEmail={setEmail} password={password} setPassword={setPassword} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} onSubmit={handleSignUp} buttonText="Create account" showNameFields showCaptcha isLoading={isLoading} />
          <div className="mt-6 pt-5 border-t border-black/[0.07]">
            <p className="text-center text-sm text-[#555]">
              Already have an account?{' '}
              <Link href="/" className="font-medium text-[#1D9E75] hover:text-[#0F6E56] transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Register;
