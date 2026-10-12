import { BriefcaseBusiness, Calendar, LayoutGrid, LogOut, Sparkles, Ticket, Workflow } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FloatingAssistantWidget from './FloatingAssistantWidget';

const navItems = [
  { label: 'Dashboard', to: '/citizen/dashboard', icon: LayoutGrid },
  { label: 'Services', to: '/citizen/services', icon: BriefcaseBusiness },
  { label: 'My Appointments', to: '/citizen/appointments', icon: Calendar },
  { label: 'My Tokens', to: '/citizen/tokens', icon: Ticket },
  { label: 'govflow Assistant', to: '/citizen/assistant', icon: Sparkles, badge: 'AI' },
];

export default function DashboardLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Workflow size={20} />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">govflow</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Citizen Portal</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ label, to, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={label.includes('AI') ? 'text-emerald-600' : ''} />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Signed in</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{user?.name || 'Citizen'}</p>
            <p className="text-xs text-slate-500">{user?.role || 'citizen'}</p>
          </div>

          <button
            type="button"
            onClick={() => logout(true)}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 shadow-2xs"
          >
            <LogOut size={16} />
            Logout
          </button>
        </aside>

        <main className="flex-1">
          <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Citizen navigation">
            {navItems.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          <header className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Citizen portal</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
              </div>

              <div className="flex items-center gap-3 lg:hidden">
                <div className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{user?.name || 'Citizen'}</div>
                <button
                  type="button"
                  onClick={() => logout(true)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="mt-6 pb-10">{children}</div>
        </main>
      </div>

      {/* Floating AI Assistant for fast questions */}
      <FloatingAssistantWidget />
    </div>
  );
}
