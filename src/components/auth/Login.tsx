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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Login error:', error.message);
        if (error.message === 'Email not confirmed') {
          setError('Please confirm your email address to log in. Check your inbox or spam folder.');
        } else {
          setError(error.message);
        }
        return;
      }

      console.log('Login successful:', data.user);
      setMessage('Login successful!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleResendConfirmation = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        console.error('Resend confirmation error:', error.message);
        setError(error.message);
        return;
      }
      setMessage('Confirmation email resent! Check your inbox or spam folder.');
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Failed to resend confirmation email. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/reset-password',
      });
      if (error) {
        console.error('Password reset error:', error.message);
        setError(error.message);
        return;
      }
      setMessage('Password reset email sent! Check your inbox or spam folder.');
    } catch (err: any) {
      console.error('Unexpected error:', err);
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