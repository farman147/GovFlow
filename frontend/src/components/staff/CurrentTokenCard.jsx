import { Clock3, Ticket } from 'lucide-react';
import StatusBadge from '../citizen/StatusBadge';

const formatDateValue = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export default function CurrentTokenCard({ currentToken, serviceName, departmentName }) {
  if (!currentToken) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">No token currently being served</h3>
        <p className="mt-2 text-sm text-slate-600">The selected counter is idle and no active token is assigned right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Current token</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">{currentToken.tokenNumber || 'Token'}</h3>
        </div>
        <StatusBadge status={currentToken.status || 'waiting'} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Service</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{serviceName || 'Service not available'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Department</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{departmentName || 'Department not available'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Ticket size={14} className="text-emerald-600" />
            <span className="text-[11px] uppercase tracking-[0.2em]">Issued</span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{formatDateValue(currentToken.issuedAt)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock3 size={14} className="text-sky-600" />
            <span className="text-[11px] uppercase tracking-[0.2em]">Called at</span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{formatDateValue(currentToken.calledAt)}</p>
        </div>
      </div>
    </div>
  );
}
