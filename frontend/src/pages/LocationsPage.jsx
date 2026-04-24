import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

const emptyForm = {
  worker_id: '',
  latitude: '',
  longitude: '',
  address: '',
  zone: '',
  risk_level: 'low',
};

const columns = [
  { key: 'worker_id', label: 'Worker ID' },
  { key: 'address', label: 'Address' },
  { key: 'zone', label: 'Zone' },
  { key: 'risk_level', label: 'Risk Level', render: (val) => <StatusBadge status={val} /> },
  { key: 'recorded_at', label: 'Recorded At', render: (val) => val ? new Date(val).toLocaleString() : '—' },
];

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/locations');
      setLocations(res.data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (location) => {
    setEditing(location);
    setForm({
      worker_id: location.worker_id || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      address: location.address || '',
      zone: location.zone || '',
      risk_level: location.risk_level || 'low',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      worker_id: form.worker_id ? Number(form.worker_id) : null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    try {
      if (editing) {
        await api.put(`/api/locations/${editing.id}`, payload);
      } else {
        await api.post('/api/locations', payload);
      }
      setModalOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save location:', err);
    }
  };

  const handleDelete = async (location) => {
    if (!window.confirm('Are you sure you want to delete this location record?')) return;
    try {
      await api.delete(`/api/locations/${location.id}`);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete location:', err);
    }
  };

  const formatDate = (val) => val ? new Date(val).toLocaleString() : '—';

  const detailFields = selected
    ? [
        { label: 'Worker ID', value: selected.worker_id },
        { label: 'Address', value: selected.address || '—' },
        { label: 'Zone', value: selected.zone || '—' },
        { label: 'Risk Level', value: <StatusBadge status={selected.risk_level} /> },
        { label: 'Latitude', value: selected.latitude ?? '—' },
        { label: 'Longitude', value: selected.longitude ?? '—' },
        { label: 'Recorded At', value: formatDate(selected.recorded_at) },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading locations...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add New Location
        </button>
      </div>

      <DataTable
        columns={columns}
        data={locations}
        onRowClick={(row) => setSelected(row)}
      />

      {selected && (
        <DetailPanel
          title={selected.address || `Location #${selected.id}`}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Location' : 'Add New Location'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Worker ID</label>
            <input
              type="number"
              name="worker_id"
              value={form.worker_id}
              onChange={handleChange}
              placeholder="Enter worker ID"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              name="latitude"
              value={form.latitude}
              onChange={handleChange}
              placeholder="e.g. 40.7128"
              step="any"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              name="longitude"
              value={form.longitude}
              onChange={handleChange}
              placeholder="e.g. -74.0060"
              step="any"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter address"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
            <input
              type="text"
              name="zone"
              value={form.zone}
              onChange={handleChange}
              placeholder="Enter zone"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
            <select
              name="risk_level"
              value={form.risk_level}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {editing ? 'Update Location' : 'Create Location'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
