import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import { getServices } from '../../api/serviceService';
import { getMyTokens, getTokenStatus } from '../../api/tokenService';
import { getMyAppointments } from '../../api/appointmentService';

import DashboardLayout from '../../components/citizen/DashboardLayout';
import EmptyState from '../../components/citizen/EmptyState';
import ErrorState from '../../components/citizen/ErrorState';
import LoadingState from '../../components/citizen/LoadingState';
import ServiceCard from '../../components/citizen/ServiceCard';
import StatusBadge from '../../components/citizen/StatusBadge';
import TokenCard from '../../components/citizen/TokenCard';

import { useAuth } from '../../context/AuthContext';

const activeStatuses = new Set([
  'waiting',
  'called',
  'in_service',
]);

export default function CitizenDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [queueInfo, setQueueInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        serviceResponse,
        tokenResponse,
        appointmentResponse,
      ] = await Promise.all([
        getServices(),
        getMyTokens(),
        getMyAppointments(),
      ]);

      const serviceList =
        serviceResponse.data?.data?.services || [];

      const tokenList =
        tokenResponse.data?.data?.tokens || [];

      const appointmentList =
        appointmentResponse.data?.data?.appointments || [];

      setServices(serviceList);
      setTokens(tokenList);
      setAppointments(appointmentList);

      const activeToken =
        tokenList.find((token) =>
          activeStatuses.has(token.status)
        ) || null;

      if (activeToken) {
        try {
          const statusResponse =
            await getTokenStatus(activeToken._id);

          setQueueInfo(
            statusResponse.data?.data?.queue || null
          );
        } catch {
          setQueueInfo(null);
        }
      } else {
        setQueueInfo(null);
      }
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          'Unable to load your dashboard right now.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeToken =
    tokens.find((token) =>
      activeStatuses.has(token.status)
    ) || null;

  const recentTokens = tokens.slice(0, 3);

  const scheduledAppointments = appointments
    .filter(
      (appointment) =>
        appointment.status === 'scheduled'
    )
    .sort(
      (a, b) =>
        new Date(a.appointmentDate) -
        new Date(b.appointmentDate)
    );

  return (
    <DashboardLayout
      title="Citizen Dashboard"
      subtitle="Manage government services, appointments and your queue from one secure portal."
    >
      <div className="space-y-8">

        {/* =========================================================
            WELCOME HEADER
        ========================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-lg">

          {/* Decorative background */}
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">

            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

              <div className="max-w-3xl">

                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">
                  <ShieldCheck size={14} />
                  govflow Citizen Portal
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Welcome back,{' '}
                  <span className="text-blue-300">
                    {user?.name || 'Citizen'}
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Access government services, book appointments,
                  receive queue tokens and track your visit in real time.
                </p>

              </div>

              <div className="flex flex-wrap gap-3">

                <Link
                  to="/citizen/services"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100"
                >
                  <BriefcaseBusiness size={17} />
                  Find a service
                </Link>

                <Link
                  to="/citizen/appointments"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  <Calendar size={17} />
                  Book appointment
                </Link>

              </div>

            </div>
          </div>

          {/* Header status row */}
          <div className="relative grid border-t border-white/10 sm:grid-cols-3">

            <div className="flex items-center gap-3 px-6 py-4 sm:px-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Account
                </p>

                <p className="text-sm font-semibold text-white">
                  Secure & active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4 sm:border-l sm:border-t-0 sm:px-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                <Ticket size={18} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Current token
                </p>

                <p className="text-sm font-semibold text-white">
                  {activeToken?.tokenNumber || 'No active token'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4 sm:border-l sm:border-t-0 sm:px-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                <Calendar size={18} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Upcoming visits
                </p>

                <p className="text-sm font-semibold text-white">
                  {scheduledAppointments.length} scheduled
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================
            LOADING / ERROR
        ========================================================== */}

        {loading ? (
          <LoadingState
            title="Loading your dashboard"
            message="Fetching your services, appointments and queue information."
          />
        ) : error ? (
          <ErrorState
            title="Unable to load your dashboard"
            message={error}
            onRetry={loadDashboard}
          />
        ) : (
          <>

            {/* =====================================================
                OVERVIEW
            ====================================================== */}

            <section>

              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  Overview
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  Your service activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  A quick view of your current govflow activity.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {/* Active token */}

                <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">

                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Active token
                      </p>

                      <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        {activeToken?.tokenNumber || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      <Ticket size={19} />
                    </div>

                  </div>

                  <p className="mt-2 truncate text-sm text-slate-500">
                    {activeToken?.service?.name ||
                      'No active queue token'}
                  </p>

                </div>

                {/* Appointments */}

                <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">

                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Appointments
                      </p>

                      <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        {scheduledAppointments.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                      <Calendar size={19} />
                    </div>

                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Scheduled visits
                  </p>

                </div>

                {/* Queue */}

                <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">

                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Queue position
                      </p>

                      <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        {queueInfo?.peopleAhead !== undefined
                          ? queueInfo.peopleAhead
                          : '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                      <Users size={19} />
                    </div>

                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {queueInfo?.peopleAhead !== undefined
                      ? 'People ahead of you'
                      : 'No active queue'}
                  </p>

                </div>

                {/* Services */}

                <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md">

                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Services
                      </p>

                      <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        {services.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                      <BriefcaseBusiness size={19} />
                    </div>

                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Available public services
                  </p>

                </div>

              </div>
            </section>

            {/* =====================================================
                ACTIVE QUEUE + QUICK ACTIONS
            ====================================================== */}

            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">

              {/* ACTIVE TOKEN */}

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                      Queue management
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-950">
                      Current service token
                    </h2>
                  </div>

                  {activeToken && (
                    <Link
                      to={`/citizen/tokens/${activeToken._id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800"
                    >
                      View tracker
                      <ArrowRight size={16} />
                    </Link>
                  )}

                </div>

                <div className="p-6">

                  {activeToken ? (
                    <div className="space-y-5">

                      {/* Token main panel */}

                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900 p-6 text-white">

                        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />

                        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

                          <div>

                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-400" />

                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">
                                Live queue
                              </p>
                            </div>

                            <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                              {activeToken.tokenNumber}
                            </p>

                            <p className="mt-2 text-sm text-slate-300">
                              {activeToken.service?.name ||
                                'Government service'}
                            </p>

                          </div>

                          <StatusBadge
                            status={activeToken.status}
                          />

                        </div>

                      </div>

                      {/* Queue details */}

                      <div className="grid gap-3 sm:grid-cols-3">

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                          <div className="flex items-center gap-2 text-slate-500">
                            <FileText size={15} />

                            <p className="text-[10px] font-bold uppercase tracking-wider">
                              Service
                            </p>
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-900">
                            {activeToken.service?.name ||
                              'Service'}
                          </p>

                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                          <div className="flex items-center gap-2 text-slate-500">
                            <BriefcaseBusiness size={15} />

                            <p className="text-[10px] font-bold uppercase tracking-wider">
                              Department
                            </p>
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-900">
                            {activeToken.service?.department ||
                              queueInfo?.department ||
                              'Department'}
                          </p>

                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock3 size={15} />

                            <p className="text-[10px] font-bold uppercase tracking-wider">
                              Estimated wait
                            </p>
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-900">

                            {activeToken.status === 'waiting'
                              ? queueInfo?.estimatedWaitTime !== undefined
                                ? `~${queueInfo.estimatedWaitTime} min`
                                : activeToken.estimatedWaitTime !== undefined
                                ? `~${activeToken.estimatedWaitTime} min`
                                : 'Calculating'
                              : activeToken.status === 'called' ||
                                activeToken.status === 'in_service'
                              ? 'Serving now'
                              : '—'}

                          </p>

                        </div>

                      </div>

                    </div>
                  ) : (
                    <EmptyState
                      title="No active token"
                      message="You do not currently have an active queue request."
                      action={
                        <Link
                          to="/citizen/services"
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                        >
                          Find a service
                          <ArrowRight size={16} />
                        </Link>
                      }
                    />
                  )}

                </div>
              </section>

              {/* QUICK ACTIONS */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-200 px-6 py-5">

                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Citizen services
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Quick actions
                  </h2>

                </div>

                <div className="space-y-2.5 p-5">

                  <Link
                    to="/citizen/services"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                  >

                    <div className="flex items-center gap-3">

                      <div className="rounded-lg bg-blue-100 p-2.5 text-blue-800">
                        <BriefcaseBusiness size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Find a service
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Browse government services
                        </p>
                      </div>

                    </div>

                    <ArrowRight
                      size={17}
                      className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
                    />

                  </Link>

                  <Link
                    to="/citizen/appointments"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >

                    <div className="flex items-center gap-3">

                      <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
                        <Calendar size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Book appointment
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Reserve your visit
                        </p>
                      </div>

                    </div>

                    <ArrowRight
                      size={17}
                      className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700"
                    />

                  </Link>

                  <Link
                    to="/citizen/tokens"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50"
                  >

                    <div className="flex items-center gap-3">

                      <div className="rounded-lg bg-violet-100 p-2.5 text-violet-700">
                        <Ticket size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          My tokens
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Track queue history
                        </p>
                      </div>

                    </div>

                    <ArrowRight
                      size={17}
                      className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-700"
                    />

                  </Link>

                  {/* AI */}

                  <Link
                    to="/citizen/assistant"
                    className="group relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="rounded-lg bg-blue-900 p-2.5 text-white shadow-sm">
                          <BadgeCheck size={18} />
                        </div>

                        <div>

                          <div className="flex items-center gap-2">

                            <p className="text-sm font-bold text-blue-950">
                              govflow Assistant
                            </p>

                            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-900">
                              AI
                            </span>

                          </div>

                          <p className="mt-0.5 text-xs text-blue-800">
                            Documents, fees and service guidance
                          </p>

                        </div>

                      </div>

                      <ArrowRight
                        size={17}
                        className="text-blue-700 transition group-hover:translate-x-1"
                      />

                    </div>

                  </Link>

                </div>

              </section>

            </div>

            {/* =====================================================
                UPCOMING APPOINTMENTS
            ====================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Scheduled visits
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Upcoming appointments
                  </h2>
                </div>

                <Link
                  to="/citizen/appointments"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800"
                >
                  Manage appointments
                  <ArrowRight size={16} />
                </Link>

              </div>

              <div className="p-6">

                {scheduledAppointments.length > 0 ? (

                  <div className="space-y-3">

                    {scheduledAppointments
                      .slice(0, 3)
                      .map((appointment) => (

                        <div
                          key={appointment._id}
                          className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="flex items-start gap-4">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                              <Calendar size={19} />
                            </div>

                            <div>

                              <p className="font-bold text-slate-900">
                                {appointment.service?.name ||
                                  'Government service'}
                              </p>

                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">

                                <span>
                                  {new Date(
                                    appointment.appointmentDate
                                  ).toLocaleDateString()}
                                </span>

                                <span>
                                  {appointment.appointmentTime}
                                </span>

                                <span>
                                  Code:{' '}
                                  <strong className="font-mono text-blue-800">
                                    {appointment.confirmationCode}
                                  </strong>
                                </span>

                              </div>

                            </div>

                          </div>

                          <Link
                            to="/citizen/appointments"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800"
                          >
                            View appointment
                            <ArrowRight size={14} />
                          </Link>

                        </div>

                      ))}

                  </div>

                ) : (

                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                      <Calendar size={24} />
                    </div>

                    <p className="mt-4 font-semibold text-slate-900">
                      No appointments scheduled
                    </p>

                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                      Reserve a convenient date and time for your next government service visit.
                    </p>

                    <Link
                      to="/citizen/appointments"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
                    >
                      <Plus size={16} />
                      Book appointment
                    </Link>

                  </div>

                )}

              </div>

            </section>

            {/* =====================================================
                RECENT TOKENS
            ====================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Queue history
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Recent tokens
                  </h2>
                </div>

                <Link
                  to="/citizen/tokens"
                  className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-800"
                >
                  View all
                  <ArrowRight size={15} />
                </Link>

              </div>

              <div className="p-6">

                {recentTokens.length ? (

                  <div className="space-y-4">

                    {recentTokens.map((token) => (
                      <TokenCard
                        key={token._id}
                        token={token}
                      />
                    ))}

                  </div>

                ) : (

                  <EmptyState
                    title="No tokens found"
                    message="You have not created any queue tokens yet."
                  />

                )}

              </div>

            </section>

            {/* =====================================================
                AVAILABLE SERVICES
            ====================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Government services
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Available services
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Services currently available through govflow.
                  </p>
                </div>

                <Link
                  to="/citizen/services"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800"
                >
                  Browse all services
                  <ArrowRight size={16} />
                </Link>

              </div>

              <div className="p-6">

                {services.length > 0 ? (

                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">

                    {services
                      .slice(0, 3)
                      .map((service) => (

                        <ServiceCard
                          key={service._id}
                          service={service}
                          onTakeToken={() =>
                            navigate('/citizen/services')
                          }
                          isTaking={false}
                        />

                      ))}

                  </div>

                ) : (

                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                      <BriefcaseBusiness size={24} />
                    </div>

                    <p className="mt-4 font-semibold text-slate-900">
                      No services available
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Government services will appear here when available.
                    </p>

                  </div>

                )}

              </div>

            </section>

            {/* =====================================================
                SECURITY / TRUST
            ====================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">

              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:px-7">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <ShieldCheck size={22} />
                </div>

                <div className="flex-1">

                  <div className="flex flex-wrap items-center gap-2">

                    <h3 className="font-bold text-slate-900">
                      Your govflow account
                    </h3>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <CheckCircle2 size={12} />
                      Secure access
                    </span>

                  </div>

                  <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
                    Your authenticated citizen portal provides access to
                    government service information, appointments and
                    digital queue operations.
                  </p>

                </div>

              </div>

            </section>

          </>
        )}

      </div>
    </DashboardLayout>
  );
}