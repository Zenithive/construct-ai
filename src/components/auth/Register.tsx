// pages/RegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import supabase from '../../supaBase/supabaseClient';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

  const handleSignUp = async (e: React.FormEvent, recaptchaToken?: string | null) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Verify recaptcha token is present
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification.');
      return;
    }

    setIsLoading(true);

    try {
      // You can verify the recaptcha token on your backend here
      // For now, we'll proceed with signup if token exists

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { firstName, lastName, recaptchaToken },
        },
      });

      if (error) {
        setIsLoading(false);
        throw error;
      }

      setMessage('Signup successful! Redirecting to OTP verification...');
      setIsLoading(false);
      setTimeout(() => navigate('/verify-otp', { state: { email, firstName, lastName } }), 1500);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Sign Up
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
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          onSubmit={handleSignUp}
          buttonText="Sign Up"
          showNameFields={true}
          showCaptcha={true} // captcha visible here
          isLoading={isLoading}
        />

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/" className="text-primary underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
