import {
  ArrowRight,
  Clock3,
  Hash,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/axios';
import { getMyTokens } from '../../api/tokenService';
import DashboardLayout from '../../components/citizen/DashboardLayout';
import EmptyState from '../../components/citizen/EmptyState';
import ErrorState from '../../components/citizen/ErrorState';
import LoadingState from '../../components/citizen/LoadingState';

const statusConfig = {
  waiting: {
    label: 'Waiting',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  called: {
    label: 'Called',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  in_service: {
    label: 'In Service',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  skipped: {
    label: 'Skipped',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
};

const formatDate = (value) => {
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

const getStatus = (status) => {
  return (
    statusConfig[status] || {
      label: status || 'Unknown',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  );
};

export default function TokensPage() {
  const navigate = useNavigate();

  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadTokens = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response = await getMyTokens();

      setTokens(response.data?.data?.tokens || []);
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          'Unable to load your tokens.'
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  /*
   * Separate active and previous tokens.
   * This uses the real status returned by the backend.
   */
  const activeTokens = useMemo(() => {
    return tokens.filter((token) =>
      ['waiting', 'called', 'in_service'].includes(token.status)
    );
  }, [tokens]);

  const previousTokens = useMemo(() => {
    return tokens.filter(
      (token) =>
        !['waiting', 'called', 'in_service'].includes(token.status)
    );
  }, [tokens]);

  const handleOpenToken = (token) => {
    if (!token?._id) return;

    navigate(`/citizen/tokens/${token._id}`);
  };

  const renderTokenCard = (token) => {
    const status = getStatus(token.status);

    const serviceName =
      token.service?.name ||
      token.serviceName ||
      'Government service';

    const department =
      token.service?.department ||
      token.department ||
      'Department';

    const queuePosition =
      token.queuePosition ??
      token.position ??
      token.peopleAhead;

    const estimatedWait =
      token.estimatedWaitTime ??
      token.waitTime;

    return (
      <div
        key={token._id}
        className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
      >
        {/* Top section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Ticket size={22} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Token
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {token.tokenNumber || '—'}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {serviceName}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {department}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* Information */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Hash size={15} />

              <p className="text-[11px] uppercase tracking-[0.16em]">
                Queue
              </p>
            </div>

            <p className="mt-2 text-base font-semibold text-slate-900">
              {token.status === 'waiting'
                ? queuePosition !== undefined
                  ? `#${queuePosition}`
                  : 'Waiting'
                : token.status === 'in_service'
                ? 'Serving now'
                : token.status === 'called'
                ? 'Called'
                : '—'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock3 size={15} />

              <p className="text-[11px] uppercase tracking-[0.16em]">
                Estimated wait
              </p>
            </div>

            <p className="mt-2 text-base font-semibold text-slate-900">
              {token.status === 'waiting' &&
              estimatedWait !== undefined
                ? `~${estimatedWait} min`
                : token.status === 'called' ||
                  token.status === 'in_service'
                ? 'Serving now'
                : '—'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Ticket size={15} />

              <p className="text-[11px] uppercase tracking-[0.16em]">
                Priority
              </p>
            </div>

            <p className="mt-2 text-base font-semibold capitalize text-slate-900">
              {token.priority || 'Normal'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-slate-500">
              Created
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(token.issuedAt || token.createdAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenToken(token)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            View details
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="My tokens"
      subtitle="Track your live queue requests and recent government service activity."
    >
      <div className="space-y-8">

        {/* Header */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
                Queue overview
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Your service requests
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Monitor your position and open any token for live details.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadTokens(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'animate-spin' : ''}
              />

              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {!loading && !error && tokens.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white bg-white/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Total requests
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {tokens.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Active
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {activeTokens.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Previous
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {previousTokens.length}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Loading */}
        {loading ? (
          <LoadingState
            title="Loading your tokens"
            message="Fetching your latest queue activity from govflow."
          />
        ) : error ? (
          <ErrorState
            title="Unable to load your tokens"
            message={error}
            onRetry={() => loadTokens()}
          />
        ) : !tokens.length ? (
          <EmptyState
            title="No tokens found"
            message="You have not created any queue tokens yet. Choose a service to start a request."
          />
        ) : (
          <>
            {/* Active tokens */}
            {activeTokens.length ? (
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
                    Live queue
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Active tokens
                  </h2>
                </div>

                <div className="space-y-4">
                  {activeTokens.map(renderTokenCard)}
                </div>
              </section>
            ) : null}

            {/* Previous tokens */}
            {previousTokens.length ? (
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    History
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Previous tokens
                  </h2>
                </div>

                <div className="space-y-4">
                  {previousTokens.map(renderTokenCard)}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}