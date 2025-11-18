// App.tsx
import './App.css';

import ConstructAI from './components/ConstructAI';
import { BrowserRouter, useRoutes, useNavigate } from 'react-router-dom';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import ResetPassword from './components/auth/ResetPassword';
import OTPVerification from './components/auth/OTPVerification';
import React,{ useEffect } from 'react';
import  supabase  from './supaBase/supabaseClient';
import Logout from './components/auth/Logout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }): React.ReactElement | null => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // No session found - redirect to login (root path)
        setIsAuthenticated(false);
        navigate('/', { replace: true });
      } else {
        // Session exists - allow access
        setIsAuthenticated(true);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        navigate('/', { replace: true });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
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

  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
};

const AppRoutes = () => {
  const routes = useRoutes([
    { path: '/', element: <Login /> }, // Login as default page
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