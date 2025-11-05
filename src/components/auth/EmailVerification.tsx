import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import supabase from '../../supaBase/supabaseClient';

const EmailVerification = () => {
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from location state (passed from registration)
  const email = location.state?.email || '';

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

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address not found. Please register again.');
      return;
    }

    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Verification email sent! Please check your inbox and spam folder.');
      }
    } catch (err: any) {
      setError('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleManualVerify = () => {
    navigate('/verify-otp', { state: { email } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Check Your Email
          </h2>
          <p className="text-gray-600 text-sm mb-2">
            We've sent a verification link to:
          </p>
          <p className="text-blue-600 font-medium break-all">{email}</p>
          <p className="text-gray-500 text-xs mt-2">
            Click the link in the email to verify your account
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              isResending
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <button
            onClick={handleManualVerify}
            className="w-full py-3 px-4 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
          >
            Enter Verification Code Manually
          </button>

          <div className="text-center pt-4 border-t">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Registration
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Didn't receive the email?</p>
          <ul className="mt-2 space-y-1">
            <li>• Check your spam/junk folder</li>
            <li>• Make sure {email} is correct</li>
            <li>• Wait a few minutes and try again</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;