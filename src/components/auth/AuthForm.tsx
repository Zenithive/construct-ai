import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  showCaptcha?: boolean; // show captcha only for signup
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
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState("");
  const [userInput, setUserInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password: string) => {
    const re =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
    return re.test(password);
  };

  // generate captcha
  const generateCaptcha = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(code);
    setUserInput("");
    setCaptchaError("");
  };

  useEffect(() => {
    if (showCaptcha) generateCaptcha();
  }, [showCaptcha]);

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

    if (showCaptcha) {
      if (userInput.toUpperCase() !== captcha.toUpperCase()) {
        setCaptchaError("Captcha does not match");
        hasError = true;
        generateCaptcha();
      } else setCaptchaError("");
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
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      {/* Captcha only if showCaptcha=true */}
      {showCaptcha && (
        <>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={captcha}
              readOnly
              className="flex-1 px-4 py-2 border bg-gray-200 font-bold text-center tracking-widest rounded"
            />
            <button
              type="button"
              onClick={generateCaptcha}
              className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 transition"
            >
              Refresh
            </button>
          </div>

          <input
            type="text"
            placeholder="Enter Captcha"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md ${
              captchaError ? "border-red-500" : ""
            }`}
          />
          {captchaError && (
            <p className="text-red-500 text-sm mt-1">{captchaError}</p>
          )}
        </>
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
