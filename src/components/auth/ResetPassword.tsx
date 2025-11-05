// components/auth/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase  from '../../supaBase/supabaseClient';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Verify that user has a valid password recovery session
    // With PKCE flow, Supabase processes the token and creates a session automatically
    const verifySession = async () => {
      // Small delay to allow Supabase to process the token from URL
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setError('Failed to verify reset session. Please request a new password reset link.');
        return;
      }

      // Only show error if no session exists after giving time for token processing
      if (!session) {
        setError('No active reset session found. Please click the reset link from your email.');
      } else {
        // Clean up the URL by removing tokens from hash for security
        // This prevents the access token from being visible in the URL
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    verifySession();
  }, [location]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
        return;
      }
      setMessage('Password updated successfully! You can now log in with your new password.');
      setTimeout(() => navigate('/'), 2000); // Redirect to login after 2 seconds
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Reset Password
        </h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm animate-fade-in">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm animate-fade-in">
            {message}
          </div>
        )}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password (minimum 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition"
          >
            Update Password
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Back to{' '}
          <Link to="/" className="text-primary underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;