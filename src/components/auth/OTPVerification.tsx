import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase from '../../supaBase/supabaseClient';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from location state (passed from registration)
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      setError('Email not found. Please register again.');
      setTimeout(() => navigate('/register'), 3000);
    }
  }, [email, navigate]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup'
      });

      if (error) {
        console.error('OTP verification error:', error.message);
        setError(error.message);
        setIsLoading(false);
        return;
      }

      console.log('OTP verification successful:', data);
      setMessage('Email verified successfully! Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError(null);
    setMessage(null);
    setIsResending(true);

    try {
      console.log('📧 Resending OTP for email:', email);

      // Try multiple approaches for local Supabase
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      console.log('📧 Resend response:', { data, error });

      if (error) {
        console.error('❌ Resend OTP error:', error.message);
        // Check if it's a configuration issue
        if (error.message.includes('email') || error.message.includes('smtp') || error.message.includes('template')) {
          setError('Email service not configured in local Supabase. Check Supabase dashboard settings.');
        } else {
          setError(`Failed to resend OTP: ${error.message}`);
        }
        setIsResending(false);
        return;
      }

      setMessage('✅ OTP resent successfully! Check your email (including spam folder).');
      setOtp(['', '', '', '', '', '']); // Clear previous OTP
      inputRefs.current[0]?.focus(); // Focus first input
      setIsResending(false);
    } catch (err: any) {
      console.error('💥 Unexpected error:', err);
      setError('Failed to resend OTP. Please check your local Supabase email configuration.');
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-600 text-sm">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-blue-600 font-medium">{email}</p>
        </div>

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

        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <div className="flex justify-center space-x-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                disabled={isLoading}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              isLoading || otp.join('').length !== 6
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
            } text-white`}
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-2">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResendOTP}
            disabled={isResending}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:text-gray-400"
          >
            {isResending ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/register')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back to Registration
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;