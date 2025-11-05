// components/auth/Logout.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supaBase/supabaseClient';

const Logout = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const signOut = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          setError(error.message);
          return;
        }
        setMessage('Logged out successfully!');
        // Redirect to login after a short delay
        setTimeout(() => navigate('/login'), 1000);
      } catch (err: any) {
        setError('Something went wrong while logging out.');
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
