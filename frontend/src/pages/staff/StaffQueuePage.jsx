import { useEffect, useMemo, useState } from 'react';
import { Search, TimerReset, ArrowRightLeft } from 'lucide-react';
import StaffDashboardLayout from '../../components/staff/StaffDashboardLayout';
import { getStaffDashboard, getStaffQueue } from '../../api/staffService';
import { callNextToken, callToken, completeToken, skipToken, startToken } from '../../api/tokenService';
import { getApiErrorMessage } from '../../api/axios';
import LoadingState from '../../components/citizen/LoadingState';
import EmptyState from '../../components/citizen/EmptyState';

const statusStyles = {
  waiting: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  called: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  in_service: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  skipped: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
};

export default function StaffQueuePage() {
  const [tokens, setTokens] = useState([]);
  const [assignedCounters, setAssignedCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadAssignedCounters = async () => {
    try {
      const response = await getStaffDashboard();
      const loadedCounters = response.data?.data?.counters || [];
      setAssignedCounters(loadedCounters);
    } catch (loadError) {
      // fallback to getCounters
      try {
        const fallbackRes = await getStaffQueue();
      } catch {}
    }
  };

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getStaffQueue();
      setTokens(response.data?.data?.tokens || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load the queue.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    loadAssignedCounters();
  }, []);

  const filteredTokens = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return tokens.filter((token) => {
      const matchesStatus = statusFilter === 'all' || token.status === statusFilter;
      const matchesQuery = !lower || [token.tokenNumber, token.service?.name, token.citizen?.name].some((value) => String(value || '').toLowerCase().includes(lower));
      return matchesStatus && matchesQuery;
    });
  }, [tokens, query, statusFilter]);

  const handleTokenAction = async (token, action) => {
    try {
      const actionMap = {
        call: callToken,
        start: startToken,
        complete: completeToken,
        skip: skipToken
      };

      const fn = actionMap[action];
      if (!fn) return;

      setError('');
      const counterId = assignedCounters.find((counter) =>
        (counter.services || []).some((service) => String(service._id || service) === String(token.service?._id || token.service))
      )?._id || assignedCounters[0]?._id;

      const payload = action === 'call' && counterId ? { counterId } : {};

      await fn(token._id, payload);
      await loadQueue();
      await loadAssignedCounters();
    } catch (queueError) {
      setError(getApiErrorMessage(queueError, `Unable to ${action} the token.`));
    }
  };

  if (loading) {
    return (
      <StaffDashboardLayout title="Queue" subtitle="Monitoring today's live queue and service flow.">
        <LoadingState title="Loading queue" message="Fetching queue activity and token assignments." />
      </StaffDashboardLayout>
    );
  }

  return (
    <StaffDashboardLayout title="Queue" subtitle="View the current queue, service details, and token transitions." onRefresh={loadQueue}>
      <div className="space-y-6">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search token or citizen"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none ring-0 transition focus:border-emerald-300"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300"
            >
              <option value="all">All statuses</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="in_service">In service</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
        </div>

        {filteredTokens.length === 0 ? (
          <EmptyState title="No tokens in the queue" message="No tokens are currently available for the assigned service counters." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Token</th>
                    <th className="px-4 py-3 font-medium">Citizen</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Issued</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTokens.map((token) => (
                    <tr key={token._id} className="align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">{token.tokenNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{token.citizen?.name || 'Citizen'}</td>
                      <td className="px-4 py-3 text-slate-700">{token.service?.name || 'Service'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[token.status] || 'bg-slate-100 text-slate-700'}`}>
                          {token.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{new Date(token.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {token.status === 'waiting' ? (
                            <button onClick={() => handleTokenAction(token, 'call')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Call</button>
                          ) : null}
                          {token.status === 'called' ? (
                            <button onClick={() => handleTokenAction(token, 'start')} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Start</button>
                          ) : null}
                          {token.status === 'in_service' ? (
                            <button onClick={() => handleTokenAction(token, 'complete')} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-700">Complete</button>
                          ) : null}
                          {['waiting', 'called'].includes(token.status) ? (
                            <button onClick={() => handleTokenAction(token, 'skip')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Skip</button>
                          ) : null}
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600"><ArrowRightLeft size={12} /> {token.priority}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StaffDashboardLayout>
  );
}
