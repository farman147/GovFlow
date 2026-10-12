import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Ticket, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/axios';
import { getCounterById, getCounters, updateCounterStatus } from '../../api/counterService';
import { callNextToken, callToken, completeToken, getQueueByService, skipToken, startToken } from '../../api/tokenService';
import { getStaffAppointments } from '../../api/staffService';
import { checkInAppointment } from '../../api/appointmentService';
import CurrentTokenCard from '../../components/staff/CurrentTokenCard';
import CounterCard from '../../components/staff/CounterCard';
import QueueList from '../../components/staff/QueueList';
import StaffDashboardLayout from '../../components/staff/StaffDashboardLayout';
import EmptyState from '../../components/citizen/EmptyState';
import ErrorState from '../../components/citizen/ErrorState';
import LoadingState from '../../components/citizen/LoadingState';
import StatusBadge from '../../components/citizen/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const actionMap = {
  call: callToken,
  start: startToken,
  complete: completeToken,
  skip: skipToken,
};

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const [counters, setCounters] = useState([]);
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [checkingInApptId, setCheckingInApptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const staffId = user?._id || user?.id;

  const assignedCounters = useMemo(
    () => {
      const direct = counters.filter((counter) =>
        Array.isArray(counter.assignedStaff) &&
        counter.assignedStaff.some((staff) => String(staff._id || staff) === String(staffId))
      );
      if (direct.length > 0) return direct;
      if (user?.department) {
        const byDept = counters.filter((counter) => counter.department === user.department);
        if (byDept.length > 0) return byDept;
      }
      return counters;
    },
    [counters, staffId, user?.department]
  );

  const selectedCounter = useMemo(
    () => assignedCounters.find((counter) => String(counter._id) === String(selectedCounterId)) || assignedCounters[0] || null,
    [assignedCounters, selectedCounterId]
  );

  const selectedService = useMemo(() => {
    if (!selectedCounter) return null;
    const serviceList = Array.isArray(selectedCounter.services) ? selectedCounter.services : [];
    return serviceList.find((service) => String(service._id) === String(selectedServiceId)) || serviceList[0] || null;
  }, [selectedCounter, selectedServiceId]);

  const loadAssignedCounters = async () => {
    try {
      setLoading(true);
      setError('');
      const [counterRes, apptRes] = await Promise.all([
        getCounters(),
        getStaffAppointments().catch(() => ({ data: { data: { appointments: [] } } }))
      ]);

      const counterList = counterRes.data?.data?.counters || [];
      setCounters(counterList);
      setAppointments(apptRes.data?.data?.appointments || []);

      let nextAssigned = counterList.filter(
        (counter) =>
          Array.isArray(counter.assignedStaff) &&
          counter.assignedStaff.some((staff) => String(staff._id || staff) === String(staffId))
      );

      if (!nextAssigned.length && user?.department) {
        nextAssigned = counterList.filter((counter) => counter.department === user.department);
      }

      if (!nextAssigned.length) {
        nextAssigned = counterList;
      }

      if (!nextAssigned.length) {
        setSelectedCounterId('');
        setQueue([]);
        return;
      }

      const firstCounter = nextAssigned[0];
      const firstCounterId = firstCounter._id;
      const counterServiceList = Array.isArray(firstCounter.services) ? firstCounter.services : [];
      const firstServiceId = counterServiceList[0]?._id || '';

      setSelectedCounterId(firstCounterId);
      setSelectedServiceId(firstServiceId);

      if (firstCounterId) {
        const counterDetail = await getCounterById(firstCounterId);
        const detailCounter = counterDetail.data?.data?.counter || firstCounter;
        setCounters((current) => {
          const updated = current.map((item) => String(item._id) === String(detailCounter._id) ? detailCounter : item);
          return updated.length ? updated : current;
        });
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load assigned counters.'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckIn = async (appointmentId) => {
    try {
      setCheckingInApptId(appointmentId);
      setError('');
      await checkInAppointment(appointmentId);
      setActionMessage('Appointment checked in and added to queue successfully.');
      const apptRes = await getStaffAppointments();
      setAppointments(apptRes.data?.data?.appointments || []);
      if (selectedCounter && selectedService) {
        await loadQueue(selectedCounter._id, selectedService._id);
      }
    } catch (checkInErr) {
      setError(getApiErrorMessage(checkInErr, 'Unable to check in appointment.'));
    } finally {
      setCheckingInApptId(null);
    }
  };

  const loadQueue = async (counterId = selectedCounterId, serviceId = selectedServiceId) => {
    if (!counterId || !serviceId) {
      setQueue([]);
      return;
    }

    try {
      const response = await getQueueByService(serviceId);
      setQueue(response.data?.data?.tokens || []);
    } catch (queueError) {
      const message = getApiErrorMessage(queueError, 'Unable to load queue.');
      setError(message);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAssignedCounters();
  }, [user]);

  useEffect(() => {
    if (!selectedCounterId || !selectedServiceId) return;
    loadQueue(selectedCounterId, selectedServiceId);
  }, [selectedCounterId, selectedServiceId]);

  useEffect(() => {
    if (!selectedCounterId || !selectedServiceId) return undefined;

    const intervalId = setInterval(() => {
      loadQueue(selectedCounterId, selectedServiceId);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [selectedCounterId, selectedServiceId]);

  const handleSelectCounter = async (counter) => {
    const counterId = counter?._id;
    if (!counterId) return;

    setSelectedCounterId(counterId);

    const serviceList = Array.isArray(counter.services) ? counter.services : [];
    setSelectedServiceId(serviceList[0]?._id || '');
    setActionMessage('');

    if (counterId) {
      try {
        const counterResponse = await getCounterById(counterId);
        const detail = counterResponse.data?.data?.counter || counter;
        setCounters((current) =>
          current.map((item) => (String(item._id) === String(detail._id) ? detail : item))
        );
      } catch {
        // ignore detail fetch failure; queue still loads from service selection
      }
    }
  };

  const handleCallNext = async () => {
    if (!selectedCounter || !selectedService) {
      setError('Select a counter and service before calling the next token.');
      return;
    }

    try {
      setRefreshing(true);
      setActionMessage('');
      await callNextToken(selectedService._id, { counterId: selectedCounter._id });
      setActionMessage('Next token called successfully.');
      await loadQueue(selectedCounter._id, selectedService._id);
    } catch (callError) {
      setError(getApiErrorMessage(callError, 'Unable to call the next token.'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleTokenAction = async (tokenId, action) => {
    if (!tokenId) return;

    const actionFn = actionMap[action];
    if (!actionFn) return;

    try {
      setRefreshing(true);
      setActionMessage('');
      await actionFn(tokenId, selectedCounter ? { counterId: selectedCounter._id } : {});
      setActionMessage(`${action.charAt(0).toUpperCase() + action.slice(1)} action completed successfully.`);
      if (selectedCounter && selectedService) {
        await loadQueue(selectedCounter._id, selectedService._id);
      }

      if (selectedCounter?._id) {
        const detail = await getCounterById(selectedCounter._id);
        const updatedCounter = detail.data?.data?.counter || selectedCounter;
        setCounters((current) =>
          current.map((item) => (String(item._id) === String(updatedCounter._id) ? updatedCounter : item))
        );
      }
    } catch (tokenActionError) {
      setError(getApiErrorMessage(tokenActionError, `Unable to ${action} the token.`));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSetCounterStatus = async (status) => {
    if (!selectedCounter?._id) return;

    try {
      setRefreshing(true);
      setActionMessage('');
      await updateCounterStatus(selectedCounter._id, status);
      setActionMessage(`Counter status updated to ${status}.`);
      const detail = await getCounterById(selectedCounter._id);
      const updatedCounter = detail.data?.data?.counter || selectedCounter;
      setCounters((current) => current.map((item) => (String(item._id) === String(updatedCounter._id) ? updatedCounter : item)));
    } catch (statusError) {
      setError(getApiErrorMessage(statusError, 'Unable to update counter status.'));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <StaffDashboardLayout title="Staff dashboard" subtitle="Loading assigned counters and live queue data.">
        <LoadingState title="Loading staff dashboard" message="Retrieving your assigned counters and queue information." />
      </StaffDashboardLayout>
    );
  }

  if (!assignedCounters.length) {
    return (
      <StaffDashboardLayout title="Staff dashboard" subtitle="No counters assigned to your account.">
        <EmptyState
          title="No assigned counter"
          message="Your staff account is not currently assigned to any counter in the govflow backend."
        />
      </StaffDashboardLayout>
    );
  }

  if (error && !selectedCounter) {
    return (
      <StaffDashboardLayout title="Staff dashboard" subtitle="Unable to load counter information.">
        <ErrorState title="Unable to load staff dashboard" message={error} onRetry={loadAssignedCounters} />
      </StaffDashboardLayout>
    );
  }

  const currentToken = selectedCounter?.currentToken || null;

  return (
    <StaffDashboardLayout title="Staff dashboard" subtitle="Manage the assigned counter queue and service requests in real time." onRefresh={loadAssignedCounters} refreshing={refreshing}>
      <div className="space-y-6">
        {actionMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {actionMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Welcome</p>
          <h2 className="mt-3 text-3xl font-bold">{user?.name || 'Staff member'}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            Monitor your assigned counter, serve active requests, and manage waiting tokens using the live govflow backend.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignedCounters.map((counter) => (
            <CounterCard
              key={counter._id}
              counter={counter}
              isSelected={String(counter._id) === String(selectedCounterId)}
              onSelect={handleSelectCounter}
            />
          ))}
        </div>

        {selectedCounter ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Assigned counter</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedCounter.counterNumber}</h3>
                  </div>
                  <StatusBadge status={selectedCounter.status === 'available' ? 'waiting' : selectedCounter.status === 'busy' ? 'in_service' : 'skipped'} />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Counter name</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{selectedCounter.name}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Department</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{selectedCounter.department}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSetCounterStatus('available')}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCounterStatus('busy')}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Busy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCounterStatus('offline')}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Offline
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Queue management</h3>
                  {selectedService ? (
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <BriefcaseBusiness size={16} className="text-slate-500" />
                      {selectedService.name}
                    </div>
                  ) : null}
                </div>

                {selectedCounter.services?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCounter.services.map((service) => (
                      <button
                        key={service._id}
                        type="button"
                        onClick={() => setSelectedServiceId(service._id)}
                        className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                          String(service._id) === String(selectedServiceId)
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {service.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-500">No service assignments are available for this counter.</div>
                )}

                {selectedService ? (
                  <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Selected service</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{selectedService.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCallNext}
                      disabled={!selectedCounter || !selectedService || refreshing}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Ticket size={16} />
                      Call Next
                    </button>
                  </div>
                ) : null}

                <div className="mt-5">
                  {selectedService ? (
                    <QueueList
                      queue={queue}
                      serviceName={selectedService.name}
                      onAction={(token, action) => handleTokenAction(token._id, action)}
                      disabled={refreshing}
                    />
                  ) : (
                    <EmptyState title="No service selected" message="This counter has no assigned service information in the backend yet." />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <CurrentTokenCard
                currentToken={currentToken}
                serviceName={selectedService?.name || (currentToken?.service && typeof currentToken.service === 'object' ? currentToken.service.name : null)}
                departmentName={selectedCounter.department}
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Available actions</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span>Call next customer</span>
                    <ArrowRight size={16} className="text-slate-500" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span>Start service</span>
                    <ArrowRight size={16} className="text-slate-500" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span>Complete token</span>
                    <ArrowRight size={16} className="text-slate-500" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span>Skip token</span>
                    <ArrowRight size={16} className="text-slate-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </StaffDashboardLayout>
  );
}
