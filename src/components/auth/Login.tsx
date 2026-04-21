// components/auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import { authApi, setToken, setUser, isAuthenticated } from '../../api/apiClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleLogin = async (e: React.FormEvent, recaptchaToken?: string | null) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const data = await authApi.login(email, password);
      setToken(data.token);
      setUser(data.user);
      setMessage('Login successful!');
      setIsLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
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
          showCaptcha={false}
          isLoading={isLoading}
        />
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
