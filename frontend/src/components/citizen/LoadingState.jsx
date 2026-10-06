export default function LoadingState({ title = 'Loading', message = 'Please wait while we fetch the latest data.' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3 text-slate-700">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
