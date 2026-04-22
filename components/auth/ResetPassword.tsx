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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Password</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{message}</div>}
        <form onSubmit={handleReset} className="space-y-4">
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="Enter new password (minimum 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">Update Password</button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">Back to <Link href="/" className="text-blue-600 underline">Login</Link></p>
      </div>
    </div>
  );
};

export default ResetPassword;
