// components/auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import supabase  from '../../supaBase/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

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

  const handleLogin = async (e: React.FormEvent, recaptchaToken?: string | null) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      // Note: recaptchaToken will be null for login since showCaptcha=false
      // You can enable it later if needed by setting showCaptcha={true} in the AuthForm

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message === 'Email not confirmed') {
          setError('Please confirm your email address to log in. Check your inbox or spam folder.');
        } else {
          setError(error.message);
        }
        setIsLoading(false);
        return;
      }

      setMessage('Login successful!');
      setIsLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setMessage('Confirmation email resent! Check your inbox or spam folder.');
    } catch (err: any) {
      setError('Failed to resend confirmation email. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setMessage('Password reset email sent! Check your inbox or spam folder.');
    } catch (err: any) {
      setError('Failed to send password reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login
        </h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm animate-fade-in">
            {error}
            {error === 'Please confirm your email address to log in. Check your inbox or spam folder.' && (
              <button
                onClick={handleResendConfirmation}
                className="ml-2 text-blue-600 underline"
              >
                Resend Confirmation Email
              </button>
            )}
          </div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm animate-fade-in">
            {message}
          </div>
        )}
        <AuthForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onSubmit={handleLogin}
          buttonText="Login"
          showCaptcha={false} // captcha hidden
          isLoading={isLoading}
        />
        <p className="mt-4 text-center text-sm text-gray-600">
          Forgot your password?{' '}
          <button
            onClick={handleForgotPassword}
            className="text-primary underline"
          >
            Forgot Password
          </button>
        </p>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link to="/register" className="text-primary underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;