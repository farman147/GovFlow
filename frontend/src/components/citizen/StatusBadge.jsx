const styles = {
  waiting: 'bg-amber-100 text-amber-800 border-amber-200',
  called: 'bg-sky-100 text-sky-800 border-sky-200',
  in_service: 'bg-violet-100 text-violet-800 border-violet-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  skipped: 'bg-slate-200 text-slate-700 border-slate-300',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const labelMap = {
  waiting: 'Waiting',
  called: 'Called',
  in_service: 'In service',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
};

export default function StatusBadge({ status }) {
  const normalized = status || 'waiting';
  const variant = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = labelMap[normalized] || normalized.replace('_', ' ');

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${variant}`}>
      {label}
    </span>
  );
}
