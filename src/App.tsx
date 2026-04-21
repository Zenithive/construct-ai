// App.tsx
import './App.css';

import ConstructAI from './components/ConstructAI';
import { BrowserRouter, useRoutes, useNavigate } from 'react-router-dom';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import ResetPassword from './components/auth/ResetPassword';
import OTPVerification from './components/auth/OTPVerification';
import React, { useEffect } from 'react';
import { isAuthenticated, removeToken, removeUser } from './api/apiClient';
import Logout from './components/auth/Logout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }): React.ReactElement | null => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthenticated(true);
    } else {
      removeToken();
      removeUser();
      navigate('/', { replace: true });
    }
    setAuthChecked(true);
  }, [navigate]);

  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return authenticated ? <>{children}</> : null;
};

const AppRoutes = () => {
  const routes = useRoutes([
    { path: '/', element: <Login /> },
    { path: '/logout', element: <Logout /> },
    { path: '/register', element: <Register /> },
    { path: '/verify-otp', element: <OTPVerification /> },
    { path: '/dashboard', element: <ProtectedRoute><ConstructAI /></ProtectedRoute> },
    { path: '/reset-password', element: <ResetPassword /> },
  ]);
  return routes;
};

function App() {
  return (
    <BrowserRouter>
      <div className="App h-full overflow-hidden">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
