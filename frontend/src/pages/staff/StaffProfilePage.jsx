import { useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import StaffDashboardLayout from '../../components/staff/StaffDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function StaffProfilePage() {
  const { user, logout, login } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await api.put('/api/auth/profile', {
        name: form.name,
        phone: form.phone
      });

      const updatedUser = response.data?.data?.user;
      if (updatedUser) {
        localStorage.setItem('govflow_user', JSON.stringify(updatedUser));
        window.location.reload();
      }
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffDashboardLayout title="My profile" subtitle="Update your personal contact information and maintain your staff profile.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <UserRound size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Staff profile</p>
              <h2 className="text-xl font-semibold text-slate-900">{user?.name || 'Staff member'}</h2>
            </div>
          </div>

          {message ? <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input value={user?.email || ''} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Account overview</h3>

          <div className="mt-5 space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Role</span><strong>{user?.role || 'staff'}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Department</span><strong>{user?.department || 'Not assigned'}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Account status</span><strong>Active</strong></div>
          </div>

          <button
            type="button"
            onClick={() => logout(true)}
            className="mt-6 w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </StaffDashboardLayout>
  );
}
