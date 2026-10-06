import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileText,
  Globe2,
  HelpCircle,
  Landmark,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import { getServices } from '../../api/serviceService';
import { useAuth } from '../../context/AuthContext';

const quickLinks = [
  {
    icon: FileText,
    title: 'Government Services',
    text: 'Browse available services',
    href: '#services',
  },
  {
    icon: Users,
    title: 'Citizen Portal',
    text: 'Manage your requests',
    href: '/citizen',
  },
  {
    icon: Landmark,
    title: 'Departments',
    text: 'Explore service departments',
    href: '#departments',
  },
  {
    icon: HelpCircle,
    title: 'Help & Support',
    text: 'Get assistance',
    href: '#help',
  },
];

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Find a service',
    text: 'Search for the government service you need and understand the requirements before you begin.',
  },
  {
    number: '02',
    icon: FileCheck2,
    title: 'Prepare your documents',
    text: 'Check the required documents and service information so you can arrive prepared.',
  },
  {
    number: '03',
    icon: Clock3,
    title: 'Manage your visit',
    text: 'Use digital queue and appointment features to better manage your time.',
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Track progress',
    text: 'Follow your service progress through your citizen account.',
  },
];

const benefits = [
  {
    icon: Clock3,
    title: 'Reduce waiting',
    text: 'Plan your visit better with digital queue and appointment information.',
  },
  {
    icon: FileCheck2,
    title: 'Know what to bring',
    text: 'View required documents before starting a government service.',
  },
  {
    icon: Building2,
    title: 'One place for services',
    text: 'Discover services from participating government departments.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure access',
    text: 'Protected authentication and role-based access for platform users.',
  },
];

const departments = [
  {
    name: 'Civil Registration',
    description: 'Birth certificates and related registration services.',
    icon: FileText,
  },
  {
    name: 'Transport',
    description: 'Driving licence and transport-related services.',
    icon: Building2,
  },
  {
    name: 'Passport',
    description: 'Passport application and related services.',
    icon: Globe2,
  },
  {
    name: 'Public Services',
    description: 'Discover additional services available through GovFlow.',
    icon: Landmark,
  },
];

const formatMinutes = (minutes) => {
  if (minutes === undefined || minutes === null || minutes === '') {
    return 'Not available';
  }

  return `${minutes} min`;
};

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleForceLogin = (event) => {
    if (event) {
      event.preventDefault();
    }

    logout(false);
    navigate('/login?forced=1', { replace: true });
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);

        const response = await getServices();

        setServices(response.data?.data?.services || []);
        setError('');
      } catch (loadError) {
        setError(
          getApiErrorMessage(
            loadError,
            'Unable to load government services right now.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const filteredServices = services
    .filter((service) => {
      const query = searchTerm.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return (
        service.name?.toLowerCase().includes(query) ||
        service.code?.toLowerCase().includes(query) ||
        service.department?.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query)
      );
    })
    .slice(0, 6);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* =========================================================
          GOVERNMENT TOP BAR
      ========================================================== */}
      <div className="bg-[#173b67] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Digital Public Services Portal</span>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <a
              href="#accessibility"
              className="transition hover:text-blue-200"
            >
              Accessibility
            </a>

            <a
              href="#help"
              className="transition hover:text-blue-200"
            >
              Help
            </a>

            <a
              href="#contact"
              className="transition hover:text-blue-200"
            >
              Contact
            </a>
          </div>
        </div>
      </div>

      {/* =========================================================
          MAIN NAVBAR
      ========================================================== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3"
            onClick={closeMobileMenu}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#173b67] text-xl font-bold text-white shadow-sm">
              G
            </div>

            <div>
              <div className="text-xl font-bold tracking-tight text-[#173b67]">
                GovFlow
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Digital Public Services
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 lg:flex">
            <a
              href="#home"
              className="text-sm font-semibold text-[#173b67] transition hover:text-blue-700"
            >
              Home
            </a>

            <a
              href="#services"
              className="text-sm font-medium text-slate-600 transition hover:text-[#173b67]"
            >
              Services
            </a>

            <a
              href="#departments"
              className="text-sm font-medium text-slate-600 transition hover:text-[#173b67]"
            >
              Departments
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-[#173b67]"
            >
              How It Works
            </a>

            <a
              href="#help"
              className="text-sm font-medium text-slate-600 transition hover:text-[#173b67]"
            >
              Help
            </a>
          </nav>

          {/* Desktop Auth */}
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login?forced=1"
              onClick={handleForceLogin}
              className="rounded-md border border-[#173b67] bg-white px-5 py-2.5 text-sm font-semibold text-[#173b67] transition hover:bg-blue-50"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="rounded-md bg-[#173b67] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102d50]"
            >
              Register
            </Link>
          </div>

          {/* Mobile Menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md border border-slate-200 p-2 text-slate-700 sm:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg sm:hidden">
            <div className="flex flex-col gap-1">
              <a
                href="#home"
                onClick={closeMobileMenu}
                className="rounded-md px-4 py-3 text-sm font-semibold text-[#173b67] hover:bg-slate-50"
              >
                Home
              </a>

              <a
                href="#services"
                onClick={closeMobileMenu}
                className="rounded-md px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Services
              </a>

              <a
                href="#departments"
                onClick={closeMobileMenu}
                className="rounded-md px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Departments
              </a>

              <a
                href="#how-it-works"
                onClick={closeMobileMenu}
                className="rounded-md px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                How It Works
              </a>

              <a
                href="#help"
                onClick={closeMobileMenu}
                className="rounded-md px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Help
              </a>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <Link
                  to="/login?forced=1"
                  onClick={handleForceLogin}
                  className="rounded-md border border-[#173b67] px-3 py-2.5 text-center text-sm font-semibold text-[#173b67]"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="rounded-md bg-[#173b67] px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* =========================================================
            HERO
        ========================================================== */}
        <section
          id="home"
          className="relative overflow-hidden border-b border-slate-200 bg-[#f7f9fc]"
        >
          {/* Decorative background */}
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-100/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            {/* Hero Text */}
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#173b67]">
                <ShieldCheck size={15} />
                Digital Public Services
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Access government
                <span className="block text-[#173b67]">
                  services in one place
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Find government services, understand the required documents,
                manage your appointments and track your service progress
                through GovFlow.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#services"
                  className="inline-flex items-center gap-2 rounded-md bg-[#173b67] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#102d50]"
                >
                  Find a Service
                  <ArrowRight size={18} />
                </a>

                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-[#173b67] transition hover:border-[#173b67] hover:bg-blue-50"
                >
                  Create Account
                </Link>
              </div>

              {/* Hero benefits */}
              <div className="mt-9 grid gap-4 sm:grid-cols-2">
                {[
                  'Service information',
                  'Required documents',
                  'Digital queue management',
                  'Service tracking',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <CheckCircle2
                      size={17}
                      className="shrink-0 text-emerald-600"
                    />

                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Search Portal Card */}
            <div className="flex items-center">
              <div className="w-full border border-slate-300 bg-white p-4 shadow-[0_15px_50px_rgba(15,23,42,0.08)] sm:p-6">
                <div className="border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-[#f8fafc] p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#173b67] text-white">
                        <Search size={23} />
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-slate-950">
                          Search Government Services
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Search by service name, department or service code
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-center border border-slate-300 bg-white">
                      <Search
                        size={19}
                        className="ml-3 text-slate-400"
                      />

                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) =>
                          setSearchTerm(event.target.value)
                        }
                        placeholder="Search services..."
                        className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <a
                        href="#services"
                        className="group border border-slate-200 bg-slate-50 p-4 text-center transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <FileText
                          size={22}
                          className="mx-auto text-[#173b67]"
                        />

                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          Services
                        </p>
                      </a>

                      <a
                        href="#departments"
                        className="group border border-slate-200 bg-slate-50 p-4 text-center transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Building2
                          size={22}
                          className="mx-auto text-[#173b67]"
                        />

                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          Departments
                        </p>
                      </a>

                      <a
                        href="#how-it-works"
                        className="group border border-slate-200 bg-slate-50 p-4 text-center transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Clock3
                          size={22}
                          className="mx-auto text-[#173b67]"
                        />

                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          Queue
                        </p>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 border border-slate-200 bg-slate-50 px-4 py-3">
                  <ShieldCheck
                    size={19}
                    className="shrink-0 text-emerald-600"
                  />

                  <p className="text-xs leading-5 text-slate-600">
                    Secure digital access to participating public services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            QUICK ACCESS
        ========================================================== */}
        <section className="border-b border-slate-200 bg-[#eef3f8]">
          <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {quickLinks.map(({ icon: Icon, title, text, href }) => {
              const isInternal = href.startsWith('/');

              return isInternal ? (
                <Link
                  key={title}
                  to={href === '/citizen' ? '/login?forced=1' : href}
                  onClick={href === '/citizen' ? handleForceLogin : undefined}
                  className="group flex items-center gap-4 border-b border-slate-200 px-5 py-6 transition hover:bg-white md:border-r lg:border-b-0"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-[#173b67] transition group-hover:border-[#173b67]">
                    <Icon size={21} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {text}
                    </p>
                  </div>
                </Link>
              ) : (
                <a
                  key={title}
                  href={href}
                  className="group flex items-center gap-4 border-b border-slate-200 px-5 py-6 transition hover:bg-white md:border-r lg:border-b-0"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-[#173b67] transition group-hover:border-[#173b67]">
                    <Icon size={21} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {text}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            SERVICES
        ========================================================== */}
        <section
          id="services"
          className="border-b border-slate-200 bg-white py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#173b67]">
                  Service Directory
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Government services
                </h2>

                <p className="mt-4 leading-7 text-slate-600">
                  Browse services currently available through GovFlow.
                  Information below is loaded directly from the live
                  backend.
                </p>
              </div>

              {user && (
                <Link
                  to="/login?forced=1"
                  onClick={handleForceLogin}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#173b67]"
                >
                  Open citizen portal
                  <ArrowUpRight size={16} />
                </Link>
              )}
            </div>

            {/* Search */}
            <div className="mt-8 flex items-center border border-slate-300 bg-white px-4 shadow-sm">
              <Search size={19} className="text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search by service, department or code..."
                className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-8">
              {loading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse border border-slate-200 bg-white p-6"
                    >
                      <div className="h-11 w-11 rounded-md bg-slate-200" />

                      <div className="mt-5 h-5 w-3/4 rounded bg-slate-200" />

                      <div className="mt-3 h-3 w-1/3 rounded bg-slate-200" />

                      <div className="mt-5 h-3 w-full rounded bg-slate-200" />

                      <div className="mt-2 h-3 w-5/6 rounded bg-slate-200" />

                      <div className="mt-7 h-8 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="border border-red-200 bg-red-50 p-6">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={22}
                      className="mt-0.5 shrink-0 text-red-700"
                    />

                    <div>
                      <h3 className="font-semibold text-red-900">
                        Services are temporarily unavailable
                      </h3>

                      <p className="mt-1 text-sm text-red-700">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="border border-slate-200 bg-slate-50 p-12 text-center">
                  <Search
                    size={30}
                    className="mx-auto text-slate-400"
                  />

                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    No services found
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Try another service, department or service code.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredServices.map((service) => (
                    <div
                      key={service._id}
                      className="group flex flex-col border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-[#173b67]">
                          <FileText size={21} />
                        </div>

                        <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          {service.code}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-bold text-slate-950">
                        {service.name}
                      </h3>

                      <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#173b67]">
                        <Building2 size={15} />
                        {service.department}
                      </div>

                      <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600">
                        {service.description ||
                          'Government service available through GovFlow.'}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock3 size={15} />
                          Processing time
                        </span>

                        <strong className="text-sm text-slate-900">
                          {formatMinutes(
                            service.estimatedProcessingTime ??
                              service.averageServiceTime
                          )}
                        </strong>
                      </div>

                      {service.requiredDocuments?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Required documents
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {service.requiredDocuments
                              .slice(0, 3)
                              .map((document) => (
                                <span
                                  key={document}
                                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                                >
                                  {document}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto border-t border-slate-100 pt-5">
                        <Link
                          to="/login?forced=1"
                          onClick={handleForceLogin}
                          className="inline-flex items-center gap-2 text-sm font-bold text-[#173b67] transition group-hover:text-blue-700"
                        >
                          Sign in to continue

                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            DEPARTMENTS
        ========================================================== */}
        <section
          id="departments"
          className="bg-[#f7f9fc] py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#173b67]">
                Departments
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Services across departments
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                GovFlow provides a common digital experience for citizens
                accessing services from participating departments.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {departments.map(
                ({ name, description, icon: Icon }) => (
                  <div
                    key={name}
                    className="group border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-[#173b67]">
                      <Icon size={22} />
                    </div>

                    <h3 className="mt-5 font-bold text-slate-950">
                      {name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {description}
                    </p>

                    <a
                      href="#services"
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#173b67]"
                    >
                      View services
                      <ArrowRight size={15} />
                    </a>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            HOW IT WORKS
        ========================================================== */}
        <section
          id="how-it-works"
          className="border-y border-slate-200 bg-white py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#173b67]">
                How It Works
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                A simpler government service journey
              </h2>

              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
                From discovering a service to tracking your progress,
                GovFlow keeps the important information in one place.
              </p>
            </div>

            <div className="relative mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map(
                ({ number, icon: Icon, title, text }) => (
                  <div
                    key={number}
                    className="relative border border-slate-200 bg-slate-50 p-7"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#173b67] text-white">
                        <Icon size={20} />
                      </div>

                      <span className="text-xs font-bold tracking-[0.2em] text-slate-400">
                        {number}
                      </span>
                    </div>

                    <h3 className="mt-6 text-lg font-bold text-slate-950">
                      {title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {text}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            BENEFITS
        ========================================================== */}
        <section className="bg-[#173b67] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                Why GovFlow
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Designed around citizens
              </h2>

              <p className="mt-4 leading-7 text-blue-100">
                GovFlow focuses on making public-service information
                easier to understand and government service operations
                easier to manage.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="border border-blue-800 bg-[#204a7b] p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10">
                    <Icon
                      size={22}
                      className="text-blue-100"
                    />
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-blue-100">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            AI FORECASTING
        ========================================================== */}
        <section className="bg-[#f7f9fc] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="border border-blue-200 bg-blue-50 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#173b67] text-white">
                  <BrainCircuit size={23} />
                </div>

                <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#173b67]">
                  AI Forecasting
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  Smarter planning is coming
                </h2>

                <p className="mt-4 leading-7 text-slate-600">
                  GovFlow is being prepared to use historical operational
                  data to forecast future service demand, queue pressure
                  and waiting times.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#173b67] shadow-sm">
                  <Sparkles size={16} />
                  Coming Soon
                </div>
              </div>

              <div className="border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                    <BrainCircuit
                      size={20}
                      className="text-[#173b67]"
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-950">
                      Planned AI capabilities
                    </h3>

                    <p className="text-sm text-slate-500">
                      Future forecasting integration
                    </p>
                  </div>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      title: 'Demand forecasting',
                      text: 'Estimate future service demand using historical patterns.',
                    },
                    {
                      title: 'Queue analysis',
                      text: 'Identify periods of increased operational pressure.',
                    },
                    {
                      title: 'Planning insights',
                      text: 'Support future staffing and service planning.',
                    },
                  ].map(({ title, text }) => (
                    <div
                      key={title}
                      className="border border-slate-200 bg-slate-50 p-5"
                    >
                      <CheckCircle2
                        size={19}
                        className="text-[#173b67]"
                      />

                      <h4 className="mt-4 font-semibold text-slate-900">
                        {title}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-l-4 border-blue-800 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                  No artificial prediction values are displayed until
                  the forecasting model and production data pipeline
                  are ready.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            TRUST & SECURITY
        ========================================================== */}
        <section
          id="accessibility"
          className="bg-white py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#173b67] text-white">
                  <ShieldCheck size={23} />
                </div>

                <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#173b67]">
                  Trust & Security
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Built for responsible digital public services
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-slate-600">
                  GovFlow separates citizen, staff and administrative
                  operations through protected authentication and
                  role-based access.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                    <ShieldCheck
                      size={16}
                      className="text-emerald-600"
                    />
                    Secure access
                  </span>

                  <span className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                    <BadgeCheck
                      size={16}
                      className="text-[#173b67]"
                    />
                    Role-based access
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: Users,
                    title: 'Citizen access',
                    text: 'A simple public-facing service experience.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Protected sessions',
                    text: 'Authenticated access for protected operations.',
                  },
                  {
                    icon: FileText,
                    title: 'Clear information',
                    text: 'Service details are shown before citizens begin.',
                  },
                  {
                    icon: BadgeCheck,
                    title: 'Role-based operations',
                    text: 'Different access levels for citizen, staff and admin users.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="border border-slate-200 bg-slate-50 p-6"
                  >
                    <Icon
                      size={22}
                      className="text-[#173b67]"
                    />

                    <h3 className="mt-4 font-bold text-slate-950">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            HELP
        ========================================================== */}
        <section
          id="help"
          className="border-y border-slate-200 bg-[#f7f9fc] py-16"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#173b67]">
                  Help & Support
                </p>

                <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
                  Need help using GovFlow?
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Start by exploring the service directory or create an
                  account to access the citizen portal.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#services"
                  className="inline-flex items-center gap-2 rounded-md bg-[#173b67] px-5 py-3 text-sm font-bold text-white"
                >
                  Browse services
                  <ArrowRight size={17} />
                </a>

                <Link
                  to="/register"
                  className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#173b67]"
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================== */}
        <section
          id="contact"
          className="bg-[#102d50] py-20"
        >
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
              Get Started
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Access public services through one digital experience.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl leading-7 text-blue-100">
              Create your GovFlow account or sign in to continue to the
              citizen portal.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-bold text-[#173b67] transition hover:bg-blue-50"
              >
                Create Account
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/login?forced=1"
                onClick={handleForceLogin}
                className="rounded-md border border-blue-400/40 bg-transparent px-6 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="bg-[#10233c] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white font-bold text-[#173b67]">
                  G
                </div>

                <div>
                  <div className="font-bold text-white">
                    GovFlow
                  </div>

                  <div className="text-[9px] uppercase tracking-[0.18em] text-blue-200">
                    Digital Public Services
                  </div>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
                A digital platform designed to make government service
                access clearer, more transparent and easier to manage.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h3 className="text-sm font-bold text-white">
                Platform
              </h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
                <a
                  href="#services"
                  className="hover:text-white"
                >
                  Services
                </a>

                <a
                  href="#departments"
                  className="hover:text-white"
                >
                  Departments
                </a>

                <a
                  href="#how-it-works"
                  className="hover:text-white"
                >
                  How It Works
                </a>
              </div>
            </div>

            {/* Account */}
            <div>
              <h3 className="text-sm font-bold text-white">
                Account
              </h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
                <Link
                  to="/login?forced=1"
                  onClick={handleForceLogin}
                  className="hover:text-white"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="hover:text-white"
                >
                  Create Account
                </Link>

                {user && (
                  <Link
                    to="/login?forced=1"
                    onClick={handleForceLogin}
                    className="hover:text-white"
                  >
                    Citizen Portal
                  </Link>
                )}
              </div>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-bold text-white">
                Support
              </h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
                <a
                  href="#help"
                  className="hover:text-white"
                >
                  Help & Support
                </a>

                <a
                  href="#accessibility"
                  className="hover:text-white"
                >
                  Accessibility
                </a>

                <a
                  href="#contact"
                  className="hover:text-white"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-slate-700 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 GovFlow. Digital Public Services Platform.
            </p>

            <div className="flex flex-wrap gap-5">
              <span>Secure access</span>
              <span>Citizen focused</span>
              <span>Digital services</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
