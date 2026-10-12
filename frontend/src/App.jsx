import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';

import CitizenDashboardPage from './pages/citizen/CitizenDashboardPage';
import ServicesPage from './pages/citizen/ServicesPage';
import AppointmentsPage from './pages/citizen/AppointmentsPage';
import TokenDetailPage from './pages/citizen/TokenDetailPage';
import TokensPage from './pages/citizen/TokensPage';
import AssistantPage from './pages/citizen/AssistantPage';

import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import StaffQueuePage from './pages/staff/StaffQueuePage';
import StaffAppointmentsPage from './pages/staff/StaffAppointmentsPage';
import StaffStatisticsPage from './pages/staff/StaffStatisticsPage';
import StaffProfilePage from './pages/staff/StaffProfilePage';

import AccessDeniedPage from './pages/shared/AccessDeniedPage';
import NotFoundPage from './pages/shared/NotFoundPage';

const SESSION_KEY = 'govflow_app_session';

const protectedDashboardPaths = [
  '/citizen/dashboard',
  '/staff/dashboard',
  '/admin/dashboard',
];

function StartupRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hasExistingAppSession =
      sessionStorage.getItem(SESSION_KEY) === '1';

    /*
     * sessionStorage is cleared when the browser tab is closed.
     *
     * Therefore:
     *
     * First time opening/reopening govflow:
     *     sessionStorage does not contain our key.
     *
     * If Chrome restored an old dashboard URL:
     *     send the user to Home.
     *
     * During normal navigation/refresh in the same tab:
     *     the key already exists, so nothing happens.
     */
    if (!hasExistingAppSession) {
      sessionStorage.setItem(SESSION_KEY, '1');

      if (protectedDashboardPaths.includes(location.pathname)) {
        navigate('/', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <StartupRedirect />

      <Routes>
        {/* Public pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Citizen routes */}
        <Route
          path="/citizen/dashboard"
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <CitizenDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/services"
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <ServicesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/appointments"
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/assistant"
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <AssistantPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/tokens"
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <TokensPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/tokens/:id"
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <TokenDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen"
          element={<Navigate to="/citizen/dashboard" replace />}
        />

        {/* Staff routes */}
        <Route
          path="/staff"
          element={<Navigate to="/staff/dashboard" replace />}
        />

        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/queue"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffQueuePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/appointments"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffAppointmentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/statistics"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffStatisticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/profile"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage initialSection="overview" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/services"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage initialSection="services" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/counters"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage initialSection="counters" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/queue-monitor"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage initialSection="queue" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/ai-forecast"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage initialSection="overview" />
            </ProtectedRoute>
          }
        />

        {/* Shared pages */}
        <Route
          path="/access-denied"
          element={<AccessDeniedPage />}
        />

        <Route
          path="/404"
          element={<NotFoundPage />}
        />

        {/* Unknown route */}
        <Route
          path="*"
          element={<Navigate to="/404" replace />}
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
