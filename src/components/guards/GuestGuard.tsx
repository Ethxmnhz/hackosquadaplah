import { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const GuestGuard = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  if (isAuthenticated) {
    // Redirect to the page they were trying to access before login or to dashboard
    return <Navigate to={from} replace />;
  }

  // If not authenticated, render child routes (login, register)
  return <Outlet />;
};

export default GuestGuard;