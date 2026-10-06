import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const defaultRedirect = (role) => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'staff') return '/staff/dashboard';
  return '/citizen/dashboard';
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading your session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={defaultRedirect(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
