import { BriefcaseBusiness, MonitorSmartphone, UserRound } from 'lucide-react';
import StatusBadge from '../citizen/StatusBadge';

export default function CounterCard({ counter, isSelected, onSelect }) {
  const services = Array.isArray(counter?.services) ? counter.services : [];
  const assignedStaff = Array.isArray(counter?.assignedStaff) ? counter.assignedStaff : [];

  return (
    <button
      type="button"
      onClick={() => onSelect?.(counter)}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
        isSelected
          ? 'border-emerald-300 bg-emerald-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Counter</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{counter?.counterNumber || 'Counter'}</h3>
        </div>
        <StatusBadge status={counter?.status === 'available' ? 'waiting' : counter?.status === 'busy' ? 'in_service' : 'skipped'} />
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <MonitorSmartphone size={16} className="text-slate-400" />
          <span>{counter?.name || 'Unnamed counter'}</span>
        </div>

        <div className="flex items-center gap-2">
          <BriefcaseBusiness size={16} className="text-slate-400" />
          <span>{counter?.department || 'Department unavailable'}</span>
        </div>

        <div className="flex items-center gap-2">
          <UserRound size={16} className="text-slate-400" />
          <span>{assignedStaff.length ? `${assignedStaff.length} staff assigned` : 'No staff assigned'}</span>
        </div>
      </div>

      {services.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {services.slice(0, 3).map((service) => (
            <span key={service._id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {service.code || 'SERVICE'}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
