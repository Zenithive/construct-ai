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

//import Logout from './components/auth/Logout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  return <>{children}</>;
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
      <div className="App">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;