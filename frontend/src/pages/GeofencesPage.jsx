import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

const emptyForm = { name: '', zone_type: 'restricted', risk_level: 'medium', boundary_min_lat: '', boundary_max_lat: '', boundary_min_lng: '', boundary_max_lng: '' };

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [checkForm, setCheckForm] = useState({ lat: '', lng: '' });
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError] = useState('');

  const fetchGeofences = async () => {
    try {
      const res = await api.get('/geofences');
      setGeofences(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGeofences(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const boundary = {
        minLat: parseFloat(form.boundary_min_lat),
        maxLat: parseFloat(form.boundary_max_lat),
        minLng: parseFloat(form.boundary_min_lng),
        maxLng: parseFloat(form.boundary_max_lng),
      };
      const payload = { name: form.name, zone_type: form.zone_type, risk_level: form.risk_level, boundary };
      if (editItem) {
        await api.put(`/geofences/${editItem.id}`, payload);
      } else {
        await api.post('/geofences', payload);
      }
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
      fetchGeofences();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleEdit = (g) => {
    const b = typeof g.boundary === 'string' ? JSON.parse(g.boundary) : (g.boundary || {});
    setForm({
      name: g.name || '',
      zone_type: g.zone_type || 'restricted',
      risk_level: g.risk_level || 'medium',
      boundary_min_lat: b.minLat || '',
      boundary_max_lat: b.maxLat || '',
      boundary_min_lng: b.minLng || '',
      boundary_max_lng: b.maxLng || '',
    });
    setEditItem(g);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this geofence?')) return;
    await api.delete(`/geofences/${id}`);
    fetchGeofences();
  };

  const handleCheckLocation = async (e) => {
    e.preventDefault();
    setCheckResult(null);
    try {
      const res = await api.post('/geofences/check-location', { lat: parseFloat(checkForm.lat), lng: parseFloat(checkForm.lng) });
      setCheckResult(res.data.data);
    } catch (err) {
      setCheckResult({ error: err.response?.data?.error || err.message });
    }
  };

  const riskColor = { low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geofences</h1>
          <p className="text-sm text-gray-500 mt-1">Define and manage geographic safety zones</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditItem(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Geofence
        </button>
      </div>

      {/* Check Location */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Check Location Against Geofences</h2>
        <form onSubmit={handleCheckLocation} className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Latitude</label>
            <input type="number" step="any" required value={checkForm.lat} onChange={(e) => setCheckForm({ ...checkForm, lat: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36" placeholder="e.g. 40.712" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Longitude</label>
            <input type="number" step="any" required value={checkForm.lng} onChange={(e) => setCheckForm({ ...checkForm, lng: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36" placeholder="e.g. -74.006" />
          </div>
          <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">Check</button>
        </form>
        {checkResult && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 text-sm">
            {checkResult.error ? (
              <p className="text-red-600">{checkResult.error}</p>
            ) : (
              <>
                <p className="font-medium text-gray-700">
                  {checkResult.inside_count === 0 ? (
                    <span className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" /> Location is outside all geofences</span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-600"><XCircle className="w-4 h-4" /> Inside {checkResult.inside_count} geofence(s)</span>
                  )}
                </p>
                {checkResult.matching_geofences?.map((g) => (
                  <p key={g.id} className="text-gray-600 ml-6">• {g.name} ({g.zone_type}, risk: {g.risk_level})</p>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Geofences list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : geofences.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No geofences defined yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Zone Type</th>
                  <th className="pb-2 pr-4">Risk Level</th>
                  <th className="pb-2 pr-4">Boundary</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {geofences.map((g) => {
                  const b = typeof g.boundary === 'string' ? JSON.parse(g.boundary || 'null') : g.boundary;
                  return (
                    <tr key={g.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4 font-medium text-gray-700">
                        <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-400" />{g.name}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 capitalize">{g.zone_type}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${riskColor[g.risk_level] || 'bg-gray-100 text-gray-600'}`}>{g.risk_level}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-400">
                        {b ? `${b.minLat?.toFixed(3) || '?'}–${b.maxLat?.toFixed(3) || '?'}, ${b.minLng?.toFixed(3) || '?'}–${b.maxLng?.toFixed(3) || '?'}` : 'Not set'}
                      </td>
                      <td className="py-2.5 flex items-center gap-2">
                        <button onClick={() => handleEdit(g)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editItem ? 'Edit Geofence' : 'New Geofence'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Zone Type</label>
                  <select value={form.zone_type} onChange={(e) => setForm({ ...form, zone_type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="restricted">Restricted</option>
                    <option value="hazardous">Hazardous</option>
                    <option value="safe">Safe</option>
                    <option value="monitoring">Monitoring</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Risk Level</label>
                  <select value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bounding Box</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Latitude</label>
                  <input type="number" step="any" value={form.boundary_min_lat} onChange={(e) => setForm({ ...form, boundary_min_lat: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 40.70" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Latitude</label>
                  <input type="number" step="any" value={form.boundary_max_lat} onChange={(e) => setForm({ ...form, boundary_max_lat: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 40.75" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Longitude</label>
                  <input type="number" step="any" value={form.boundary_min_lng} onChange={(e) => setForm({ ...form, boundary_min_lng: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. -74.02" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Longitude</label>
                  <input type="number" step="any" value={form.boundary_max_lng} onChange={(e) => setForm({ ...form, boundary_max_lng: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. -73.98" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
