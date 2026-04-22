'use client';

import React, { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

interface AuthFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  firstName?: string;
  setFirstName?: (name: string) => void;
  lastName?: string;
  setLastName?: (name: string) => void;
  onSubmit: (e: React.FormEvent, recaptchaToken?: string | null) => void;
  buttonText: string;
  showNameFields?: boolean;
  showCaptcha?: boolean;
  isLoading?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({
  email, setEmail, password, setPassword,
  firstName, setFirstName, lastName, setLastName,
  onSubmit, buttonText, showNameFields = false,
  showCaptcha = false, isLoading = false,
}) => {
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePassword = (v: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/.test(v);

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 bg-gray-50 border-2 ${hasError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'} rounded-xl text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-4 ${hasError ? 'focus:ring-red-100' : 'focus:ring-blue-100'} transition-all duration-200`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!validateEmail(email)) { setEmailError('Invalid email format'); hasError = true; } else setEmailError('');
    if (!validatePassword(password)) { setPasswordError('Must have uppercase, lowercase, number & special character'); hasError = true; } else setPasswordError('');

    if (showNameFields) {
      if (!firstName?.trim()) { setFirstNameError('First name is required'); hasError = true; } else setFirstNameError('');
      if (!lastName?.trim()) { setLastNameError('Last name is required'); hasError = true; } else setLastNameError('');
    }

    let recaptchaToken: string | null = null;
    if (showCaptcha) {
      recaptchaToken = recaptchaRef.current?.getValue() || null;
      if (!recaptchaToken) { setRecaptchaError('Please complete the reCAPTCHA'); hasError = true; } else setRecaptchaError('');
    }

    if (!hasError) {
      onSubmit(e, recaptchaToken);
      if (showCaptcha) recaptchaRef.current?.reset();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showNameFields && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input type="text" placeholder="First name" value={firstName} onChange={e => { setFirstName?.(e.target.value); if (firstNameError && e.target.value.trim()) setFirstNameError(''); }} className={inputClass(!!firstNameError)} />
            {firstNameError && <p className="text-red-500 text-xs mt-1.5 ml-1">{firstNameError}</p>}
          </div>
          <div>
            <input type="text" placeholder="Last name" value={lastName} onChange={e => { setLastName?.(e.target.value); if (lastNameError && e.target.value.trim()) setLastNameError(''); }} className={inputClass(!!lastNameError)} />
            {lastNameError && <p className="text-red-500 text-xs mt-1.5 ml-1">{lastNameError}</p>}
          </div>
        </div>
      )}
      <div>
        <input type="email" placeholder="Email address" value={email} onChange={e => { setEmail(e.target.value.toLowerCase()); setEmailError(validateEmail(e.target.value) ? '' : 'Invalid email address'); }} className={inputClass(!!emailError)} />
        {emailError && <p className="text-red-500 text-xs mt-1.5 ml-1">{emailError}</p>}
      </div>
      <div>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); if (passwordError && validatePassword(e.target.value)) setPasswordError(''); }} className={inputClass(!!passwordError) + ' pr-11'} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {passwordError && <p className="text-red-500 text-xs mt-1.5 ml-1">{passwordError}</p>}
      </div>
      {showCaptcha && (
        <div className="flex flex-col items-start pt-2">
          <ReCAPTCHA ref={recaptchaRef} sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''} onChange={() => setRecaptchaError('')} />
          {recaptchaError && <p className="text-red-500 text-xs mt-1.5 ml-1">{recaptchaError}</p>}
        </div>
      )}
      <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6">
        {isLoading ? (<><svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Processing...</>) : buttonText}
      </button>
    </form>
  );
};

export default AuthForm;
