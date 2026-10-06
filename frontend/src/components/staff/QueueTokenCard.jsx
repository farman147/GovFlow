import { Clock3, Ticket, UserRound } from 'lucide-react';
import StatusBadge from '../citizen/StatusBadge';

const formatDateValue = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export default function QueueTokenCard({ token, serviceName, onAction, disabled = false }) {
  const status = token?.status || 'waiting';
  const actions = [];

  if (status === 'waiting') {
    actions.push({ label: 'Call', action: 'call' });
  }
  if (status === 'called') {
    actions.push({ label: 'Start', action: 'start' });
  }
  if (status === 'in_service') {
    actions.push({ label: 'Complete', action: 'complete' });
  }
  if (['waiting', 'called'].includes(status)) {
    actions.push({ label: 'Skip', action: 'skip' });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Ticket size={14} className="text-emerald-600" />
            <span>{token?.tokenNumber || 'Token'}</span>
          </div>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">{serviceName || 'Service'}</h4>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Created</p>
          <p className="mt-2 text-sm text-slate-700">{formatDateValue(token?.issuedAt)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Counter</p>
          <p className="mt-2 text-sm text-slate-700">{token?.counter ? 'Assigned' : 'Pending'}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <UserRound size={14} className="text-slate-400" />
        <span>{token?.citizen ? 'Citizen request' : 'Citizen details unavailable'}</span>
      </div>

      {actions.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((actionItem) => (
            <button
              key={actionItem.action}
              type="button"
              onClick={() => onAction?.(token, actionItem.action)}
              disabled={disabled}
              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {actionItem.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
