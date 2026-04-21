// components/auth/Logout.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, removeToken, removeUser } from '../../api/apiClient';

const Logout = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const signOut = async () => {
      try {
        // Call backend logout (optional — JWT is stateless)
        await authApi.logout().catch(() => {}); // ignore errors, still clear local state
      } finally {
        // Always clear local token and user regardless of API response
        removeToken();
        removeUser();
        setMessage('Logged out successfully!');
        setTimeout(() => navigate('/'), 1000);
      }
    };
    signOut();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}
        {!error && !message && <p>Logging out...</p>}
      </div>
    </div>
  );
};

export default Logout;
