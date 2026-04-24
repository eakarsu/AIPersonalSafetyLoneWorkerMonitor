import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const TYPES = ['sos', 'medical', 'fire', 'security', 'other'];
const STATUSES = ['active', 'responding', 'resolved'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const emptyForm = {
  worker_id: '',
  type: 'sos',
  status: 'active',
  description: '',
  location: '',
  priority: 'high',
};

const columns = [
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
  { key: 'priority', label: 'Priority', render: (val) => <StatusBadge status={val} /> },
  { key: 'location', label: 'Location' },
  { key: 'triggered_at', label: 'Triggered At', render: (val) => val ? new Date(val).toLocaleString() : '—' },
];

export default function EmergenciesPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/emergencies');
      setEmergencies(res.data);
    } catch (err) {
      console.error('Failed to fetch emergencies:', err);
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

  const openEdit = (emergency) => {
    setEditing(emergency);
    setForm({
      worker_id: emergency.worker_id || '',
      type: emergency.type || 'sos',
      status: emergency.status || 'active',
      description: emergency.description || '',
      location: emergency.location || '',
      priority: emergency.priority || 'high',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, worker_id: form.worker_id ? Number(form.worker_id) : null };
    try {
      if (editing) {
        await api.put(`/api/emergencies/${editing.id}`, payload);
      } else {
        await api.post('/api/emergencies', payload);
      }
      setModalOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save emergency:', err);
    }
  };

  const handleDelete = async (emergency) => {
    if (!window.confirm('Are you sure you want to delete this emergency?')) return;
    try {
      await api.delete(`/api/emergencies/${emergency.id}`);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete emergency:', err);
    }
  };

  const formatDate = (val) => val ? new Date(val).toLocaleString() : '—';

  const detailFields = selected
    ? [
        { label: 'Type', value: selected.type },
        { label: 'Status', value: <StatusBadge status={selected.status} /> },
        { label: 'Priority', value: <StatusBadge status={selected.priority} /> },
        { label: 'Location', value: selected.location || '—' },
        { label: 'Description', value: selected.description || '—' },
        { label: 'Worker ID', value: selected.worker_id },
        { label: 'Triggered At', value: formatDate(selected.triggered_at) },
        { label: 'Resolved At', value: formatDate(selected.resolved_at) },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading emergencies...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Emergencies</h1>
        <button
          onClick={openCreate}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add New Emergency
        </button>
      </div>

      <DataTable
        columns={columns}
        data={emergencies}
        onRowClick={(row) => setSelected(row)}
      />

      {selected && (
        <DetailPanel
          title={`Emergency: ${selected.type.toUpperCase()}`}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Emergency' : 'Add New Emergency'}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the emergency..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Enter location"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              {editing ? 'Update Emergency' : 'Create Emergency'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
