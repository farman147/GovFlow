import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const initialValues = {
  email: '',
  password: '',
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const params = new URLSearchParams(location.search);

  const sessionExpired = params.get('sessionExpired') === '1';
  const forceLogin = params.get('forced') === '1';

  /*
   * If already logged in and /login is opened normally,
   * send the user to the dashboard for their role.
   *
   * ?forced=1 keeps the login page visible.
   */
  if (user && !forceLogin) {
    const dashboardPath =
      user.role === 'admin'
        ? '/admin/dashboard'
        : user.role === 'staff'
          ? '/staff/dashboard'
          : '/citizen/dashboard';

    return <Navigate to={dashboardPath} replace />;
  }

  const validate = () => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!values.password) {
      nextErrors.password = 'Password is required.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      const loggedInUser = await login({
        email: values.email.trim(),
        password: values.password,
      });

      const role = loggedInUser?.role;

      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'staff') {
        navigate('/staff/dashboard', { replace: true });
      } else {
        navigate('/citizen/dashboard', { replace: true });
      }
    } catch (error) {
      setErrors({
        form: getApiErrorMessage(
          error,
          'Unable to log in. Please check your credentials and try again.'
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: '',
      form: '',
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT — govflow BRAND / INFORMATION */}
        <div className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">

            {/* Brand */}
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <ShieldCheck size={23} />
                </div>

                <div>
                  <p className="text-xl font-bold tracking-tight text-white">
                    govflow
                  </p>
                  <p className="text-xs text-slate-400">
                    Smart Government Services
                  </p>
                </div>
              </Link>
            </div>

            {/* Main message */}
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <Sparkles size={14} />
                Smarter public service access
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Government services,
                <span className="block text-emerald-400">
                  without the unnecessary waiting.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
                Access government services, manage queue tokens,
                track your requests, and get real-time service
                information through one secure platform.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-lg font-bold text-white">
                    Live
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Queue updates
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-lg font-bold text-white">
                    AI
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Service assistance
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-lg font-bold text-white">
                    Secure
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Account access
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} />
              Secure access to govflow services
            </div>
          </div>
        </div>

        {/* RIGHT — LOGIN */}
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">

            {/* Mobile brand */}
            <div className="mb-8 lg:hidden">
              <Link
                to="/"
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <p className="text-xl font-bold text-slate-900">
                    govflow
                  </p>
                  <p className="text-xs text-slate-500">
                    Smart Government Services
                  </p>
                </div>
              </Link>
            </div>

            {/* Back */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>

            {/* Login card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">

              {/* Header */}
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <LockKeyhole size={22} />
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  govflow Account
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to manage your government service requests,
                  queue tokens, and appointments.
                </p>
              </div>

              {/* Session expired */}
              {sessionExpired ? (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
                  Your session has expired. Please sign in again.
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-5"
              >

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={(event) =>
                      updateField('email', event.target.value)
                    }
                    placeholder="name@example.com"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.email)}
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                      errors.email
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  />

                  {errors.email ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.email}
                    </p>
                  ) : null}
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={values.password}
                      onChange={(event) =>
                        updateField('password', event.target.value)
                      }
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.password)}
                      className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                        errors.password
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      disabled={isSubmitting}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {errors.password ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.password}
                    </p>
                  ) : null}
                </div>

                {/* Form error */}
                {errors.form ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                    {errors.form}
                  </div>
                ) : null}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign in to govflow'
                  )}
                </button>
              </form>

              {/* Register */}
              <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">
                  Don't have a govflow account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-emerald-700 transition hover:text-emerald-800"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </div>

            {/* Security */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={14} />
              Your account information is securely protected.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
