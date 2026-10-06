import { BarChart3, BriefcaseBusiness, LayoutGrid, LogOut, RefreshCcw, UserCircle2, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Dashboard', to: '/staff/dashboard', icon: LayoutGrid },
  { label: 'Queue', to: '/staff/queue', icon: Users },
  { label: 'Appointments', to: '/staff/appointments', icon: BriefcaseBusiness },
  { label: 'Statistics', to: '/staff/statistics', icon: BarChart3 },
  { label: 'My Profile', to: '/staff/profile', icon: UserCircle2 }
];

export default function StaffDashboardLayout({ title, subtitle, children, onRefresh, refreshing = false }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">G</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">GovFlow</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Staff Portal</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Signed in</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{user?.name || 'Staff member'}</p>
            <p className="text-xs text-slate-500">{user?.department || 'Staff'}</p>
          </div>

          <button
            type="button"
            onClick={() => logout(true)}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut size={16} />
            Logout
          </button>
        </aside>

        <main className="flex-1">
          <header className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Staff portal</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
              </div>

              <div className="flex items-center gap-3">
                {onRefresh ? (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    disabled={refreshing}
                  >
                    <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => logout(true)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 lg:hidden"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="mt-6 pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
