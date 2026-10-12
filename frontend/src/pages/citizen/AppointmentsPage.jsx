import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  User,
  X,
} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import {
  getMyAppointments,
  createAppointment,
  cancelAppointment,
  checkInAppointment,
} from '../../api/appointmentService';
import { getServices } from '../../api/serviceService';

import { useAuth } from '../../context/AuthContext';

import DashboardLayout from '../../components/citizen/DashboardLayout';
import EmptyState from '../../components/citizen/EmptyState';
import LoadingState from '../../components/citizen/LoadingState';
import StatusBadge from '../../components/citizen/StatusBadge';
import ConfirmDialog from '../../components/citizen/ConfirmDialog';

const timeSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
];

const statusFilters = [
  { value: 'all', label: 'All appointments' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Booking modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Cancel dialog
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Check-in
  const [checkingInId, setCheckingInId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load the service catalog independently so an appointments API
      // failure cannot leave the booking dropdown empty.
      const [apptResult, serviceResult] = await Promise.allSettled([
        getMyAppointments(),
        getServices(),
      ]);

      if (apptResult.status === 'fulfilled') {
        setAppointments(
          apptResult.value.data?.data?.appointments || []
        );
      } else {
        setError(
          getApiErrorMessage(
            apptResult.reason,
            'Unable to load your appointments.'
          )
        );
      }

      if (serviceResult.status === 'fulfilled') {
        setServices(
          serviceResult.value.data?.data?.services || []
        );
      } else {
        setServices([]);
        setModalError(
          getApiErrorMessage(
            serviceResult.reason,
            'Unable to load government services. Please try again.'
          )
        );
      }
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          'Unable to load your appointments.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (location.state?.bookServiceId) {
      setSelectedServiceId(location.state.bookServiceId);
      setBookModalOpen(true);
    }
  }, [location.state]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchesStatus =
        statusFilter === 'all' ||
        appointment.status === statusFilter;

      const matchesSearch =
        !query ||
        appointment.service?.name
          ?.toLowerCase()
          .includes(query) ||
        appointment.confirmationCode
          ?.toLowerCase()
          .includes(query) ||
        appointment.applicantName
          ?.toLowerCase()
          .includes(query) ||
        appointment.citizen?.name
          ?.toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [appointments, statusFilter, searchQuery]);

  const scheduledCount = appointments.filter(
    (appointment) =>
      appointment.status === 'scheduled'
  ).length;

  const checkedInCount = appointments.filter(
    (appointment) =>
      appointment.status === 'checked_in'
  ).length;

  const completedCount = appointments.filter(
    (appointment) =>
      appointment.status === 'completed'
  ).length;

  const cancelledCount = appointments.filter(
    (appointment) =>
      appointment.status === 'cancelled'
  ).length;

  const handleOpenBookModal = (prefillServiceId = '') => {
    if (prefillServiceId) {
      setSelectedServiceId(prefillServiceId);
    } else if (services.length && !selectedServiceId) {
      setSelectedServiceId(services[0]._id);
    }

    setApplicantName(user?.name || '');
    setPhone(user?.phone || '');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setAppointmentDate(
      tomorrow.toISOString().slice(0, 10)
    );

    setAppointmentTime('10:00');
    setNotes('');
    setModalError('');
    setBookModalOpen(true);
  };

  const handleBookSubmit = async (event) => {
    event.preventDefault();

    if (!selectedServiceId) {
      setModalError(
        'Please select a government service.'
      );
      return;
    }

    if (!appointmentDate) {
      setModalError(
        'Please select an appointment date.'
      );
      return;
    }

    if (!appointmentTime) {
      setModalError(
        'Please select an appointment time.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      await createAppointment({
        serviceId: selectedServiceId,
        appointmentDate,
        appointmentTime,
        applicantName:
          applicantName.trim() ||
          user?.name ||
          'Citizen',
        phone: phone.trim(),
        notes: notes.trim(),
      });

      setBookModalOpen(false);

      await loadData();
    } catch (submitError) {
      setModalError(
        getApiErrorMessage(
          submitError,
          'Unable to schedule appointment.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingAppt?._id) {
      return;
    }

    try {
      setCancelling(true);

      await cancelAppointment(
        cancellingAppt._id
      );

      setCancelModalOpen(false);
      setCancellingAppt(null);

      await loadData();
    } catch (cancelError) {
      setError(
        getApiErrorMessage(
          cancelError,
          'Unable to cancel appointment.'
        )
      );

      setCancelModalOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleCheckIn = async (appointment) => {
    try {
      setCheckingInId(appointment._id);
      setError('');

      const response =
        await checkInAppointment(
          appointment._id
        );

      const token =
        response.data?.data?.token;

      if (token?._id) {
        navigate(
          `/citizen/tokens/${token._id}`
        );
      } else {
        await loadData();
      }
    } catch (checkInError) {
      setError(
        getApiErrorMessage(
          checkInError,
          'Unable to check in for this appointment.'
        )
      );
    } finally {
      setCheckingInId(null);
    }
  };

  const isToday = (dateString) => {
    if (!dateString) {
      return false;
    }

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const date =
      new Date(dateString)
        .toISOString()
        .slice(0, 10);

    return today === date;
  };

  const todayStr = new Date()
    .toISOString()
    .slice(0, 10);

  return (
    <DashboardLayout
      title="Appointments"
      subtitle="Schedule and manage your reserved visits for government services."
    >
      <div className="space-y-7">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white sm:px-8">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="mb-3 flex items-center gap-2">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    <Calendar size={19} />
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                    govflow Citizen Portal
                  </span>

                </div>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Your appointments
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Book a convenient time for government services,
                  manage your scheduled visits and check in when you
                  arrive.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  handleOpenBookModal()
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                <Plus size={17} />
                Book appointment
              </button>

            </div>

          </div>

          {/* Summary row */}

          <div className="grid divide-y divide-slate-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">

            <div className="flex items-center gap-4 px-6 py-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                <Calendar size={21} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Total appointments
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {appointments.length}
                </p>
              </div>

            </div>

            <div className="flex items-center gap-4 px-6 py-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Clock3 size={21} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Scheduled
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {scheduledCount}
                </p>
              </div>

            </div>

            <div className="flex items-center gap-4 px-6 py-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <CheckCircle2 size={21} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Checked in
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {checkedInCount}
                </p>
              </div>

            </div>

            <div className="flex items-center gap-4 px-6 py-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileText size={21} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Completed
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {completedCount}
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-bold">
                Something went wrong
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>

          </div>
        )}

        {/* =====================================================
            FILTER + SEARCH
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-5">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
                  Appointment management
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Your scheduled visits
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  handleOpenBookModal()
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                <Plus size={17} />
                New appointment
              </button>

            </div>

            {/* Search */}

            <div className="relative">

              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search by service, confirmation code or applicant name..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              />

            </div>

            {/* Filters */}

            <div className="flex flex-wrap gap-2">

              {statusFilters.map(
                (filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        filter.value
                      )
                    }
                    className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                      statusFilter ===
                      filter.value
                        ? 'bg-blue-900 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                )
              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            CONTENT
        ====================================================== */}

        {loading ? (

          <LoadingState
            title="Loading your appointments"
            message="Retrieving your scheduled government service appointments."
          />

        ) : filteredAppointments.length === 0 ? (

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <EmptyState
              title="No appointments found"
              message={
                statusFilter === 'all'
                  ? "You don't have any appointments booked yet. Book a convenient time for your next government service."
                  : `You don't have any appointments with status "${statusFilter.replace(
                      '_',
                      ' '
                    )}".`
              }
              action={
                <button
                  type="button"
                  onClick={() =>
                    handleOpenBookModal()
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  <Plus size={16} />
                  Book appointment
                </button>
              }
            />

          </section>

        ) : (

          <section>

            <div className="mb-4 flex items-center justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
                  Results
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {filteredAppointments.length}{' '}
                  {filteredAppointments.length === 1
                    ? 'appointment'
                    : 'appointments'}
                </h2>
              </div>

            </div>

            <div className="grid gap-5 lg:grid-cols-2">

              {filteredAppointments.map(
                (appointment) => {

                  const appointmentIsToday =
                    isToday(
                      appointment.appointmentDate
                    );

                  const displayName =
                    appointment.applicantName ||
                    appointment.citizen?.name ||
                    user?.name ||
                    'Citizen';

                  return (
                    <article
                      key={appointment._id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >

                      {/* Appointment top */}

                      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">

                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-900">
                                {appointment.service
                                  ?.department ||
                                  'Department'}
                              </span>

                            </div>

                            <h3 className="mt-2 text-lg font-bold text-slate-950">
                              {appointment.service
                                ?.name ||
                                'Government service'}
                            </h3>

                          </div>

                          <StatusBadge
                            status={
                              appointment.status
                            }
                          />

                        </div>

                      </div>

                      {/* Main information */}

                      <div className="space-y-5 p-6">

                        {/* Date card */}

                        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white">
                            <CalendarDays
                              size={21}
                            />
                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                              Appointment
                            </p>

                            <p className="mt-1 font-bold text-slate-950">
                              {new Date(
                                appointment.appointmentDate
                              ).toLocaleDateString(
                                undefined,
                                {
                                  weekday:
                                    'short',
                                  year:
                                    'numeric',
                                  month:
                                    'short',
                                  day:
                                    'numeric',
                                }
                              )}
                            </p>

                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">

                              <Clock3
                                size={14}
                              />

                              {appointment.appointmentTime}

                            </p>

                          </div>

                          {appointmentIsToday && (
                            <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                              Today
                            </span>
                          )}

                        </div>

                        {/* Details */}

                        <div className="grid gap-3 sm:grid-cols-2">

                          <div className="rounded-xl border border-slate-200 p-4">

                            <div className="flex items-center gap-2 text-slate-500">

                              <User size={15} />

                              <span className="text-xs font-semibold uppercase tracking-wide">
                                Applicant
                              </span>

                            </div>

                            <p className="mt-2 font-bold text-slate-900">
                              {displayName}
                            </p>

                          </div>

                          <div className="rounded-xl border border-slate-200 p-4">

                            <div className="flex items-center gap-2 text-slate-500">

                              <ShieldCheck
                                size={15}
                              />

                              <span className="text-xs font-semibold uppercase tracking-wide">
                                Confirmation
                              </span>

                            </div>

                            <p className="mt-2 break-all font-mono font-bold text-blue-900">
                              {appointment.confirmationCode ||
                                'Pending'}
                            </p>

                          </div>

                        </div>

                        {appointment.phone && (
                          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">

                            <span className="text-slate-500">
                              Contact phone
                            </span>

                            <span className="font-semibold text-slate-800">
                              {appointment.phone}
                            </span>

                          </div>
                        )}

                        {appointment.notes && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                            <div className="flex items-center gap-2 text-slate-500">

                              <FileText
                                size={15}
                              />

                              <span className="text-xs font-semibold uppercase tracking-wide">
                                Notes
                              </span>

                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {appointment.notes}
                            </p>

                          </div>
                        )}

                        {/* Token */}

                        {appointment.token && (
                          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                              <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                                  <Ticket
                                    size={18}
                                  />
                                </div>

                                <div>

                                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                                    Queue token
                                  </p>

                                  <p className="mt-1 font-bold text-violet-950">
                                    {appointment.token
                                      .tokenNumber ||
                                      'Token Active'}
                                  </p>

                                </div>

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/citizen/tokens/${
                                      appointment
                                        .token
                                        ._id ||
                                      appointment.token
                                    }`
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-800 hover:text-violet-950"
                              >
                                View tracker
                                <ArrowRight
                                  size={15}
                                />
                              </button>

                            </div>

                          </div>
                        )}

                      </div>

                      {/* Actions */}

                      {appointment.status ===
                        'scheduled' && (
                        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

                          <button
                            type="button"
                            onClick={() => {
                              setCancellingAppt(
                                appointment
                              );
                              setCancelModalOpen(
                                true
                              );
                            }}
                            className="text-sm font-bold text-rose-600 hover:text-rose-700"
                          >
                            Cancel appointment
                          </button>

                          {appointmentIsToday ? (

                            <button
                              type="button"
                              onClick={() =>
                                handleCheckIn(
                                  appointment
                                )
                              }
                              disabled={
                                checkingInId ===
                                appointment._id
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >

                              <CheckCircle2
                                size={16}
                              />

                              {checkingInId ===
                              appointment._id
                                ? 'Checking in...'
                                : 'Check in today'}

                            </button>

                          ) : (

                            <div className="text-right">

                              <p className="text-xs text-slate-500">
                                Check-in available on
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-slate-700">
                                {new Date(
                                  appointment.appointmentDate
                                ).toLocaleDateString()}
                              </p>

                            </div>

                          )}

                        </div>
                      )}

                    </article>
                  );
                }
              )}

            </div>

          </section>

        )}

        {/* =====================================================
            INFORMATION CARD
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldCheck size={22} />
            </div>

            <div className="flex-1">

              <h3 className="font-bold text-slate-900">
                Appointment guidance
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep your confirmation code available when visiting
                the government office. If your appointment is scheduled
                for today, you can use the check-in option when
                available.
              </p>

            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">

              <CheckCircle2 size={16} />

              Secure booking

            </div>

          </div>

        </section>

      </div>

      {/* =======================================================
          BOOK APPOINTMENT MODAL
      ======================================================== */}

      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal header */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <div className="flex items-center gap-2">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-900">
                    <Calendar size={18} />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
                    govflow appointment
                  </span>

                </div>

                <h3 className="mt-2 text-xl font-bold text-slate-950">
                  Book a service appointment
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Choose the government service, date and available
                  time slot.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setBookModalOpen(false)
                }
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>

            </div>

            {modalError && (
              <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">

                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0"
                />

                <span>{modalError}</span>

              </div>
            )}

            <form
              onSubmit={handleBookSubmit}
              className="space-y-5 p-6"
            >

              {/* Service */}

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  Government service *
                </label>

                <select
                  value={selectedServiceId}
                  onChange={(event) =>
                    setSelectedServiceId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                  disabled={!services.length}
                >

                  <option value="">
                    {services.length
                      ? 'Select a government service'
                      : 'No government services are available'}
                  </option>

                  {services.map((service) => (
                    <option
                      key={service._id}
                      value={service._id}
                    >
                      {service.name} (
                      {service.code}) -{' '}
                      {service.department}
                    </option>
                  ))}

                </select>

                {!services.length && (
                  <p className="mt-2 text-sm text-amber-700" role="status">
                    The service list is empty. Please try again later or contact your administrator to add active services.
                  </p>
                )}

              </div>

              {/* Applicant */}

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  Applicant full name *
                </label>

                <input
                  type="text"
                  value={applicantName}
                  onChange={(event) =>
                    setApplicantName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                />

              </div>

              {/* Phone */}

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  Contact phone number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />

              </div>

              {/* Date & time */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                    Appointment date *
                  </label>

                  <input
                    type="date"
                    min={todayStr}
                    value={appointmentDate}
                    onChange={(event) =>
                      setAppointmentDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                    required
                  />

                </div>

                <div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                    Time slot *
                  </label>

                  <select
                    value={appointmentTime}
                    onChange={(event) =>
                      setAppointmentTime(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                    required
                  >

                    {timeSlots.map(
                      (slot) => (
                        <option
                          key={slot}
                          value={slot}
                        >
                          {slot}{' '}
                          {Number(
                            slot.split(':')[0]
                          ) < 12
                            ? 'AM'
                            : 'PM'}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              {/* Notes */}

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  Purpose / notes
                  <span className="ml-1 font-normal normal-case text-slate-400">
                    Optional
                  </span>
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Add any useful information about your visit..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />

              </div>

              {/* Actions */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setBookModalOpen(false)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >

                  <Calendar size={16} />

                  {submitting
                    ? 'Booking appointment...'
                    : 'Confirm appointment'}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =======================================================
          CANCEL CONFIRMATION
      ======================================================== */}

      <ConfirmDialog
        isOpen={cancelModalOpen}
        title="Cancel this appointment?"
        message={`Are you sure you want to cancel your appointment for ${
          cancellingAppt?.service?.name ||
          'this service'
        } on ${
          cancellingAppt?.appointmentDate
            ? new Date(
                cancellingAppt.appointmentDate
              ).toLocaleDateString()
            : 'the scheduled date'
        }?`}
        confirmLabel="Yes, Cancel Appointment"
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancellingAppt(null);
        }}
        loading={cancelling}
      />

    </DashboardLayout>
  );
}
