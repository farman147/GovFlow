import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const initialValues = {
  name: '',
  email: '',
  password: '',
  phone: '',
};

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to="/citizen/dashboard" replace />;
  }

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = 'Full name is required.';
    } else if (values.name.trim().length < 2) {
      nextErrors.name = 'Please enter your full name.';
    }

    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!values.password) {
      nextErrors.password = 'Password is required.';
    } else if (values.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (values.phone && values.phone.length < 8) {
      nextErrors.phone = 'Phone number looks too short.';
    }

    return nextErrors;
  };

  const handleChange = (field, value) => {
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone.trim(),
      });

      navigate('/citizen/dashboard', {
        replace: true,
      });
    } catch (error) {
      setErrors({
        form: getApiErrorMessage(
          error,
          'Unable to create your account right now.'
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">

      <div className="mx-auto w-full max-w-5xl">

        {/* Back to Home */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft size={17} />
          Back to Home
        </button>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-[0.9fr_1.1fr]">

          {/* Left information panel */}
          <div className="hidden bg-slate-900 p-8 text-white lg:flex lg:flex-col lg:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500">
                  <ShieldCheck size={23} />
                </div>

                <div>
                  <p className="text-lg font-bold">
                    GovFlow
                  </p>

                  <p className="text-xs text-slate-400">
                    Digital Government Services
                  </p>
                </div>
              </div>

              <div className="mt-12">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Get started
                </p>

                <h2 className="mt-4 text-3xl font-bold leading-tight">
                  One account for simpler government services.
                </h2>

                <p className="mt-5 text-sm leading-7 text-slate-300">
                  Create your GovFlow account to discover government
                  services, submit requests, and track your queue activity
                  from one place.
                </p>
              </div>

              <div className="mt-10 space-y-4">

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/15 p-1.5 text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Access available services
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Find the services available through GovFlow.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/15 p-1.5 text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Track your requests
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Keep your queue and service activity in one place.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/15 p-1.5 text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Secure account access
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Your account is protected through GovFlow authentication.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-10 border-t border-slate-800 pt-5">
              <p className="text-xs leading-5 text-slate-400">
                GovFlow helps citizens interact with government services
                through a centralized digital platform.
              </p>
            </div>

          </div>

          {/* Register form */}
          <div className="p-6 sm:p-8 lg:p-10">

            {/* Mobile brand */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={22} />
              </div>

              <div>
                <p className="text-lg font-bold text-slate-900">
                  GovFlow
                </p>

                <p className="text-xs text-slate-500">
                  Digital Government Services
                </p>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <UserRound size={22} />
              </div>

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Create account
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Join GovFlow
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create your account to access GovFlow citizen services.
              </p>

            </div>

            {/* Form */}
            <form
              className="space-y-5"
              onSubmit={handleSubmit}
              noValidate
            >

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  onChange={(event) =>
                    handleChange('name', event.target.value)
                  }
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-slate-900 outline-none transition focus:ring-2 ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                  }`}
                  placeholder="Enter your full name"
                  aria-invalid={Boolean(errors.name)}
                />

                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(event) =>
                    handleChange('email', event.target.value)
                  }
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-slate-900 outline-none transition focus:ring-2 ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                  }`}
                  placeholder="name@example.com"
                  aria-invalid={Boolean(errors.email)}
                />

                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={values.password}
                    onChange={(event) =>
                      handleChange('password', event.target.value)
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-11 text-slate-900 outline-none transition focus:ring-2 ${
                      errors.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                    }`}
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(errors.password)}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-slate-800"
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

                <p className="mt-2 text-xs text-slate-500">
                  Use at least 8 characters.
                </p>

                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Phone number
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={values.phone}
                  onChange={(event) =>
                    handleChange('phone', event.target.value)
                  }
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-slate-900 outline-none transition focus:ring-2 ${
                    errors.phone
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                  }`}
                  placeholder="Enter your phone number"
                  aria-invalid={Boolean(errors.phone)}
                />

                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Form error */}
              {errors.form && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                  {errors.form}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting
                  ? 'Creating account…'
                  : 'Create account'}
              </button>

            </form>

            {/* Login */}
            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}

              <Link
                to="/login"
                className="font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                Login
              </Link>
            </p>

            {/* Security */}
            <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-500">
              <ShieldCheck size={15} />
              Secure GovFlow account registration
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}