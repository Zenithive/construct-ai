/*
import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

interface AuthFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  firstName?: string;
  setFirstName?: (name: string) => void;
  lastName?: string;
  setLastName?: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  buttonText: string;
  showNameFields?: boolean;
  showCaptcha?: boolean; // show Google reCAPTCHA only for signup
}

const AuthForm: React.FC<AuthFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  onSubmit,
  buttonText,
  showNameFields = false,
  showCaptcha = false,
}) => {
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState("");

  // Validation functions
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password: string) => {
    const re =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
    return re.test(password);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setEmail(value);
    setEmailError(validateEmail(value) ? "" : "Invalid email address");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!validateEmail(email)) {
      setEmailError("Invalid email format");
      hasError = true;
    } else setEmailError("");

    if (!validatePassword(password)) {
      setPasswordError(
        "Password must contain capital & small letters, number, special char"
      );
      hasError = true;
    } else setPasswordError("");

    if (showNameFields) {
      if (!firstName?.trim()) {
        setFirstNameError("First name is required");
        hasError = true;
      } else setFirstNameError("");

      if (!lastName?.trim()) {
        setLastNameError("Last name is required");
        hasError = true;
      } else setLastNameError("");
    }

    if (showCaptcha && !captchaValue) {
      setCaptchaError("Please verify that you are not a robot");
      hasError = true;
    } else {
      setCaptchaError("");
    }

    if (!hasError) onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showNameFields && (
        <>
          <div>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName?.(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
            {firstNameError && (
              <p className="text-red-500 text-sm mt-1">{firstNameError}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName?.(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
            {lastNameError && (
              <p className="text-red-500 text-sm mt-1">{lastNameError}</p>
            )}
          </div>
        </>
      )}

      <div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={handleEmailChange}
          className={`w-full px-4 py-2 border rounded-md ${
            emailError ? "border-red-500" : ""
          }`}
        />
        {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
      </div>

      <div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full px-4 py-2 border rounded-md ${
            passwordError ? "border-red-500" : ""
          }`}
        />
        {passwordError && (
          <p className="text-red-500 text-sm mt-1">{passwordError}</p>
        )}
      </div>

      {showCaptcha && (
        <div className="flex flex-col items-center">
          <ReCAPTCHA
            sitekey="6Ld9UQssAAAAANQ8NR4XY4z0K0QouhJL0CRD2Q1z" // Replace with your Google site key
            onChange={(value) => setCaptchaValue(value)}
          />
          {captchaError && (
            <p className="text-red-500 text-sm mt-1">{captchaError}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition"
      >
        {buttonText}
      </button>
    </form>
  );
};

export default AuthForm;
*/



import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

interface AuthFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  firstName?: string;
  setFirstName?: (name: string) => void;
  lastName?: string;
  setLastName?: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  buttonText: string;
  showNameFields?: boolean;
  showCaptcha?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  onSubmit,
  buttonText,
  showNameFields = false,
  showCaptcha = false,
}) => {
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState("");

  // ✅ Validation patterns
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/.test(
      password
    );

  // ✅ Email live validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setEmail(value);
    if (value === "") setEmailError("");
    else setEmailError(validateEmail(value) ? "" : "Invalid email address");
  };

  // ✅ Password live validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value === "") setPasswordError("");
    else
      setPasswordError(
        validatePassword(value)
          ? ""
          : "Password must contain capital & small letters, number, special char"
      );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    // Email check
    if (!validateEmail(email)) {
      setEmailError("Invalid email format");
      hasError = true;
    } else setEmailError("");

    // Password check
    if (!validatePassword(password)) {
      setPasswordError(
        "Password must contain capital & small letters, number, special char"
      );
      hasError = true;
    } else setPasswordError("");

    // Name field checks
    if (showNameFields) {
      if (!firstName?.trim()) {
        setFirstNameError("First name is required");
        hasError = true;
      } else setFirstNameError("");

      if (!lastName?.trim()) {
        setLastNameError("Last name is required");
        hasError = true;
      } else setLastNameError("");
    }

    // reCAPTCHA check
    if (showCaptcha && !captchaValue) {
      setCaptchaError("Please verify that you are not a robot");
      hasError = true;
    } else {
      setCaptchaError("");
    }

    if (!hasError) onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showNameFields && (
        <>
          <div>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName?.(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
            {firstNameError && (
              <p className="text-red-500 text-sm mt-1">{firstNameError}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName?.(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
            {lastNameError && (
              <p className="text-red-500 text-sm mt-1">{lastNameError}</p>
            )}
          </div>
        </>
      )}

      <div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={handleEmailChange}
          className={`w-full px-4 py-2 border rounded-md ${
            emailError ? "border-red-500" : ""
          }`}
        />
        {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
      </div>

      <div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
          className={`w-full px-4 py-2 border rounded-md ${
            passwordError ? "border-red-500" : ""
          }`}
        />
        {passwordError && (
          <p className="text-red-500 text-sm mt-1">{passwordError}</p>
        )}
      </div>

      {showCaptcha && (
        <div className="flex flex-col items-end">
          <div className="transform scale-[0.82] translate-x-1 origin-right height-5">
          <ReCAPTCHA
            sitekey="6Ld9UQssAAAAANQ8NR4XY4z0K0QouhJL0CRD2Q1z" 
            onChange={(value) => setCaptchaValue(value)}
          />
          </div>
          {captchaError && (
            <p className="text-red-500 text-sm mt-1 self-end">{captchaError}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition"
      >
        {buttonText}
      </button>
    </form>
  );
};

export default AuthForm;
