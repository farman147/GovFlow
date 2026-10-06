import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  Send,
  Sparkles,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import {
  getServiceAssistantDetails,
  getServices,
} from '../../api/serviceService';
import { queryAssistant } from '../../api/assistantService';
import { createToken } from '../../api/tokenService';

import ConfirmDialog from '../../components/citizen/ConfirmDialog';
import DashboardLayout from '../../components/citizen/DashboardLayout';
import EmptyState from '../../components/citizen/EmptyState';
import ErrorState from '../../components/citizen/ErrorState';
import LoadingState from '../../components/citizen/LoadingState';

export default function ServicesPage() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [qaInput, setQaInput] = useState('');
  const [qaAnswer, setQaAnswer] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);

  const departmentOptions = useMemo(() => {
    return [
      ...new Set(
        services
          .map((service) => service.department)
          .filter(Boolean)
      ),
    ];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        service.name?.toLowerCase().includes(searchValue) ||
        service.code?.toLowerCase().includes(searchValue) ||
        service.department?.toLowerCase().includes(searchValue);

      const matchesDepartment =
        selectedDepartment === 'all' ||
        service.department === selectedDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [services, search, selectedDepartment]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getServices();

      setServices(response.data?.data?.services || []);
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          'Unable to load available services.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const loadServiceAssistant = async (service) => {
    if (!service?._id) return;

    try {
      setSelectedService(service);
      setDetailsLoading(true);
      setDetailsError('');
      setQaAnswer(null);
      setQaInput('');
      setServiceDetails(null);

      const response = await getServiceAssistantDetails(service._id);

      setServiceDetails(response.data?.data || null);
    } catch (loadError) {
      setDetailsError(
        getApiErrorMessage(
          loadError,
          'Unable to load the service assistant.'
        )
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleQaAsk = async (presetQuery) => {
    const q = String(presetQuery || qaInput).trim();

    if (!q || qaLoading || !selectedService?._id) {
      return;
    }

    try {
      setQaLoading(true);

      const response = await queryAssistant({
        query: q,
        serviceId: selectedService._id,
      });

      setQaAnswer(response.data?.data || null);
    } catch (err) {
      setQaAnswer({
        answer: getApiErrorMessage(
          err,
          'Unable to get an answer from AI.'
        ),
      });
    } finally {
      setQaLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleTakeToken = (service) => {
    if (!service?.isActive) return;

    setSelectedService(service);
    setConfirmOpen(true);
  };

  const handleBookAppointment = (service) => {
    if (!service?.isActive) return;

    navigate('/citizen/appointments', {
      state: {
        bookServiceId: service._id,
      },
    });
  };

  const handleConfirmCreateToken = async () => {
    if (!selectedService?._id) return;

    try {
      setCreating(true);

      const response = await createToken({
        serviceId: selectedService._id,
        priority: 'normal',
      });

      const tokenId = response.data?.data?.token?._id;

      setConfirmOpen(false);
      setSelectedService(null);

      if (tokenId) {
        navigate(`/citizen/tokens/${tokenId}`);
      }
    } catch (createError) {
      setError(
        getApiErrorMessage(
          createError,
          'Unable to create a token for this service.'
        )
      );

      setConfirmOpen(false);
      setSelectedService(null);
    } finally {
      setCreating(false);
    }
  };

  const closeDetails = () => {
    setSelectedService(null);
    setServiceDetails(null);
    setDetailsError('');
    setQaAnswer(null);
    setQaInput('');
  };

  const getDuration = (service) => {
    return (
      service?.averageServiceDuration ||
      service?.averageServiceTime ||
      service?.estimatedProcessingTime ||
      null
    );
  };

  const getFee = (service) => {
    if (!service?.fee) {
      return 'Not recorded';
    }

    if (typeof service.fee === 'string') {
      return service.fee;
    }

    if (typeof service.fee === 'number') {
      return `₹${service.fee}`;
    }

    return JSON.stringify(service.fee);
  };

  return (
    <DashboardLayout
      title="Government Services"
      subtitle="Find the service you need, check live queue information, and choose how you want to proceed."
    >
      <div className="space-y-8">

        {/* =========================================================
            HERO / SEARCH
        ========================================================== */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 text-white shadow-lg md:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 right-20 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative z-10 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <Sparkles size={14} />
              GovFlow Service Center
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              What government service do you need?
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 md:text-base">
              Search available government services, understand the
              requirements, check live queues, and create a queue ticket
              without unnecessary waiting.
            </p>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search service, code or department..."
                  className="w-full rounded-2xl border border-white/20 bg-white px-11 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-white/20"
                />
              </div>

              <select
                value={selectedDepartment}
                onChange={(event) =>
                  setSelectedDepartment(event.target.value)
                }
                className="rounded-2xl border border-white/20 bg-white px-5 py-3.5 text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-white/20"
              >
                <option value="all">All departments</option>

                {departmentOptions.map((department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* =========================================================
            SERVICE COUNT / FILTER SUMMARY
        ========================================================== */}
        {!loading && !error && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Available services
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredServices.length} service
                {filteredServices.length === 1 ? '' : 's'} found
              </p>
            </div>

            {(search || selectedDepartment !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedDepartment('all');
                }}
                className="self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* =========================================================
            SERVICE DETAILS PANEL
        ========================================================== */}
        {selectedService && (
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg">

            {/* Details Header */}
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    <Bot size={13} />
                    AI Service Assistant
                  </span>

                  {selectedService.isActive && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold text-green-700">
                      <CheckCircle2 size={13} />
                      Available
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedService.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedService.department || 'Government service'}
                  {selectedService.code
                    ? ` • ${selectedService.code}`
                    : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleBookAppointment(selectedService)
                  }
                  disabled={!selectedService.isActive}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarDays size={15} />
                  Book appointment
                </button>

                <button
                  type="button"
                  onClick={closeDetails}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <X size={15} />
                  Close
                </button>
              </div>
            </div>

            {detailsLoading ? (
              <div className="p-6">
                <LoadingState
                  title="Loading service information"
                  message="Fetching live queue, counters, appointments and AI information."
                />
              </div>
            ) : detailsError ? (
              <div className="p-6">
                <ErrorState
                  title="Unable to load service information"
                  message={detailsError}
                  onRetry={() =>
                    loadServiceAssistant(selectedService)
                  }
                />
              </div>
            ) : serviceDetails ? (
              <div className="space-y-6 p-5 md:p-6">

                {/* Live Queue */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      Live queue
                    </h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Users size={19} />
                      </div>

                      <p className="text-xs font-medium text-slate-500">
                        People waiting
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {serviceDetails.queue?.waitingCount ?? 0}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                        <Ticket size={19} />
                      </div>

                      <p className="text-xs font-medium text-slate-500">
                        Free counters
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {serviceDetails.queue?.availableCounterCount ?? 0}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Ticket size={19} />
                      </div>

                      <p className="text-xs font-medium text-slate-500">
                        Serving now
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {serviceDetails.queue?.currentlyServingToken ||
                          '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <Clock3 size={19} />
                      </div>

                      <p className="text-xs font-medium text-slate-500">
                        Queue status
                      </p>

                      <p className="mt-1 text-lg font-bold capitalize text-slate-900">
                        {serviceDetails.queue?.currentQueueStatus ||
                          'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Information */}
                <div className="grid gap-5 xl:grid-cols-2">

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <FileText size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          Service information
                        </h3>

                        <p className="text-xs text-slate-500">
                          Information currently available in GovFlow
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">
                          Department
                        </span>

                        <span className="text-right font-semibold text-slate-900">
                          {serviceDetails.service?.department ||
                            'Not recorded'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">
                          Service fee
                        </span>

                        <span className="text-right font-semibold text-slate-900">
                          {getFee(serviceDetails.service)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">
                          Expected duration
                        </span>

                        <span className="text-right font-semibold text-slate-900">
                          {getDuration(serviceDetails.service)
                            ? `${getDuration(
                                serviceDetails.service
                              )} min`
                            : 'Not recorded'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">
                          Operating hours
                        </span>

                        <span className="text-right font-semibold text-slate-900">
                          {typeof serviceDetails.service
                            ?.operatingHours === 'string'
                            ? serviceDetails.service.operatingHours
                            : serviceDetails.service
                                  ?.operatingHours
                              ? JSON.stringify(
                                  serviceDetails.service
                                    .operatingHours
                                )
                              : 'Not recorded'}
                        </span>
                      </div>
                    </div>

                    <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {serviceDetails.service?.description ||
                        'No service description is currently available.'}
                    </p>
                  </div>

                  {/* AI Recommendation */}
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <Sparkles size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          AI visit recommendation
                        </h3>

                        <p className="text-xs text-slate-500">
                          Based on available forecast information
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-sm leading-6 text-slate-700">
                        {serviceDetails.ai
                          ?.recommendedVisitPeriod ||
                          'No recommendation is currently available.'}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-white/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Forecast
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {serviceDetails.ai?.forecast?.summary ||
                          'Forecast unavailable.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents + Counters */}
                <div className="grid gap-5 xl:grid-cols-2">

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <FileText size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          Required documents
                        </h3>

                        <p className="text-xs text-slate-500">
                          Check these before visiting
                        </p>
                      </div>
                    </div>

                    {serviceDetails.service
                      ?.requiredDocuments?.length ? (
                      <ul className="mt-5 space-y-2">
                        {serviceDetails.service.requiredDocuments.map(
                          (doc) => (
                            <li
                              key={doc}
                              className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
                            >
                              <CheckCircle2
                                size={16}
                                className="mt-0.5 shrink-0 text-emerald-600"
                              />

                              <span>{doc}</span>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="mt-5 text-sm text-slate-500">
                        No document list is currently recorded for
                        this service.
                      </p>
                    )}

                    {serviceDetails.service?.eligibility
                      ?.length ? (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Eligibility
                        </p>

                        <ul className="mt-3 space-y-2">
                          {serviceDetails.service.eligibility.map(
                            (item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2 text-sm text-slate-700"
                              >
                                <CheckCircle2
                                  size={15}
                                  className="mt-0.5 shrink-0 text-emerald-600"
                                />

                                <span>{item}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Ticket size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          Current counters
                        </h3>

                        <p className="text-xs text-slate-500">
                          Live counter information
                        </p>
                      </div>
                    </div>

                    {serviceDetails.counters?.length ? (
                      <div className="mt-5 space-y-3">
                        {serviceDetails.counters.map((counter) => (
                          <div
                            key={counter._id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-slate-900">
                                {counter.counterNumber}
                              </span>

                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                {counter.status}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-600">
                              Current token:{' '}
                              <span className="font-semibold text-slate-900">
                                {counter.currentToken
                                  ?.tokenNumber ||
                                  'No active token'}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm text-slate-500">
                        No counters are currently linked to this
                        service.
                      </p>
                    )}
                  </div>
                </div>

                {/* Appointments + Forecast */}
                <div className="grid gap-5 xl:grid-cols-2">

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                        <CalendarDays size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          Today's appointments
                        </h3>

                        <p className="text-xs text-slate-500">
                          Scheduled appointments for this service
                        </p>
                      </div>
                    </div>

                    {serviceDetails.appointments?.length ? (
                      <div className="mt-5 space-y-3">
                        {serviceDetails.appointments.map(
                          (appointment) => (
                            <div
                              key={appointment._id}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <p className="font-semibold text-slate-900">
                                {appointment.appointmentDate
                                  ? new Date(
                                      appointment.appointmentDate
                                    ).toLocaleDateString()
                                  : 'Date unavailable'}{' '}
                                at {appointment.appointmentTime}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                Status: {appointment.status}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Confirmation:{" "}
                                {appointment.confirmationCode ||
                                  'Unavailable'}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm text-slate-500">
                        No appointments are scheduled for this
                        service today.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <Sparkles size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          Future demand forecast
                        </h3>

                        <p className="text-xs text-slate-500">
                          AI forecast information from the backend
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Peak predicted hour
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {serviceDetails.ai?.forecast
                            ?.peakHour || 'Unavailable'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Peak demand
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {serviceDetails.ai?.forecast
                            ?.peakDemand ?? 'Unavailable'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Low-demand period
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {serviceDetails.ai?.forecast
                            ?.lowDemandHour || 'Unavailable'}
                        </p>
                      </div>

                      {serviceDetails.ai?.forecast?.next24Hours
                        ?.length ? (
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-500">
                            Next 24-hour demand
                          </p>

                          <div className="mt-3 space-y-2">
                            {serviceDetails.ai.forecast.next24Hours
                              .slice(0, 6)
                              .map((item) => (
                                <div
                                  key={item.hour}
                                  className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm last:border-0"
                                >
                                  <span className="text-slate-600">
                                    {item.hour}
                                  </span>

                                  <span className="font-semibold text-slate-900">
                                    {item.value}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* =====================================================
                    AI Q&A
                ====================================================== */}
                <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">

                  <div className="border-b border-emerald-100 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                        <Bot size={21} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          Ask GovFlow AI
                        </h3>

                        <p className="text-xs text-slate-500">
                          Ask questions about this government service.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">

                    {/* Quick questions */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        `What documents are required for ${selectedService.name}?`,
                        `What is the fee for ${selectedService.name}?`,
                        `What is the staff email for ${selectedService.name}?`,
                        'When is the best time to visit based on TFT?',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleQaAsk(prompt)}
                          disabled={qaLoading}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    {/* Answer */}
                    {qaAnswer && (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                          <Sparkles size={14} />
                          AI response
                        </div>

                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {qaAnswer.answer ||
                            'No answer was returned.'}
                        </p>

                        {qaAnswer.tftForecast && (
                          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                            Optimal visit time according to TFT:{' '}
                            <strong>
                              {qaAnswer.tftForecast.lowDemandHour}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Input */}
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleQaAsk();
                      }}
                      className="mt-5 flex gap-2"
                    >
                      <input
                        type="text"
                        value={qaInput}
                        onChange={(event) =>
                          setQaInput(event.target.value)
                        }
                        disabled={qaLoading}
                        placeholder={`Ask about ${selectedService.name}...`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />

                      <button
                        type="submit"
                        disabled={!qaInput.trim() || qaLoading}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Send size={15} />
                        {qaLoading ? 'Thinking...' : 'Ask'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={() =>
                      handleBookAppointment(selectedService)
                    }
                    disabled={!selectedService.isActive}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CalendarDays size={17} />
                    Book appointment
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleTakeToken(selectedService)
                    }
                    disabled={!selectedService.isActive}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Ticket size={17} />
                    Take queue token
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* =========================================================
            SERVICE LIST
        ========================================================== */}
        {loading ? (
          <LoadingState
            title="Loading services"
            message="Fetching the current GovFlow service catalog."
          />
        ) : error ? (
          <ErrorState
            title="Unable to load services"
            message={error}
            onRetry={loadServices}
          />
        ) : filteredServices.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {filteredServices.map((service) => {
              const duration = getDuration(service);

              return (
                <article
                  key={service._id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                >
                  {/* Card top */}
                  <div className="p-5">

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <FileText size={21} />
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          service.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {service.isActive
                          ? 'Available'
                          : 'Unavailable'}
                      </span>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        {service.department ||
                          'Government department'}
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-slate-900">
                        {service.name}
                      </h3>

                      {service.code && (
                        <p className="mt-1 text-xs text-slate-400">
                          Service code: {service.code}
                        </p>
                      )}
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {service.description ||
                        'Government service information is available through the service assistant.'}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-2">

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock3 size={14} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Duration
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {duration
                            ? `${duration} min`
                            : 'Not recorded'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <FileText size={14} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Fee
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm font-bold text-slate-900">
                          {getFee(service)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="mt-auto border-t border-slate-100 bg-slate-50/50 p-4">

                    <button
                      type="button"
                      onClick={() =>
                        loadServiceAssistant(service)
                      }
                      className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Bot size={15} />
                      View service & AI assistant
                    </button>

                    <div className="grid grid-cols-2 gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          handleBookAppointment(service)
                        }
                        disabled={!service.isActive}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CalendarDays size={14} />
                        Appointment
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleTakeToken(service)
                        }
                        disabled={!service.isActive}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Ticket size={14} />
                        Take token
                      </button>

                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No services found"
            message="There are no active services matching your current search or department filter."
          />
        )}

        {/* =========================================================
            BOTTOM AI INFO
        ========================================================== */}
        {!loading && !error && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Sparkles size={21} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    GovFlow AI assistance
                  </h3>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Use the service assistant to understand required
                    documents, service information, live queue
                    conditions, appointments and available forecast
                    information.
                  </p>
                </div>
              </div>

              <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                <CheckCircle2
                  size={14}
                  className="text-emerald-600"
                />
                Connected to GovFlow backend
              </div>
            </div>
          </section>
        )}
      </div>

      {/* =========================================================
          TOKEN CONFIRMATION
      ========================================================== */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Create a token?"
        message={`You are about to take a token for ${
          selectedService?.name || 'this service'
        }. This will create a real queue request in the GovFlow backend.`}
        confirmLabel="Create token"
        onConfirm={handleConfirmCreateToken}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedService(null);
        }}
        loading={creating}
      />
    </DashboardLayout>
  );
}