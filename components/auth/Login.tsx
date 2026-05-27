'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthForm from './AuthForm';
import { authApi, setToken, setUser, isAuthenticated } from '@/services/apiClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { if (isAuthenticated()) router.replace('/dashboard'); }, [router]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); } }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setIsLoading(true);
    try {
      const data = await authApi.login(email, password) as any;
      setToken(data.token);
      setUser(data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      setIsLoading(false);
    }
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
            <h2 className="text-2xl font-medium text-[#111] text-center mb-1.5 tracking-tight">Welcome back</h2>
            <p className="text-sm text-[#555] text-center">Sign in to continue to your account</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-start space-x-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              <span>{error}</span>
            </div>
          )}
          <AuthForm email={email} setEmail={setEmail} password={password} setPassword={setPassword} onSubmit={handleLogin} buttonText="Sign in" showCaptcha={false} isLoading={isLoading} />
          <div className="mt-6 pt-5 border-t border-black/[0.07]">
            <p className="text-center text-sm text-[#555]">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-[#1D9E75] hover:text-[#0F6E56] transition-colors">Sign up for free</Link>
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-[#999] mt-5">
          By signing in, you agree to our{' '}
          <a href="#" className="text-[#1D9E75] hover:text-[#0F6E56] underline">Terms</a>{' '}and{' '}
          <a href="#" className="text-[#1D9E75] hover:text-[#0F6E56] underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
