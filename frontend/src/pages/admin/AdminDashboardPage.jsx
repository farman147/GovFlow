import {
  Activity,
  BarChart3,
  Clock3,
  LogOut,
  TrendingUp,
  Users,
  RefreshCw,
  Server,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getAdminDashboard } from '../../api/adminService';
import { getApiErrorMessage } from '../../api/axios';
import { getPredictions } from '../../api/predictionService';
import { useAuth } from '../../context/AuthContext';
import AdminWorkspace from './AdminWorkspace';

const formatMinutes = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${value} min`;
};

const resolveHourlyValues = (record) => {
  if (!record) return [];

  return Object.entries(record)
    .filter(([key]) => key.startsWith('hour_'))
    .map(([key, value]) => ({
      hour: Number(key.replace('hour_', '')),
      value: Number(value),
    }))
    .sort((a, b) => a.hour - b.hour);
};

const buildLinePath = (points) => {
  if (!points.length) return '';

  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');
};

export default function AdminDashboardPage({ initialSection = 'overview' }) {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState(initialSection);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [predictions, setPredictions] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [predictionError, setPredictionError] = useState('');

  const [tooltip, setTooltip] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getAdminDashboard();

      setStats(response.data?.data || null);
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          'Unable to load the admin dashboard.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      setPredictionLoading(true);
      setPredictionError('');

      const response = await getPredictions();

      const items = response.data?.data || [];

      setPredictions(items);

      if (
        items.length &&
        !items.some(
          (item) => item.service_type === selectedService
        )
      ) {
        setSelectedService(items[0].service_type);
      }
    } catch (loadError) {
      setPredictionError(
        getApiErrorMessage(
          loadError,
          'Unable to load AI demand predictions.'
        )
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadPredictions();
  }, []);

  const selectedPrediction =
    predictions.find(
      (item) => item.service_type === selectedService
    ) ||
    predictions[0] ||
    null;

  const hourlyValues = useMemo(
    () => resolveHourlyValues(selectedPrediction),
    [selectedPrediction]
  );

  const values = hourlyValues.map((entry) => entry.value);

  const peakPoint = hourlyValues.reduce(
    (peak, current) =>
      current.value > peak.value ? current : peak,
    hourlyValues[0] || {
      hour: 0,
      value: 0,
    }
  );

  const averageDemand = values.length
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : 0;

  const chartWidth = 760;
  const chartHeight = 300;

  const chartPadding = {
    top: 24,
    right: 20,
    bottom: 34,
    left: 48,
  };

  const chartInnerWidth =
    chartWidth -
    chartPadding.left -
    chartPadding.right;

  const chartInnerHeight =
    chartHeight -
    chartPadding.top -
    chartPadding.bottom;

  const minValue = values.length
    ? Math.min(...values)
    : 0;

  const maxValue = values.length
    ? Math.max(...values)
    : 0;

  const yRange = maxValue - minValue || 1;

  const chartPoints = hourlyValues.map((point) => {
    const x =
      chartPadding.left +
      ((point.hour - 1) / (24 - 1)) *
        chartInnerWidth;

    const y =
      chartPadding.top +
      ((maxValue - point.value) / yRange) *
        chartInnerHeight;

    return {
      ...point,
      x,
      y,
    };
  });

  const linePath = buildLinePath(chartPoints);

  const areaPath = chartPoints.length
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${
        chartHeight - chartPadding.bottom
      } L ${chartPoints[0].x} ${
        chartHeight - chartPadding.bottom
      } Z`
    : '';

  const cards = [
    {
      label: 'Total citizens',
      value: stats?.totalCitizens ?? 'N/A',
      icon: Users,
      description: 'Registered citizens',
    },
    {
      label: 'Active services',
      value: stats?.totalActiveServices ?? 'N/A',
      icon: Activity,
      description: 'Currently available',
    },
    {
      label: 'Waiting tokens',
      value: stats?.waitingTokens ?? 'N/A',
      icon: Clock3,
      description: 'Currently waiting',
    },
    {
      label: 'Active counters',
      value: stats?.activeCounters ?? 'N/A',
      icon: BarChart3,
      description: 'Currently operational',
    },
  ];

  if (activeSection !== 'overview') {
    return (
      <AdminWorkspace
        activeSection={activeSection}
        onNavigate={setActiveSection}
        user={user}
        logout={logout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <Activity size={20} />
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                  govflow Administration
                </p>
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Operational overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor live queue activity, service performance,
                counters, citizens, and AI demand forecasts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Signed in
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {user?.name || 'Admin'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => logout(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>

        <nav className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-6" aria-label="Admin sections">
          <button type="button" onClick={() => setActiveSection('overview')} className="flex items-center gap-3 rounded-xl bg-slate-900 px-3 py-3 text-left text-white"><Activity size={18}/><span className="text-sm font-semibold">Overview</span></button>
          {[
            ['services', 'Services', 'Browse and edit the service catalog'],
            ['counters', 'Counters', 'Manage desks and staff assignments'],
            ['queue', 'Queue monitor', 'Call and monitor waiting tokens'],
            ['staff', 'Staff & access', 'Manage staff and administrator accounts'],
            ['appointments', 'Appointments', 'Review citizen bookings'],
          ].map(([section, label, description]) => (
            <button key={section} type="button" title={description} onClick={() => setActiveSection(section)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><span className="text-sm font-semibold">{label}</span></button>
          ))}
        </nav>

        {/* LOADING */}
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <RefreshCw
                size={22}
                className="animate-spin"
              />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Loading dashboard
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Fetching live govflow operational data.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-semibold text-red-800">
              Unable to load dashboard
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadDashboard}
              className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* TOP STATS */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(
                ({
                  label,
                  value,
                  icon: Icon,
                  description,
                }) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                          {label}
                        </p>

                        <p className="mt-3 text-3xl font-bold text-slate-900">
                          {value}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {description}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                        <Icon size={20} />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* TODAY + QUEUE */}
            <div className="mt-6 grid gap-6 xl:grid-cols-2">

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                    <Activity size={19} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Live operations
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Today&apos;s token activity
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Tokens today
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {stats?.totalTokensToday ?? 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Currently serving
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {stats?.currentlyServingTokens ?? 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Completed
                    </p>

                    <p className="mt-2 text-2xl font-bold text-emerald-700">
                      {stats?.completedTokens ?? 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Cancelled
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {stats?.cancelledTokens ?? 'N/A'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                    <Clock3 size={19} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Queue health
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Queue performance
                    </h2>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <span className="text-sm text-slate-600">
                      Average waiting time
                    </span>

                    <strong className="text-sm text-slate-900">
                      {formatMinutes(
                        stats?.averageWaitingTime
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <span className="text-sm text-slate-600">
                      Average service time
                    </span>

                    <strong className="text-sm text-slate-900">
                      {formatMinutes(
                        stats?.averageServiceTime
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <span className="text-sm text-slate-600">
                      Waiting tokens
                    </span>

                    <strong className="text-sm text-slate-900">
                      {stats?.waitingTokens ?? 'N/A'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <span className="text-sm text-slate-600">
                      Active counters
                    </span>

                    <strong className="text-sm text-slate-900">
                      {stats?.activeCounters ?? 'N/A'}
                    </strong>
                  </div>
                </div>
              </section>
            </div>

            {/* BUSIEST SERVICES */}
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <BarChart3 size={19} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Service activity
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Busiest services
                  </h2>
                </div>
              </div>

              {stats?.busiestServices?.length ? (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Service
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Code
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Tokens
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {stats.busiestServices.map(
                        (service) => (
                          <tr
                            key={`${service.code}-${service.service}`}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-4 py-4 font-medium text-slate-900">
                              {service.service}
                            </td>

                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {service.code}
                              </span>
                            </td>

                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {service.tokens}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                  No service statistics are available right now.
                </div>
              )}
            </section>

            {/* AI FORECAST */}
            <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">

              <div className="border-b border-emerald-100 bg-emerald-50/60 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-600 p-2 text-white">
                      <TrendingUp size={20} />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                        AI Demand Forecast
                      </p>

                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        24-hour service demand
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Demand prediction data returned by the govflow AI backend.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className="font-medium text-slate-600">
                      Service
                    </span>

                    <select
                      value={selectedService}
                      onChange={(event) =>
                        setSelectedService(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white"
                    >
                      {predictions.map((item) => (
                        <option
                          key={item.service_type}
                          value={item.service_type}
                        >
                          {item.service_type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="p-5">

                {predictionLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                    <RefreshCw
                      size={20}
                      className="mx-auto animate-spin text-emerald-600"
                    />

                    <p className="mt-3 text-sm text-slate-600">
                      Loading prediction data...
                    </p>
                  </div>
                ) : predictionError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-semibold text-red-800">
                      Unable to load AI predictions
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {predictionError}
                    </p>

                    <button
                      type="button"
                      onClick={loadPredictions}
                      className="mt-4 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Try again
                    </button>
                  </div>
                ) : selectedPrediction ? (
                  <>
                    {/* AI SUMMARY CARDS */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                          Selected service
                        </p>

                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {selectedPrediction.service_type}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                          Peak demand
                        </p>

                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {peakPoint.value.toFixed(2)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                          Peak hour
                        </p>

                        <p className="mt-2 text-lg font-bold text-slate-900">
                          Hour {peakPoint.hour}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                          Average demand
                        </p>

                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {averageDemand.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* CHART */}
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Demand across 24 hours
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Predicted demand by hour
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-emerald-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          Forecast
                        </div>
                      </div>

                      <div className="relative overflow-x-auto">
                        <svg
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          className="h-[320px] min-w-[700px] w-full"
                          role="img"
                          aria-label={`${selectedPrediction.service_type} 24-hour demand chart`}
                        >
                          {[0, 0.25, 0.5, 0.75, 1].map(
                            (ratio) => {
                              const y =
                                chartPadding.top +
                                ratio *
                                  chartInnerHeight;

                              return (
                                <g key={ratio}>
                                  <line
                                    x1={
                                      chartPadding.left
                                    }
                                    x2={
                                      chartWidth -
                                      chartPadding.right
                                    }
                                    y1={y}
                                    y2={y}
                                    stroke="#cbd5e1"
                                    strokeDasharray="4 4"
                                  />

                                  <text
                                    x="8"
                                    y={y + 4}
                                    fill="#64748b"
                                    fontSize="11"
                                  >
                                    {(
                                      maxValue -
                                      ratio * yRange
                                    ).toFixed(1)}
                                  </text>
                                </g>
                              );
                            }
                          )}

                          {areaPath ? (
                            <path
                              d={areaPath}
                              fill="rgba(16, 185, 129, 0.10)"
                            />
                          ) : null}

                          {linePath ? (
                            <path
                              d={linePath}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : null}

                          {chartPoints.map(
                            (point) => (
                              <g
                                key={`${selectedPrediction.service_type}-${point.hour}`}
                              >
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r="4"
                                  fill="#10b981"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  className="cursor-pointer"
                                  onMouseEnter={(
                                    event
                                  ) => {
                                    const bounds =
                                      event.currentTarget.ownerSVGElement.getBoundingClientRect();

                                    const x =
                                      event.clientX -
                                      bounds.left;

                                    const y =
                                      event.clientY -
                                      bounds.top;

                                    setTooltip({
                                      x,
                                      y,
                                      label: `Hour ${point.hour}`,
                                      value:
                                        point.value.toFixed(
                                          2
                                        ),
                                    });
                                  }}
                                  onMouseLeave={() =>
                                    setTooltip(null)
                                  }
                                />
                              </g>
                            )
                          )}

                          {chartPoints
                            .filter((point) =>
                              [
                                1,
                                6,
                                12,
                                18,
                                24,
                              ].includes(
                                point.hour
                              )
                            )
                            .map((point) => (
                              <g
                                key={`label-${point.hour}`}
                              >
                                <text
                                  x={point.x}
                                  y={
                                    chartHeight - 10
                                  }
                                  fill="#64748b"
                                  fontSize="11"
                                  textAnchor="middle"
                                >
                                  {point.hour}
                                </text>
                              </g>
                            ))}
                        </svg>

                        {tooltip ? (
                          <div
                            className="pointer-events-none absolute rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg"
                            style={{
                              left: `${Math.min(
                                tooltip.x + 12,
                                chartWidth - 82
                              )}px`,
                              top: `${Math.max(
                                tooltip.y - 30,
                                12
                              )}px`,
                            }}
                          >
                            <div>{tooltip.label}</div>

                            <div className="mt-1 font-bold text-emerald-700">
                              {tooltip.value}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center">
                    <Server
                      size={24}
                      className="mx-auto text-slate-400"
                    />

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No prediction data available
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      The AI prediction service has not returned data yet.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* REFRESH */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  loadDashboard();
                  loadPredictions();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw size={15} />
                Refresh dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
