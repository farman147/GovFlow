import { Clock3, FileText, MapPin, ShieldCheck, Ticket } from 'lucide-react';

const formatMinutes = (minutes) => {
  if (minutes === undefined || minutes === null || minutes === '') return 'Not specified';
  return `${minutes} min`;
};

export default function ServiceCard({ service, onTakeToken, onBookAppointment, onViewDetails, isTaking = false }) {
  const documents = Array.isArray(service?.requiredDocuments) ? service.requiredDocuments : [];

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {service?.code || 'SERVICE'}
            </div>
            <h3 className="text-xl font-semibold text-slate-900">{service?.name || 'Unnamed service'}</h3>
          </div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${service?.isActive === false ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {service?.isActive === false ? 'Inactive' : 'Active'}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={16} className="text-slate-400" />
          <span>{service?.department || 'Department information unavailable'}</span>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          {service?.description || 'No service description was provided by the backend.'}
        </p>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2"><Clock3 size={14} className="text-slate-400" /> Estimated time</span>
            <strong className="font-medium text-slate-900">{formatMinutes(service?.estimatedProcessingTime ?? service?.averageServiceTime)}</strong>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-slate-400" /> Documents</span>
            <strong className="font-medium text-slate-900">{documents.length ? `${documents.length} required` : 'None listed'}</strong>
          </div>
        </div>

        {documents.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {documents.slice(0, 3).map((doc) => (
              <span key={doc} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {doc}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onBookAppointment?.(service)}
            disabled={!service?.isActive}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 disabled:opacity-50 shadow-2xs"
          >
            <span>Book Appointment</span>
          </button>
          <button
            type="button"
            onClick={() => onTakeToken?.(service)}
            disabled={!service?.isActive || isTaking}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-2xs"
          >
            <Ticket size={14} />
            <span>{isTaking ? 'Creating...' : 'Take Token'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails?.(service)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          View AI Assistant
        </button>
      </div>
    </article>
  );
}
