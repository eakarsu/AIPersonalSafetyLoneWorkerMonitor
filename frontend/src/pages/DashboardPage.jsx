import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Bell,
  ClipboardCheck,
  Loader2,
  ChevronRight,
  Clock,
  MapPin,
  ShieldAlert,
  Activity,
  Siren,
} from 'lucide-react';
import api from '../services/api';

function StatCard({ icon: Icon, label, value, subtitle, color, onClick }) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
    red: 'from-red-500 to-red-600 shadow-red-500/20',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/20',
    green: 'from-green-500 to-green-600 shadow-green-500/20',
  };

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4 hover:shadow-md hover:border-gray-200 transition text-left w-full group"
    >
      <div
        className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-center`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 mt-1 group-hover:text-gray-500 transition" />
    </button>
  );
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-gray-400" />
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-600 w-24 truncate">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-500 w-8 text-right">{count}</span>
    </div>
  );
}

function severityBadge(severity) {
  const map = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[severity] || 'bg-gray-100 text-gray-600'}`}>
      {severity}
    </span>
  );
}

function statusBadge(status) {
  const map = {
    open: 'bg-red-100 text-red-700',
    investigating: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
    active: 'bg-red-100 text-red-700',
    acknowledged: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosMessage, setSosMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [wRes, iRes, eRes, cRes] = await Promise.all([
          api.get('/workers'),
          api.get('/incidents'),
          api.get('/emergencies'),
          api.get('/checkins'),
        ]);
        setWorkers(wRes.data.data || wRes.data);
        setIncidents(iRes.data.data || iRes.data);
        setEmergencies(eRes.data.data || eRes.data);
        setCheckins(cRes.data.data || cRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSOS = async () => {
    const workerId = prompt('Enter Worker ID for SOS alert:');
    if (!workerId) return;
    setSosLoading(true);
    setSosMessage('');
    try {
      await api.post('/sos', { worker_id: parseInt(workerId), description: 'SOS triggered from dashboard' });
      setSosMessage('SOS alert sent successfully! Emergency services notified.');
    } catch (err) {
      setSosMessage('Failed to send SOS: ' + (err.response?.data?.error || err.message));
    } finally {
      setSosLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Compute stats
  const activeWorkers = workers.filter((w) => w.status === 'active').length;
  const activeIncidents = incidents.filter(
    (i) => i.status === 'open' || i.status === 'investigating'
  ).length;
  const activeEmergencies = emergencies.filter(
    (e) => e.status === 'active'
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCheckins = checkins.filter((c) => {
    const d = new Date(c.checked_in_at || c.created_at);
    return d >= today;
  }).length;

  // Worker status breakdown
  const statusCounts = {};
  workers.forEach((w) => {
    const s = w.status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    on_break: 'bg-blue-400',
    off_duty: 'bg-slate-300',
    emergency: 'bg-red-500',
    unknown: 'bg-gray-300',
  };

  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const recentEmergencies = [...emergencies]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const recentCheckins = [...checkins]
    .sort((a, b) => new Date(b.checked_in_at || b.created_at) - new Date(a.checked_in_at || a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header with SOS button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your lone worker safety operations</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleSOS}
            disabled={sosLoading}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-95 text-sm uppercase tracking-wide"
          >
            <Siren className="w-5 h-5" />
            {sosLoading ? 'Sending SOS...' : 'SOS Emergency'}
          </button>
          {sosMessage && (
            <p className={`text-xs font-medium ${sosMessage.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {sosMessage}
            </p>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Workers"
          value={workers.length}
          subtitle={`${activeWorkers} currently active`}
          color="blue"
          onClick={() => navigate('/workers')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Incidents"
          value={activeIncidents}
          subtitle={`${incidents.length} total`}
          color="red"
          onClick={() => navigate('/incidents')}
        />
        <StatCard
          icon={Bell}
          label="Emergency Alerts"
          value={activeEmergencies}
          subtitle={`${emergencies.length} total`}
          color="amber"
          onClick={() => navigate('/emergencies')}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Today's Check-ins"
          value={todayCheckins}
          subtitle={`${checkins.length} total`}
          color="green"
          onClick={() => navigate('/checkins')}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents - spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="Recent Incidents" icon={AlertTriangle} />
          {recentIncidents.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No incidents recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Severity</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4 font-medium text-gray-700 max-w-[200px] truncate">
                        {inc.title || inc.description?.slice(0, 40) || `Incident #${inc.id}`}
                      </td>
                      <td className="py-2.5 pr-4">{severityBadge(inc.severity)}</td>
                      <td className="py-2.5 pr-4">{statusBadge(inc.status)}</td>
                      <td className="py-2.5 text-gray-400">{formatTime(inc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Worker Status Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="Worker Status" icon={Activity} />
          <div className="space-y-3 mt-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <StatusBar
                key={status}
                label={status.replace(/_/g, ' ')}
                count={count}
                total={workers.length}
                color={statusColors[status] || 'bg-gray-400'}
              />
            ))}
          </div>
          {workers.length === 0 && (
            <p className="text-sm text-gray-400 py-6 text-center">No workers registered</p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Emergencies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="Recent Emergencies" icon={ShieldAlert} />
          {recentEmergencies.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No emergencies recorded</p>
          ) : (
            <div className="space-y-3">
              {recentEmergencies.map((em) => (
                <div
                  key={em.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {em.type || em.description?.slice(0, 40) || `Emergency #${em.id}`}
                      </p>
                      {statusBadge(em.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(em.created_at)}
                      </span>
                      {em.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {em.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Check-ins */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="Recent Check-ins" icon={ClipboardCheck} />
          {recentCheckins.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No check-ins recorded</p>
          ) : (
            <div className="space-y-3">
              {recentCheckins.map((ci) => (
                <div
                  key={ci.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ClipboardCheck className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {ci.worker_name || `Worker #${ci.worker_id}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(ci.checked_in_at || ci.created_at)}
                      </span>
                      {ci.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ci.location}
                        </span>
                      )}
                      {ci.status && statusBadge(ci.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
