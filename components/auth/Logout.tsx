'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, removeToken, removeUser } from '@/services/apiClient';

const Logout = () => {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      try { await authApi.logout(); } catch {}
      removeToken(); removeUser();
      router.replace('/');
    };
    signOut();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  );
};

export default Logout;
