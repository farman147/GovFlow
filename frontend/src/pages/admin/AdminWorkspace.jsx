import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, BriefcaseBusiness, Building2, CalendarDays, Clock3, LogOut, Pencil, Plus, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { getServices, updateService } from '../../api/serviceService';
import { getCounters, createCounter, updateCounter, assignCounterStaff, updateCounterStatus } from '../../api/counterService';
import { createAdminAccount, getAdminDashboard, resetStaffPassword } from '../../api/adminService';
import api from '../../api/axios';
import { getApiErrorMessage } from '../../api/axios';
import { createServiceWithStaff } from '../../api/adminService';
import { cancelAppointment, checkInAppointment, completeAppointment } from '../../api/appointmentService';
import { getQueueByService, callNextToken, skipToken } from '../../api/tokenService';

const tabs = [
  { id: 'services', label: 'Services', icon: BriefcaseBusiness, description: 'Catalog and availability' },
  { id: 'counters', label: 'Counters', icon: Building2, description: 'Locations, staffing and status' },
  { id: 'queue', label: 'Queue monitor', icon: Activity, description: 'Live waiting lists by service' },
  { id: 'staff', label: 'Staff & access', icon: ShieldCheck, description: 'Accounts and departments' },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, description: 'Bookings and check-ins' },
];
const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';

const blankService = { name: '', code: '', department: '', description: '', fee: '', estimatedProcessingTime: 15, averageServiceTime: 15, isActive: true, assignedStaff: [] };
const blankCounter = { counterNumber: '', name: '', department: '', services: [], assignedStaff: [], status: 'available', isActive: true };
const blankStaff = { name: '', email: '', password: '', phone: '', department: '', role: 'staff' };
const blankServiceStaff = { name: '', email: '', password: '', phone: '' };
const normalizeId = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return normalizeId(value._id ?? value.id);
  return '';
};

function Modal({ title, onClose, children, wide = false }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
      <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Administration</p><h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18}/></button></div>
      {children}
    </div>
  </div>;
}

function Notice({ message, error }) {
  if (!message) return null;
  return <div className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><AlertCircle size={17} className="mt-0.5 shrink-0"/><span>{message}</span></div>;
}

export default function AdminWorkspace({ activeSection, onNavigate, user, logout }) {
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [serviceForm, setServiceForm] = useState(blankService);
  const [counterForm, setCounterForm] = useState(blankCounter);
  const [staffForm, setStaffForm] = useState(blankStaff);
  const [serviceStaffForm, setServiceStaffForm] = useState(blankServiceStaff);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [queueServiceId, setQueueServiceId] = useState('');
  const [queueCounterId, setQueueCounterId] = useState('');
  const [queueTokens, setQueueTokens] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const load = async () => {
    setLoading(true); setNotice('');
    const results = await Promise.allSettled([
        getServices({ includeInactive: true }), getCounters({ includeInactive: true }),
        api.get('/api/admin/users'), getAdminDashboard(),
    ]);
    const [serviceRes, counterRes, usersRes, dashboardRes] = results;
    if (serviceRes.status === 'fulfilled') setServices(serviceRes.value.data?.data?.services || []);
    if (counterRes.status === 'fulfilled') setCounters(counterRes.value.data?.data?.counters || []);
    if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data?.data?.users || []);
    if (dashboardRes.status === 'fulfilled') setStats(dashboardRes.value.data?.data || null);
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
      setNotice(`${failures.length} admin data source${failures.length === 1 ? '' : 's'} could not be reached. Available sections are still shown.`);
      setNoticeIsError(true);
    }
    setLoading(false);
  };
  const loadAppointments = async () => {
    try {
      const response = await api.get('/api/admin/appointments');
      setAppointments(response.data?.data?.appointments || []);
      setNotice('');
    } catch (error) {
      setNotice(`Appointments are unavailable: ${getApiErrorMessage(error, 'the admin appointments endpoint could not be reached.')}`);
      setNoticeIsError(true);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (activeSection === 'appointments') loadAppointments(); }, [activeSection]);
  useEffect(() => {
    if (!queueServiceId && services.length) setQueueServiceId(services.find((service) => service.isActive)?._id || services[0]._id);
  }, [services, queueServiceId]);

  const loadQueue = async () => {
    if (!queueServiceId) { setQueueTokens([]); return; }
    setQueueLoading(true);
    try { const response = await getQueueByService(queueServiceId); setQueueTokens(response.data?.data?.tokens || []); }
    catch (error) { flash(getApiErrorMessage(error, 'Unable to load this queue.'), true); }
    finally { setQueueLoading(false); }
  };
  useEffect(() => { if (activeSection === 'queue' && queueServiceId) loadQueue(); }, [activeSection, queueServiceId]);

  const filteredServices = useMemo(() => services.filter((item) => `${item.name} ${item.code} ${item.department}`.toLowerCase().includes(search.toLowerCase())), [services, search]);
  const filteredCounters = useMemo(() => counters.filter((item) => `${item.name} ${item.counterNumber} ${item.department}`.toLowerCase().includes(search.toLowerCase())), [counters, search]);
  const filteredUsers = useMemo(() => users.filter((item) => (roleFilter === 'all' || item.role === roleFilter) && `${item.name} ${item.email} ${item.department || ''}`.toLowerCase().includes(search.toLowerCase())), [users, roleFilter, search]);
  const filteredAppointments = useMemo(() => appointments.filter((item) => `${item.applicantName || item.citizen?.name || ''} ${item.confirmationCode || ''} ${item.service?.name || ''} ${item.status}`.toLowerCase().includes(search.toLowerCase())), [appointments, search]);

  const flash = (message, error = false) => { setNotice(message); setNoticeIsError(error); };
  const openService = (service = null) => { setEditing(service); setServiceForm(service ? { ...blankService, ...service, fee: service.fee == null || typeof service.fee === 'object' ? '' : String(service.fee), assignedStaff: (service.assignedStaff || []).map(normalizeId).filter(Boolean) } : blankService); setServiceStaffForm(blankServiceStaff); setModal('service'); };
  const openCounter = (counter = null) => { setEditing(counter); setCounterForm(counter ? { ...blankCounter, ...counter, services: (counter.services || []).map(normalizeId).filter(Boolean), assignedStaff: (counter.assignedStaff || []).map(normalizeId).filter(Boolean) } : blankCounter); setModal('counter'); };
  const saveService = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const payload = {
        name: serviceForm.name.trim(), code: serviceForm.code.trim().toUpperCase(),
        department: serviceForm.department.trim(), description: serviceForm.description,
        requiredDocuments: serviceForm.requiredDocuments || [], eligibility: serviceForm.eligibility || [],
        operatingHours: serviceForm.operatingHours || null,
        estimatedProcessingTime: Number(serviceForm.estimatedProcessingTime),
        averageServiceTime: Number(serviceForm.averageServiceTime),
        fee: serviceForm.fee === '' ? null : serviceForm.fee, isActive: serviceForm.isActive,
        assignedStaff: serviceForm.assignedStaff || [],
      };
      let successMessage;
      if (editing) {
        await updateService(editing._id, payload);
        successMessage = 'Service updated.';
      } else {
        const email = serviceStaffForm.email.trim().toLowerCase();
        await createServiceWithStaff(
          payload,
          { ...serviceStaffForm, email, department: serviceForm.department }
        );
        successMessage = 'Service created and staff account assigned.';
      }
      setModal(''); flash(successMessage); await load();
    } catch (error) { flash(getApiErrorMessage(error, 'Unable to save this service.'), true); } finally { setSaving(false); }
  };
  const toggleService = async (service) => {
    try { await updateService(service._id, { isActive: !service.isActive }); flash(`${service.name} ${service.isActive ? 'paused' : 'activated'}.`); await load(); }
    catch (error) { flash(getApiErrorMessage(error, 'Unable to update service status.'), true); }
  };
  const saveCounter = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const assignedStaff = counterForm.assignedStaff || [];
      const payload = {
        counterNumber: counterForm.counterNumber.trim(), name: counterForm.name.trim(),
        department: counterForm.department.trim(), services: counterForm.services,
        status: counterForm.status, isActive: counterForm.isActive,
      };
      let response;
      if (editing) response = await updateCounter(editing._id, payload); else response = await createCounter(payload);
      const saved = response.data?.data?.counter;
      if (saved?._id) await assignCounterStaff(saved._id, assignedStaff);
      setModal(''); flash(editing ? 'Counter updated.' : 'Counter created.'); await load();
    } catch (error) { flash(getApiErrorMessage(error, 'Unable to save this counter.'), true); } finally { setSaving(false); }
  };
  const saveStaff = async (event) => {
    event.preventDefault(); setSaving(true);
    try { await createAdminAccount({ ...staffForm, email: staffForm.email.trim().toLowerCase() }); setModal(''); setStaffForm(blankStaff); flash(`${staffForm.role === 'admin' ? 'Admin' : 'Staff'} account created.`); await load(); }
    catch (error) { flash(getApiErrorMessage(error, 'Unable to create this account.'), true); } finally { setSaving(false); }
  };
  const saveStaffPassword = async (event) => {
    event.preventDefault();
    if (!passwordTarget) return;
    setSaving(true);
    try {
      await resetStaffPassword(passwordTarget._id, newStaffPassword);
      setModal(''); setPasswordTarget(null); setNewStaffPassword('');
      flash(`Password reset for ${passwordTarget.email}.`);
    } catch (error) {
      flash(getApiErrorMessage(error, 'Unable to reset this staff password.'), true);
    } finally { setSaving(false); }
  };
  const appointmentAction = async (appointment, action) => {
    try {
      if (action === 'check-in') await checkInAppointment(appointment._id);
      if (action === 'complete') await completeAppointment(appointment._id);
      if (action === 'cancel') await cancelAppointment(appointment._id);
      flash(action === 'check-in' ? 'Citizen checked in and added to the queue.' : `Appointment ${action === 'complete' ? 'completed' : 'cancelled'}.`);
      await load();
      await loadAppointments();
    } catch (error) { flash(getApiErrorMessage(error, `Unable to ${action} this appointment.`), true); }
  };

  const activeTab = tabs.find((item) => item.id === activeSection) || tabs[0];
  const staffMembers = users.filter((item) => item.role === 'staff');
  const pageTitle = { services: 'Service catalog', counters: 'Counter operations', queue: 'Live queue monitor', staff: 'Staff & access', appointments: 'Appointment management' }[activeSection] || 'Administration';

  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
      <header className={`${card} mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700"><ShieldCheck size={16}/> govflow Administration</div><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{pageTitle}</h1><p className="mt-1 text-sm text-slate-500">Manage public services and daily operations from one workspace.</p></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Signed in as</p><p className="text-sm font-semibold text-slate-800">{user?.name || 'Administrator'}</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold hover:bg-slate-50"><RefreshCw size={15}/> Refresh</button><button onClick={() => logout(true)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"><LogOut size={15}/> Log out</button></div>
      </header>
      <nav className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-6" aria-label="Admin sections">
        <button onClick={() => onNavigate('overview')} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition ${activeSection === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={18}/><span className="text-sm font-semibold">Overview</span></button>
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition ${activeSection === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={18}/><span className="text-sm font-semibold">{label}</span></button>)}
      </nav>
      <Notice message={notice} error={noticeIsError}/>

      {loading ? <div className={`${card} flex items-center justify-center gap-3 p-16 text-sm text-slate-500`}><RefreshCw className="animate-spin" size={18}/> Loading workspace data…</div> : <>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Available services', services.filter((item) => item.isActive).length, BriefcaseBusiness],
            ['Operational counters', counters.filter((item) => item.isActive && item.status !== 'offline').length, Building2],
            ['Staff accounts', staffMembers.length, Users],
            ['Citizens registered', stats?.totalCitizens ?? users.filter((item) => item.role === 'citizen').length, Users],
          ].map(([label, value, Icon]) => <div key={label} className={`${card} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Icon size={17}/></span></div><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p></div>)}
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold text-slate-900">{activeTab.label}</h2><p className="text-sm text-slate-500">{activeTab.description}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {activeSection === 'staff' && <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={`${input} w-auto`}><option value="all">All roles</option><option value="staff">Staff</option><option value="admin">Admins</option><option value="citizen">Citizens</option></select>}
            <label className="relative min-w-52 flex-1 sm:flex-none"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className={`${input} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records…"/></label>
            {activeSection === 'services' && <button className={button} onClick={() => openService()}><Plus size={16}/> Add service</button>}
            {activeSection === 'counters' && <button className={button} onClick={() => openCounter()}><Plus size={16}/> Add counter</button>}
            {activeSection === 'staff' && <button className={button} onClick={() => { setStaffForm(blankStaff); setModal('staff'); }}><Plus size={16}/> Create account</button>}
          </div>
        </div>

        {activeSection === 'services' && <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Service</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Processing</th><th className="px-5 py-3">Availability</th><th className="px-5 py-3">Assigned staff</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredServices.map((service) => <tr key={service._id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 px-2 py-1 font-mono text-xs font-bold text-blue-800">{service.code}</span><div><p className="font-semibold text-slate-900">{service.name}</p><p className="max-w-sm truncate text-xs text-slate-500">{service.description || 'No description added'}</p></div></div></td><td className="px-5 py-4 text-slate-600">{service.department}</td><td className="px-5 py-4 text-slate-600">{service.estimatedProcessingTime || service.averageServiceTime || '—'} min</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{service.isActive ? 'Published' : 'Paused'}</span></td><td className="px-5 py-4">{(service.assignedStaff || []).map((member) => <div key={member._id || member} className="text-xs text-slate-600">{member.name || "Assigned staff"}</div>)}{!service.assignedStaff?.length && <span className="text-xs text-slate-400">Unassigned</span>}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => openService(service)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" title="Edit service"><Pencil size={15}/></button><button onClick={() => toggleService(service)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">{service.isActive ? 'Pause' : 'Publish'}</button></div></td></tr>)}{!filteredServices.length && <EmptyRow colSpan={6} text="No services match this search."/>}</tbody></table></div>
        </div>}

        {activeSection === 'counters' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredCounters.map((counter) => <article key={counter._id} className={`${card} p-5`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Counter {counter.counterNumber}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{counter.name}</h3><p className="mt-1 text-sm text-slate-500">{counter.department}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${counter.status === 'available' ? 'bg-emerald-50 text-emerald-700' : counter.status === 'busy' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{counter.isActive ? counter.status : 'inactive'}</span></div><div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Services</p><div className="mt-2 flex flex-wrap gap-1.5">{(counter.services || []).map((service) => <span key={service._id || service} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{service.name || services.find((item) => item._id === service)?.name || 'Service'}</span>)}{!counter.services?.length && <span className="text-xs text-slate-400">No services assigned</span>}</div><p className="mt-3 text-xs text-slate-500">Assigned staff: {(counter.assignedStaff || []).map((member) => member.name).join(', ') || 'Unassigned'}</p></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openCounter(counter)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"><Pencil size={13}/> Edit</button><select aria-label={`Set ${counter.name} status`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold" value={counter.status} onChange={async (event) => { try { await updateCounterStatus(counter._id, event.target.value); flash('Counter status updated.'); await load(); } catch (error) { flash(getApiErrorMessage(error, 'Unable to update counter status.'), true); } }}><option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option></select></div></article>)}{!filteredCounters.length && <div className={`${card} p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3`}>No counters found. Add a counter to start organizing service desks.</div>}</div>}

        {activeSection === 'queue' && <section className={`${card} overflow-hidden`}><div className="flex flex-col gap-4 border-b border-slate-100 p-5"><div><h3 className="font-bold text-slate-900">Waiting queue</h3><p className="mt-1 text-sm text-slate-500">Call the next citizen or remove a token from the active line.</p></div><div className="flex flex-col gap-2 sm:flex-row"><select className={input} value={queueServiceId} onChange={(event) => { setQueueServiceId(event.target.value); setQueueCounterId(''); }}><option value="">Select a service</option>{services.filter((service) => service.isActive).map((service) => <option key={service._id} value={service._id}>{service.name}</option>)}</select><select className={input} value={queueCounterId} onChange={(event) => setQueueCounterId(event.target.value)}><option value="">Select an active counter</option>{counters.filter((counter) => counter.isActive && counter.status !== 'offline' && (!queueServiceId || (counter.services || []).some((service) => String(service._id || service) === queueServiceId))).map((counter) => <option key={counter._id} value={counter._id}>{counter.name} · {counter.counterNumber}</option>)}</select><button className={`${button} shrink-0`} disabled={!queueServiceId || !queueCounterId || queueLoading || queueTokens.length === 0} onClick={async () => { try { await callNextToken(queueServiceId, { counterId: queueCounterId }); flash('Next citizen called.'); await loadQueue(); } catch (error) { flash(getApiErrorMessage(error, 'Unable to call the next token.'), true); } }}><Activity size={15}/> Call next</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Queue position</th><th className="px-5 py-3">Token</th><th className="px-5 py-3">Citizen</th><th className="px-5 py-3">Priority</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{queueTokens.map((token, index) => <tr key={token._id}><td className="px-5 py-4 text-slate-500">{index + 1}</td><td className="px-5 py-4 font-mono font-bold text-slate-900">{token.tokenNumber}</td><td className="px-5 py-4"><p className="font-medium text-slate-800">{token.citizen?.name || 'Citizen'}</p><p className="text-xs text-slate-500">{token.citizen?.email || ''}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${token.priority === 'priority' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{token.priority === 'priority' ? 'Priority' : 'Standard'}</span></td><td className="px-5 py-4 text-right"><button disabled={!queueCounterId} onClick={async () => { try { await skipToken(token._id, { counterId: queueCounterId }); flash('Token skipped.'); await loadQueue(); } catch (error) { flash(getApiErrorMessage(error, 'Unable to skip this token.'), true); } }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Skip</button></td></tr>)}{!queueLoading && !queueTokens.length && <EmptyRow colSpan={5} text="No citizens are waiting for this service."/>}{queueLoading && <EmptyRow colSpan={5} text="Refreshing queue…"/>}</tbody></table></div><div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><Clock3 size={14}/> {queueTokens.length} citizen{queueTokens.length === 1 ? '' : 's'} currently waiting</div></section>}

        {activeSection === 'staff' && <div className={`${card} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3 text-right">Access</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((member) => <tr key={member._id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{member.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div><p className="font-semibold text-slate-900">{member.name}</p><p className="text-xs text-slate-500">{member.email}</p></div></div></td><td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">{member.role}</span></td><td className="px-5 py-4 text-slate-600">{member.department || '—'}</td><td className="px-5 py-4 text-slate-500">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '—'}</td><td className="px-5 py-4 text-right">{member.role === 'staff' && <button onClick={() => { setPasswordTarget(member); setNewStaffPassword(''); setModal('staff-password'); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Reset password</button>}</td></tr>)}{!filteredUsers.length && <EmptyRow colSpan={5} text="No accounts match this search."/>}</tbody></table></div></div>}

        {activeSection === 'appointments' && <div className={`${card} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Citizen</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Date & time</th><th className="px-5 py-3">Confirmation</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredAppointments.map((appointment) => <tr key={appointment._id}><td className="px-5 py-4"><p className="font-semibold text-slate-900">{appointment.applicantName || appointment.citizen?.name || 'Citizen'}</p><p className="text-xs text-slate-500">{appointment.citizen?.email || appointment.phone || '—'}</p></td><td className="px-5 py-4"><p className="font-medium text-slate-800">{appointment.service?.name || 'Service'}</p><p className="text-xs text-slate-500">{appointment.service?.department || ''}</p></td><td className="px-5 py-4 text-slate-600">{appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : '—'} <span className="text-slate-400">·</span> {appointment.appointmentTime}</td><td className="px-5 py-4 font-mono text-xs text-slate-600">{appointment.confirmationCode || '—'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{appointment.status?.replace('_', ' ')}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1">{appointment.status === 'scheduled' && <><button onClick={() => appointmentAction(appointment, 'check-in')} className="rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Check in</button><button onClick={() => appointmentAction(appointment, 'cancel')} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Cancel</button></>}{appointment.status === 'checked_in' && <button onClick={() => appointmentAction(appointment, 'complete')} className="rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">Complete</button>}</div></td></tr>)}{!filteredAppointments.length && <EmptyRow colSpan={6} text="No appointments match this search."/>}</tbody></table></div><p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Showing the most recent {appointments.length} appointments.</p></div>}
      </>}
    </div>

    {modal === 'service' && <Modal title={editing ? 'Edit service' : 'Add a service'} onClose={() => setModal('')} wide><form onSubmit={saveService} className="grid gap-4 sm:grid-cols-2">{[['name','Service name'],['code','Service code'],['department','Department'],['estimatedProcessingTime','Estimated minutes'],['averageServiceTime','Average service minutes'],['fee','Fee']].map(([field,label])=><label key={field} className="text-sm font-medium text-slate-700">{label}<input required={['name','code','department'].includes(field)} type={field.includes('Time') ? 'number' : 'text'} min={field.includes('Time') ? 1 : undefined} className={`${input} mt-1.5`} value={serviceForm[field] ?? ''} onChange={(event) => setServiceForm({ ...serviceForm, [field]: event.target.value })}/></label>)}{editing ? <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium text-slate-700">Assigned staff</p><div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">{staffMembers.map((member) => <label key={member._id} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={serviceForm.assignedStaff.includes(member._id)} onChange={(event) => setServiceForm({ ...serviceForm, assignedStaff: event.target.checked ? [...serviceForm.assignedStaff, member._id] : serviceForm.assignedStaff.filter((id) => id !== member._id) })} className="accent-emerald-600"/>{member.name} · {member.email}</label>)}</div></div> : <div className="sm:col-span-2"><p className="mb-2 text-sm font-semibold text-slate-800">Appointed staff account</p><p className="mb-3 text-xs text-slate-500">Creating this service also creates the staff login and assigns the account to this service.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Staff name<input required className={`${input} mt-1.5`} value={serviceStaffForm.name} onChange={(event) => setServiceStaffForm({ ...serviceStaffForm, name: event.target.value })}/></label><label className="text-sm font-medium text-slate-700">Staff email<input required type="email" className={`${input} mt-1.5`} value={serviceStaffForm.email} onChange={(event) => setServiceStaffForm({ ...serviceStaffForm, email: event.target.value })}/></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Initial password<input required type="password" minLength={8} className={`${input} mt-1.5`} value={serviceStaffForm.password} onChange={(event) => setServiceStaffForm({ ...serviceStaffForm, password: event.target.value })}/></label></div></div>}
<label className="text-sm font-medium text-slate-700 sm:col-span-2">Public description<textarea rows={3} className={`${input} mt-1.5`} value={serviceForm.description || ''} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })}/></label><label className="text-sm font-medium text-slate-700">Required documents<textarea rows={3} placeholder="One item per line" className={`${input} mt-1.5`} value={(serviceForm.requiredDocuments || []).join('\n')} onChange={(event) => setServiceForm({ ...serviceForm, requiredDocuments: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}/></label><label className="text-sm font-medium text-slate-700">Eligibility<textarea rows={3} placeholder="One item per line" className={`${input} mt-1.5`} value={(serviceForm.eligibility || []).join('\n')} onChange={(event) => setServiceForm({ ...serviceForm, eligibility: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}/></label><label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={serviceForm.isActive} onChange={(event) => setServiceForm({ ...serviceForm, isActive: event.target.checked })} className="h-4 w-4 accent-emerald-600"/> Publish this service in the public directory</label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setModal('')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className={button}>{saving ? 'Saving…' : 'Save service'}</button></div></form></Modal>}

    {modal === 'counter' && <Modal title={editing ? 'Edit counter' : 'Add a counter'} onClose={() => setModal('')} wide><form onSubmit={saveCounter} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Counter number<input required className={`${input} mt-1.5`} value={counterForm.counterNumber} onChange={(event) => setCounterForm({ ...counterForm, counterNumber: event.target.value })}/></label><label className="text-sm font-medium text-slate-700">Display name<input required className={`${input} mt-1.5`} value={counterForm.name} onChange={(event) => setCounterForm({ ...counterForm, name: event.target.value })}/></label><label className="text-sm font-medium text-slate-700">Department<input required className={`${input} mt-1.5`} value={counterForm.department} onChange={(event) => setCounterForm({ ...counterForm, department: event.target.value })}/></label><label className="text-sm font-medium text-slate-700">Initial status<select className={`${input} mt-1.5`} value={counterForm.status} onChange={(event) => setCounterForm({ ...counterForm, status: event.target.value })}><option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option></select></label><div className="sm:col-span-2"><p className="mb-2 text-sm font-medium text-slate-700">Services handled</p><div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">{services.filter((service) => service.isActive).map((service) => <label key={service._id} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={counterForm.services.includes(service._id)} onChange={(event) => setCounterForm({ ...counterForm, services: event.target.checked ? [...counterForm.services, service._id] : counterForm.services.filter((id) => id !== service._id) })} className="accent-emerald-600"/>{service.name}</label>)}</div></div><label className="text-sm font-medium text-slate-700 sm:col-span-2">Assign staff member<select multiple className={`${input} mt-1.5 min-h-28`} value={counterForm.assignedStaff || []} onChange={(event) => setCounterForm({ ...counterForm, assignedStaff: Array.from(event.target.selectedOptions, (option) => option.value) })}>{staffMembers.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.department || 'No department'}</option>)}</select></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setModal('')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className={button}>{saving ? 'Saving…' : 'Save counter'}</button></div></form></Modal>}

    {modal === 'staff-password' && passwordTarget && <Modal title="Reset staff password" onClose={() => { setModal(''); setPasswordTarget(null); }}><form onSubmit={saveStaffPassword} className="space-y-4"><p className="text-sm text-slate-600">Set a new password for <strong>{passwordTarget.email}</strong>. Existing password cannot be viewed because it is stored securely as a one-way hash.</p><label className="block text-sm font-medium text-slate-700">New password<input required type="password" minLength={8} autoComplete="new-password" className={`${input} mt-1.5`} value={newStaffPassword} onChange={(event) => setNewStaffPassword(event.target.value)}/></label><div className="flex justify-end gap-2"><button type="button" onClick={() => { setModal(''); setPasswordTarget(null); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className={button}>{saving ? 'Saving…' : 'Reset password'}</button></div></form></Modal>}
    {modal === 'staff' && <Modal title="Create an account" onClose={() => setModal('')}><form onSubmit={saveStaff} className="space-y-4">{[['name','Full name','text'],['email','Work email','email'],['password','Temporary password','password'],['phone','Phone number','tel'],['department','Department','text']].map(([field,label,type])=><label key={field} className="block text-sm font-medium text-slate-700">{label}<input required={['name','email','password'].includes(field)} type={type} minLength={field === 'password' ? 8 : undefined} className={`${input} mt-1.5`} value={staffForm[field]} onChange={(event) => setStaffForm({ ...staffForm, [field]: event.target.value })}/></label>)}<label className="block text-sm font-medium text-slate-700">Role<select className={`${input} mt-1.5`} value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value })}><option value="staff">Staff member</option><option value="admin">Administrator</option></select></label><div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Share the temporary password securely. The new account can sign in immediately.</div><div className="flex justify-end gap-2"><button type="button" onClick={() => setModal('')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className={button}>{saving ? 'Creating…' : 'Create account'}</button></div></form></Modal>}
  </div>;
}

function EmptyRow({ colSpan, text }) { return <tr><td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-slate-500">{text}</td></tr>; }
