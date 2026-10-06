import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Search, User, Mail, Phone, Ticket, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import StaffDashboardLayout from '../../components/staff/StaffDashboardLayout';
import { getStaffAppointments } from '../../api/staffService';
import { checkInAppointment, cancelAppointment, completeAppointment } from '../../api/appointmentService';
import { getApiErrorMessage } from '../../api/axios';
import LoadingState from '../../components/citizen/LoadingState';
import EmptyState from '../../components/citizen/EmptyState';
import ConfirmDialog from '../../components/citizen/ConfirmDialog';

const statusStyles = {
  scheduled: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  checked_in: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  no_show: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
};

export default function StaffAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getStaffAppointments();
      setAppointments(response.data?.data?.appointments || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load appointments.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { all: appointments.length, scheduled: 0, checked_in: 0, completed: 0, cancelled: 0 };
    appointments.forEach((a) => {
      if (counts[a.status] !== undefined) counts[a.status] += 1;
    });
    return counts;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const statusOrder = { scheduled: 1, checked_in: 2, completed: 3, no_show: 4, cancelled: 5 };

    return appointments
      .filter((appt) => {
        const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;
        const citizenName = appt.applicantName || appt.citizen?.name || '';
        const matchesSearch =
          !q ||
          citizenName.toLowerCase().includes(q) ||
          appt.confirmationCode?.toLowerCase().includes(q) ||
          appt.service?.name?.toLowerCase().includes(q) ||
          appt.citizen?.email?.toLowerCase().includes(q) ||
          (appt.phone && appt.phone.toLowerCase().includes(q));
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const orderDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.appointmentDate) - new Date(b.appointmentDate);
      });
  }, [appointments, searchQuery, statusFilter]);

  const handleStaffCheckIn = async (appointment) => {
    try {
      setCheckingInId(appointment._id);
      setError('');
      await checkInAppointment(appointment._id);
      await loadAppointments();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to check in citizen.'));
    } finally {
      setCheckingInId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingAppt?._id) return;
    try {
      setActionLoading(true);
      setError('');
      await cancelAppointment(cancellingAppt._id);
      setCancelModalOpen(false);
      setCancellingAppt(null);
      setSuccessMessage('Appointment cancelled successfully.');
      await loadAppointments();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to cancel appointment.'));
      setCancelModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteAppointment = async (appointment) => {
    if (!appointment?._id || completingId === appointment._id) return;

    try {
      setCompletingId(appointment._id);
      setError('');
      setSuccessMessage('');

      await completeAppointment(appointment._id);
      setSuccessMessage('Appointment completed successfully.');
      await loadAppointments();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to complete appointment.'));
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <StaffDashboardLayout title="Appointments" subtitle="Review scheduled citizen service appointments.">
        <LoadingState title="Loading appointments" message="Fetching assigned appointments list." />
      </StaffDashboardLayout>
    );
  }

  return (
    <StaffDashboardLayout
      title="Appointments"
      subtitle="Verify citizen details, confirmation codes, and check in scheduled visitors."
      onRefresh={loadAppointments}
    >
      <div className="space-y-6">
        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        ) : null}

        {/* Status Pill Tabs & Search */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'checked_in', label: 'Checked In' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    statusFilter === tab.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusCounts[tab.id] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by citizen name, confirmation code, service, or phone..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400"
            />
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <EmptyState
            title="No appointments found"
            message="There are no appointments matching your search or filters."
          />
        ) : (
          <div className="grid gap-4">
            {filteredAppointments.map((appointment) => {
              const displayName = appointment.applicantName || appointment.citizen?.name || 'Citizen';
              const displayEmail = appointment.citizen?.email || 'No email recorded';
              const displayPhone = appointment.phone || appointment.citizen?.phone || 'No phone recorded';

              return (
                <div
                  key={appointment._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                          {appointment.service?.department || 'Department'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-medium text-slate-500">
                          {appointment.service?.name || 'Service'}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <User size={18} className="text-emerald-600" />
                          {displayName}
                        </h3>
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800 border border-emerald-200">
                          {appointment.confirmationCode || 'CODE'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          statusStyles[appointment.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {appointment.status.replace('_', ' ')}
                      </span>

                      {appointment.status === 'scheduled' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStaffCheckIn(appointment)}
                            disabled={checkingInId === appointment._id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:bg-slate-300 transition"
                          >
                            <CheckCircle2 size={14} />
                            {checkingInId === appointment._id ? 'Checking In...' : 'Check In'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancellingAppt(appointment);
                              setCancelModalOpen(true);
                            }}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {['checked_in', 'scheduled'].includes(appointment.status) && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCompleteAppointment(appointment)}
                            disabled={completingId === appointment._id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 disabled:bg-slate-300 transition"
                          >
                            <CheckCircle2 size={14} />
                            {completingId === appointment._id ? 'Completing...' : 'Complete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 md:grid-cols-4">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                      <CalendarDays size={15} className="text-slate-500" />
                      <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                      <Clock3 size={15} className="text-slate-500" />
                      <span>Time: <strong>{appointment.appointmentTime}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                      <Mail size={15} className="text-slate-500" />
                      <span className="truncate">{displayEmail}</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                      <Phone size={15} className="text-slate-500" />
                      <span>{displayPhone}</span>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-3 rounded-xl bg-slate-50/70 p-3 text-xs text-slate-600 border border-slate-100 flex items-start gap-2">
                      <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-700">Citizen Purpose / Notes: </span>
                        {appointment.notes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Cancel Modal */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        title="Cancel this appointment?"
        message={`Are you sure you want to cancel the scheduled appointment for ${cancellingAppt?.applicantName || cancellingAppt?.citizen?.name || 'this citizen'}?`}
        confirmLabel="Yes, Cancel"
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancellingAppt(null);
        }}
        loading={actionLoading}
      />
    </StaffDashboardLayout>
  );
}
