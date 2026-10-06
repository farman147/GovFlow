import { useEffect, useState } from 'react';
import StaffDashboardLayout from '../../components/staff/StaffDashboardLayout';
import { getStaffStatistics } from '../../api/staffService';
import { getApiErrorMessage } from '../../api/axios';
import LoadingState from '../../components/citizen/LoadingState';
import EmptyState from '../../components/citizen/EmptyState';

export default function StaffStatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getStaffStatistics();
      setStats(response.data?.data || null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load staff statistics.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <StaffDashboardLayout title="Statistics" subtitle="Review service performance for your assigned counters.">
        <LoadingState title="Loading stats" message="Computing token and service statistics for your department." />
      </StaffDashboardLayout>
    );
  }

  return (
    <StaffDashboardLayout title="Statistics" subtitle="Operational insights from your assigned queue activity." onRefresh={loadStats}>
      <div className="space-y-6">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        {!stats ? (
          <EmptyState title="No statistics available" message="There is not enough queue data yet for this staff profile." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Handled today', value: stats.totalHandled },
              { label: 'Completed', value: stats.completed },
              { label: 'Cancelled', value: stats.cancelled },
              { label: 'Skipped', value: stats.skipped }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {stats ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Performance</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Average waiting time</span><strong>{stats.averageWaitingTime} min</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Average service time</span><strong>{stats.averageServiceTime} min</strong></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Waiting</span><strong>{stats.awaiting}</strong></div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Latest snapshot</h3>
              <div className="mt-5 grid gap-3 text-sm text-slate-700">
                <div className="rounded-xl bg-slate-50 p-3">Completed tokens: <strong>{stats.completed}</strong></div>
                <div className="rounded-xl bg-slate-50 p-3">Cancelled tokens: <strong>{stats.cancelled}</strong></div>
                <div className="rounded-xl bg-slate-50 p-3">Skipped tokens: <strong>{stats.skipped}</strong></div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </StaffDashboardLayout>
  );
}
