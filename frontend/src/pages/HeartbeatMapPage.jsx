import { useState, useEffect } from 'react';
import { Radio, MapPin, Battery, Clock } from 'lucide-react';
import api from '../services/api';

function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function batteryColor(pct) {
  if (pct === null || pct === undefined) return 'text-gray-400';
  if (pct > 50) return 'text-green-500';
  if (pct > 20) return 'text-amber-500';
  return 'text-red-500';
}

export default function HeartbeatMapPage() {
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState('');
  const [heartbeatForm, setHeartbeatForm] = useState({ worker_id: '', lat: '', lng: '', battery_pct: '' });
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    api.get('/workers').then((res) => {
      setWorkers(res.data.data || res.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadHistory = async (id) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await api.get(`/workers/${id}/heartbeat-history`);
      setHistory(res.data.data || res.data || []);
    } catch (err) {
      console.error('Heartbeat history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleWorkerSelect = (w) => {
    setSelected(w);
    loadHistory(w.id);
  };

  const handleHeartbeatSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg('');
    try {
      await api.post('/heartbeat', {
        worker_id: parseInt(heartbeatForm.worker_id),
        lat: heartbeatForm.lat ? parseFloat(heartbeatForm.lat) : undefined,
        lng: heartbeatForm.lng ? parseFloat(heartbeatForm.lng) : undefined,
        battery_pct: heartbeatForm.battery_pct ? parseInt(heartbeatForm.battery_pct) : undefined,
      });
      setSubmitMsg('Heartbeat recorded successfully.');
      setHeartbeatForm({ worker_id: '', lat: '', lng: '', battery_pct: '' });
      if (selected && selected.id === parseInt(heartbeatForm.worker_id)) {
        loadHistory(selected.id);
      }
    } catch (err) {
      setSubmitMsg('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Heartbeat Map</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time worker location tracking via device heartbeats</p>
      </div>

      {/* Manual heartbeat form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Submit Device Heartbeat</h2>
        <form onSubmit={handleHeartbeatSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Worker ID *</label>
            <input type="number" value={heartbeatForm.worker_id} onChange={(e) => setHeartbeatForm({ ...heartbeatForm, worker_id: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Latitude</label>
            <input type="number" step="any" value={heartbeatForm.lat} onChange={(e) => setHeartbeatForm({ ...heartbeatForm, lat: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 40.7128" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Longitude</label>
            <input type="number" step="any" value={heartbeatForm.lng} onChange={(e) => setHeartbeatForm({ ...heartbeatForm, lng: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. -74.0060" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Battery %</label>
            <input type="number" min="0" max="100" value={heartbeatForm.battery_pct} onChange={(e) => setHeartbeatForm({ ...heartbeatForm, battery_pct: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 85" />
          </div>
          <div className="col-span-2 md:col-span-4 flex items-center gap-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Send Heartbeat</button>
            {submitMsg && <span className={`text-xs font-medium ${submitMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{submitMsg}</span>}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workers list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Select Worker</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading workers...</p>
          ) : (
            <div className="space-y-2">
              {workers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleWorkerSelect(w)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${selected?.id === w.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {w.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{w.name}</p>
                    <p className="text-xs text-gray-400">{w.department || 'No department'} · ID: {w.id}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Heartbeat history */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {selected ? `Heartbeat History — ${selected.name}` : 'Select a worker to view heartbeat history'}
          </h2>
          {historyLoading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No heartbeat data available{selected ? ' for this worker' : ''}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Latitude</th>
                    <th className="pb-2 pr-4">Longitude</th>
                    <th className="pb-2">Battery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4 flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {formatTime(h.recorded_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          {h.lat != null ? Number(h.lat).toFixed(5) : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">{h.lng != null ? Number(h.lng).toFixed(5) : '-'}</td>
                      <td className="py-2.5">
                        <span className={`flex items-center gap-1 font-medium ${batteryColor(h.battery_pct)}`}>
                          <Battery className="w-3 h-3" />
                          {h.battery_pct != null ? `${h.battery_pct}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
