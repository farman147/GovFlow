import { ArrowRight, Clock3, MapPin, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return 'Not available';
  return dateValue.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export default function TokenCard({ token }) {
  const serviceName = token?.service?.name || 'Service';
  const serviceDepartment = token?.service?.department || 'Department information unavailable';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Ticket size={14} className="text-emerald-600" />
            <span>{token?.tokenNumber || 'Token'}</span>
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{serviceName}</h3>
          <p className="mt-1 text-sm text-slate-500">{serviceDepartment}</p>
        </div>

        <StatusBadge status={token?.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Issued</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(token?.issuedAt)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Queue</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{token?.estimatedWaitTime ? `${token.estimatedWaitTime} min` : 'Not available'}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={14} className="text-slate-400" />
          <span>{token?.counter ? (token.counter.counterNumber ? `Counter ${token.counter.counterNumber}` : token.counter.name) : token?.status === 'waiting' ? 'Assigned on call' : 'Pending'}</span>
        </div>

        <Link
          to={`/citizen/tokens/${token?._id}`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          View details
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
