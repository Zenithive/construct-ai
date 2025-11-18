import React, { useState, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  onSubmit: (e: React.FormEvent, recaptchaToken?: string | null) => void;
  buttonText: string;
  showNameFields?: boolean;
  showCaptcha?: boolean; // show captcha only for signup
  isLoading?: boolean;
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
  isLoading = false,
}) => {
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [recaptchaError, setRecaptchaError] = useState("");

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    // Clear error if password becomes valid
    if (passwordError && validatePassword(value)) {
      setPasswordError("");
    }
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFirstName?.(value);
    // Clear error if first name becomes valid
    if (firstNameError && value.trim()) {
      setFirstNameError("");
    }
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLastName?.(value);
    // Clear error if last name becomes valid
    if (lastNameError && value.trim()) {
      setLastNameError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Validate ReCAPTCHA if enabled
    let recaptchaToken: string | null = null;
    if (showCaptcha) {
      recaptchaToken = recaptchaRef.current?.getValue() || null;
      if (!recaptchaToken) {
        setRecaptchaError("Please complete the reCAPTCHA");
        hasError = true;
      } else {
        setRecaptchaError("");
      }
    }

    if (!hasError) {
      onSubmit(e, recaptchaToken);
      // Reset reCAPTCHA after submission
      if (showCaptcha) {
        recaptchaRef.current?.reset();
      }
    }
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
              onChange={handleFirstNameChange}
              className={`w-full px-4 py-2 border rounded-md ${
                firstNameError ? "border-red-500" : ""
              }`}
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
              onChange={handleLastNameChange}
              className={`w-full px-4 py-2 border rounded-md ${
                lastNameError ? "border-red-500" : ""
              }`}
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
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
            className={`w-full px-4 py-2 pr-10 border rounded-md ${
              passwordError ? "border-red-500" : ""
            }`}
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
        {passwordError && (
          <p className="text-red-500 text-sm mt-1">{passwordError}</p>
        )}
      </div>

      {/* Google ReCAPTCHA only if showCaptcha=true */}
      {showCaptcha && (
        <div className="flex flex-col items-center">
              <ReCAPTCHA
                className=""
                ref={recaptchaRef}
                sitekey="6Ld9UQssAAAAANQ8NR4XY4z0K0QouhJL0CRD2Q1z"
                onChange={() => setRecaptchaError("")}
                />
          {recaptchaError && (
            <p className="text-red-500 text-sm mt-2">{recaptchaError}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </>
        ) : (
          buttonText
        )}
      </button>
    </form>
  );
};

export default AuthForm;
