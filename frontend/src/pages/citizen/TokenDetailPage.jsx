import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import { cancelToken, getTokenById, getTokenStatus } from '../../api/tokenService';

import ConfirmDialog from '../../components/citizen/ConfirmDialog';
import DashboardLayout from '../../components/citizen/DashboardLayout';
import EmptyState from '../../components/citizen/EmptyState';
import ErrorState from '../../components/citizen/ErrorState';
import LoadingState from '../../components/citizen/LoadingState';
import StatusBadge from '../../components/citizen/StatusBadge';

const formatDateValue = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function TokenDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [queueInfo, setQueueInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadTokenDetails = useCallback(
    async (isRefresh = false) => {
      try {
        const isValidTokenId = /^[0-9a-fA-F]{24}$/.test(
          String(id || '').trim()
        );

        if (!isValidTokenId) {
          setToken(null);
          setQueueInfo(null);
          setError(
            'Invalid token link. Please return to My Tokens and open a valid request.'
          );
          setLoading(false);
          return;
        }

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const [tokenResponse, statusResponse] = await Promise.all([
          getTokenById(id),
          getTokenStatus(id),
        ]);

        setToken(tokenResponse.data?.data?.token || null);
        setQueueInfo(statusResponse.data?.data?.queue || null);
      } catch (loadError) {
        setError(
          getApiErrorMessage(
            loadError,
            'Unable to load your token details.'
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadTokenDetails();
  }, [loadTokenDetails]);

  /*
   * Automatically refresh the token while it is still active.
   */
  useEffect(() => {
    if (
      !token ||
      !['waiting', 'called', 'in_service'].includes(token.status)
    ) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadTokenDetails(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [token, loadTokenDetails]);

  const timeline = useMemo(() => {
    return [
      {
        label: 'Token issued',
        value: token?.issuedAt,
        icon: Ticket,
      },
      {
        label: 'Called to counter',
        value: token?.calledAt,
        icon: Users,
      },
      {
        label: 'Service started',
        value: token?.serviceStartedAt,
        icon: Clock3,
      },
      {
        label: 'Service completed',
        value: token?.completedAt,
        icon: CheckCircle2,
      },
      {
        label: 'Last updated',
        value: token?.updatedAt,
        icon: RefreshCw,
      },
    ].filter((step) => Boolean(step.value));
  }, [token]);

  const departmentName =
    token?.service?.department ||
    queueInfo?.department ||
    'Department';

  const queuePosition =
    token?.status === 'waiting'
      ? queueInfo?.queuePosition
        ? `#${queueInfo.queuePosition}`
        : queueInfo?.peopleAhead !== undefined
        ? `#${queueInfo.peopleAhead + 1}`
        : '#1'
      : token?.status === 'in_service'
      ? 'In service'
      : token?.status === 'called'
      ? 'Called'
      : token?.status === 'completed'
      ? 'Completed'
      : token?.status === 'cancelled'
      ? 'Cancelled'
      : token?.status === 'skipped'
      ? 'Skipped'
      : '—';

  const peopleAhead =
    queueInfo?.peopleAhead !== undefined
      ? queueInfo.peopleAhead
      : null;

  const waitTime =
    token?.status === 'waiting'
      ? queueInfo?.estimatedWaitTime !== undefined
        ? `~${queueInfo.estimatedWaitTime} min`
        : token?.estimatedWaitTime !== undefined
        ? `~${token.estimatedWaitTime} min`
        : 'Calculating'
      : token?.status === 'in_service' || token?.status === 'called'
      ? 'Serving now'
      : '—';

  const currentServing =
    queueInfo?.currentlyServing ||
    (['called', 'in_service'].includes(token?.status)
      ? token.tokenNumber
      : 'None currently called');

  const counterLabel = token?.counter?.counterNumber
    ? `Counter ${token.counter.counterNumber}`
    : token?.counter?.name
    ? token.counter.name
    : queueInfo?.counter?.counterNumber
    ? `Counter ${queueInfo.counter.counterNumber}`
    : 'Assigned when called';

  const counterStatusRaw =
    token?.counter?.status || queueInfo?.counter?.status;

  const counterStatus =
    counterStatusRaw === 'available'
      ? 'Available'
      : counterStatusRaw === 'busy'
      ? 'Busy'
      : counterStatusRaw === 'offline'
      ? 'Offline'
      : token?.status === 'called' || token?.status === 'in_service'
      ? 'Serving'
      : 'Ready';

  const isActiveToken = ['waiting', 'called', 'in_service'].includes(
    token?.status
  );

  const handleCancel = async () => {
    if (!token || token.status !== 'waiting') {
      return;
    }

    try {
      setCanceling(true);
      setActionMessage('');

      await cancelToken(token._id);

      setActionMessage('Token cancelled successfully.');
      setConfirmOpen(false);

      await loadTokenDetails();
    } catch (cancelError) {
      setActionMessage(
        getApiErrorMessage(
          cancelError,
          'This token cannot be cancelled right now.'
        )
      );
    } finally {
      setCanceling(false);
    }
  };

  return (
    <DashboardLayout
      title="Your queue token"
      subtitle="Track your live queue position, estimated wait time, counter status, and service progress."
    >
      <div className="space-y-6">

        {/* TOP ACTION BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/citizen/tokens"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to my tokens
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadTokenDetails(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {token?.status === 'waiting' ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500"
              >
                <XCircle size={15} />
                Cancel token
              </button>
            ) : null}
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
          <LoadingState
            title="Loading token details"
            message="Fetching your live queue position and token information."
          />
        ) : error ? (
          <ErrorState
            title="Unable to load your token"
            message={error}
            onRetry={loadTokenDetails}
          />
        ) : token ? (
          <>
            {/* ACTION MESSAGE */}
            {actionMessage ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  actionMessage.toLowerCase().includes('success')
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {actionMessage}
              </div>
            ) : null}

            {/* TOKEN HERO */}
            <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
              <div className="p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-sm">
                        <Ticket size={20} />
                      </div>

                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Live queue token
                      </p>
                    </div>

                    <h2 className="mt-4 text-5xl font-black tracking-tight text-slate-900">
                      {token.tokenNumber}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      {token.service?.name || 'Service'}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <StatusBadge status={token.status} />

                    {isActiveToken ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        Live queue updates enabled
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE QUEUE STATS */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Queue position
                  </p>

                  <Users size={18} className="text-emerald-600" />
                </div>

                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {queuePosition}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {peopleAhead !== null
                    ? peopleAhead === 0
                      ? 'You are next'
                      : `${peopleAhead} people ahead`
                    : 'Current position'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Estimated wait
                  </p>

                  <Clock3 size={18} className="text-sky-600" />
                </div>

                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {waitTime}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Based on current queue data
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Currently serving
                  </p>

                  <Ticket size={18} className="text-violet-600" />
                </div>

                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {currentServing}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Active queue token
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Counter
                  </p>

                  <MapPin size={18} className="text-amber-600" />
                </div>

                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {counterLabel}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Status: {counterStatus}
                </p>
              </div>
            </div>

            {/* MAIN INFORMATION */}
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

              {/* SERVICE INFORMATION */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Service information
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {token.service?.name || 'Service'}
                    </h3>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <Ticket size={19} />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Department
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {departmentName}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Priority
                    </p>

                    <p className="mt-2 font-semibold capitalize text-slate-900">
                      {token.priority || 'normal'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Queue status
                    </p>

                    <p className="mt-2 font-semibold capitalize text-slate-900">
                      {queueInfo?.status || token.status}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Counter status
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {counterStatus}
                    </p>
                  </div>
                </div>

                {token.notes ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Notes
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {token.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* LIVE QUEUE CARD */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-600 p-2 text-white">
                    <RefreshCw size={18} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Live queue update
                    </h3>

                    <p className="text-xs text-slate-500">
                      Automatically refreshed every 10 seconds
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Your position
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {queuePosition}
                      </p>
                    </div>

                    <Users size={18} className="text-emerald-600" />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        People ahead
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {peopleAhead !== null
                          ? peopleAhead
                          : 'Unavailable'}
                      </p>
                    </div>

                    <Users size={18} className="text-sky-600" />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Estimated wait
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {waitTime}
                      </p>
                    </div>

                    <Clock3 size={18} className="text-violet-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* STATUS TIMELINE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Journey
                </p>

                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  Token status timeline
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Important updates recorded by the GovFlow backend.
                </p>
              </div>

              <div className="mt-6">
                {timeline.length ? (
                  <div className="relative space-y-6">
                    {timeline.map((step, index) => {
                      const Icon = step.icon;
                      const isLast = index === timeline.length - 1;

                      return (
                        <div
                          key={`${step.label}-${step.value}`}
                          className="relative flex gap-4"
                        >
                          {!isLast ? (
                            <div className="absolute left-[15px] top-9 h-[calc(100%+8px)] w-px bg-slate-200" />
                          ) : null}

                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Icon size={15} />
                          </div>

                          <div className="pb-1">
                            <p className="font-semibold text-slate-900">
                              {step.label}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatDateValue(step.value)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No status timeline"
                    message="The backend has not provided timestamp information for this token yet."
                  />
                )}
              </div>
            </div>

            {/* IMPORTANT MESSAGE */}
            {token.status === 'waiting' ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 shrink-0 text-sky-600" size={20} />

                  <div>
                    <h3 className="font-semibold text-sky-900">
                      You are in the queue
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-sky-800">
                      Keep this page available to monitor your queue position.
                      GovFlow will automatically refresh the latest queue
                      information while your token is active.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {token.status === 'called' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex gap-3">
                  <Ticket className="mt-0.5 shrink-0 text-amber-600" size={20} />

                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Your token has been called
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Please proceed to {counterLabel} for your service.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {token.status === 'in_service' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex gap-3">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-emerald-600"
                    size={20}
                  />

                  <div>
                    <h3 className="font-semibold text-emerald-900">
                      Your service is in progress
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Your token is currently being served at {counterLabel}.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {token.status === 'completed' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex gap-3">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-emerald-600"
                    size={20}
                  />

                  <div>
                    <h3 className="font-semibold text-emerald-900">
                      Service completed
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Your GovFlow service request has been marked as
                      completed.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="Unable to find this token"
            message="This token is not available or may no longer exist."
          />
        )}
      </div>

      {/* CANCEL CONFIRMATION */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Cancel this token?"
        message="This will cancel the current token and it can no longer be served. This action is only allowed while the token is waiting."
        confirmLabel="Cancel token"
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
        loading={canceling}
      />
    </DashboardLayout>
  );
}