import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function CheckInDashboardPage() {
  const [workers, setWorkers] = useState([]);
  const [overdueWorkers, setOverdueWorkers] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [liveEvents, setLiveEvents] = useState([]);
  const wsRef = useRef(null);

  const fetchData = async () => {
    try {
      const [wRes, oRes] = await Promise.all([
        api.get('/api/workers'),
        api.get(`/api/checkins/overdue?interval_minutes=${intervalMinutes}`),
      ]);
      setWorkers(wRes.data.data || []);
      setOverdueWorkers(oRes.data.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [intervalMinutes]);

  // WebSocket connection for live updates
  useEffect(() => {
    const wsPort = 3002;
    const wsUrl = `ws://localhost:${wsPort}`;
    let reconnectTimer = null;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus('connected');
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            setLiveEvents((prev) => [{ ...msg, receivedAt: new Date().toISOString() }, ...prev.slice(0, 19)]);
            if (msg.type === 'checkin' || msg.type === 'overdue_alert' || msg.type === 'overdue_poll') {
              fetchData();
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsStatus('disconnected');
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          setWsStatus('error');
          ws.close();
        };
      } catch {
        setWsStatus('error');
        reconnectTimer = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const getStatusColor = (status) => {
    if (status === 'emergency') return 'bg-red-100 border-red-400';
    if (status === 'offline') return 'bg-gray-100 border-gray-300';
    return 'bg-green-50 border-green-300';
  };

  const isOverdue = (worker) => overdueWorkers.some((o) => o.id === worker.id);

  const overdueIds = new Set(overdueWorkers.map((w) => w.id));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading dashboard...</div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-In Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Live worker status board with real-time updates</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Check-in interval:</label>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            wsStatus === 'connected' ? 'bg-green-100 text-green-700' :
            wsStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              wsStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'error' ? 'Error' : 'Connecting...'}
          </div>
          <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-gray-900">{workers.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Workers</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-3xl font-bold text-green-700">{workers.filter(w => w.status === 'active').length}</div>
          <div className="text-sm text-green-600 mt-1">Active</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-3xl font-bold text-red-700">{overdueWorkers.length}</div>
          <div className="text-sm text-red-600 mt-1">Overdue Check-in</div>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <div className="text-3xl font-bold text-orange-700">{workers.filter(w => w.status === 'emergency').length}</div>
          <div className="text-sm text-orange-600 mt-1">Emergency</div>
        </div>
      </div>

      {/* Overdue alerts */}
      {overdueWorkers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="text-red-800 font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Overdue Check-ins ({overdueWorkers.length})
          </h2>
          <div className="space-y-2">
            {overdueWorkers.map((w) => (
              <div key={w.id} className="bg-white rounded-lg border border-red-200 p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{w.name}</span>
                  <span className="text-gray-500 text-sm ml-2">— {w.department}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-red-600 text-sm font-medium">
                    {Math.round(w.minutes_since_checkin || 0)} min ago
                  </span>
                  <span className="text-gray-400 text-sm">{w.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worker status board */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">All Workers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className={`rounded-xl border-2 p-4 ${getStatusColor(worker.status)} ${
                overdueIds.has(worker.id) ? 'ring-2 ring-red-400' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{worker.name}</div>
                  <div className="text-sm text-gray-500">{worker.department} · {worker.role}</div>
                  <div className="text-xs text-gray-400 mt-1">{worker.location}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={worker.status} />
                  {overdueIds.has(worker.id) && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">OVERDUE</span>
                  )}
                </div>
              </div>
              {worker.last_check_in && (
                <div className="mt-2 text-xs text-gray-400">
                  Last check-in: {new Date(worker.last_check_in).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live events feed */}
      {liveEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Live Events</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {liveEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded-lg">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  event.type === 'overdue_alert' ? 'bg-red-100 text-red-700' :
                  event.type === 'checkin' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>{event.type}</span>
                <span className="text-gray-600 flex-1 truncate">{JSON.stringify(event.data || event.message)}</span>
                <span className="text-gray-400 text-xs">{new Date(event.receivedAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
