// App.tsx
import './App.css';

import ConstructAI from './components/ConstructAI.tsx';
import { BrowserRouter, useRoutes, useNavigate } from 'react-router-dom';
import Register from './components/auth/Register.tsx';
import Login from './components/auth/Login.tsx';
import ResetPassword from './components/auth/ResetPassword.tsx'; // Import the new component
import React,{ useEffect } from 'react';
import  supabase  from './supaBase/supabaseClient.tsx';
import Logout from './components/auth/Logout.tsx';

//import Logout from './components/auth/Logout.tsx';

const ProtectedRoute = ({ children }: { children: React.Element }) => {
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

  return children;
};

const AppRoutes = () => {
  const routes = useRoutes([
    { path: '/', element: <Login /> }, // Login as default page
    {path: '/logout', element: <Logout/>},
    { path: '/register', element: <Register /> },
    { path: '/dashboard', element: <ProtectedRoute><ConstructAI /></ProtectedRoute> },
    { path: '/reset-password', element: <ResetPassword /> }, // New reset password route
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