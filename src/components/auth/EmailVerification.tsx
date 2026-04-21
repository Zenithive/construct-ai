// EmailVerification.tsx
// No longer used with custom backend — email verification is not required.
// Redirects to dashboard if logged in, else to register.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../../api/apiClient';

const EmailVerification = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/register', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default EmailVerification;
