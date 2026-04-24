import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'investigating', 'resolved', 'closed'];

const emptyForm = {
  title: '',
  description: '',
  worker_id: '',
  severity: 'low',
  status: 'open',
  location: '',
};

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'severity', label: 'Severity', render: (val) => <StatusBadge status={val} /> },
  { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
  { key: 'location', label: 'Location' },
  { key: 'reported_at', label: 'Reported At', render: (val) => val ? new Date(val).toLocaleString() : '—' },
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/incidents');
      setIncidents(res.data);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
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

  const openEdit = (incident) => {
    setEditing(incident);
    setForm({
      title: incident.title || '',
      description: incident.description || '',
      worker_id: incident.worker_id || '',
      severity: incident.severity || 'low',
      status: incident.status || 'open',
      location: incident.location || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, worker_id: form.worker_id ? Number(form.worker_id) : null };
    try {
      if (editing) {
        await api.put(`/api/incidents/${editing.id}`, payload);
      } else {
        await api.post('/api/incidents', payload);
      }
      setModalOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save incident:', err);
    }
  };

  const handleDelete = async (incident) => {
    if (!window.confirm(`Are you sure you want to delete "${incident.title}"?`)) return;
    try {
      await api.delete(`/api/incidents/${incident.id}`);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete incident:', err);
    }
  };

  const formatDate = (val) => val ? new Date(val).toLocaleString() : '—';

  const detailFields = selected
    ? [
        { label: 'Title', value: selected.title },
        { label: 'Description', value: selected.description || '—' },
        { label: 'Worker ID', value: selected.worker_id },
        { label: 'Severity', value: <StatusBadge status={selected.severity} /> },
        { label: 'Status', value: <StatusBadge status={selected.status} /> },
        { label: 'Location', value: selected.location },
        { label: 'Reported At', value: formatDate(selected.reported_at) },
        { label: 'Resolved At', value: formatDate(selected.resolved_at) },
        { label: 'Created At', value: formatDate(selected.created_at) },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading incidents...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add New Incident
        </button>
      </div>

      <DataTable
        columns={columns}
        data={incidents}
        onRowClick={(row) => setSelected(row)}
      />

      {selected && (
        <DetailPanel
          title={selected.title}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Incident' : 'Add New Incident'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter incident title"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the incident..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Worker ID</label>
            <input
              type="number"
              name="worker_id"
              value={form.worker_id}
              onChange={handleChange}
              placeholder="Enter worker ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              name="severity"
              value={form.severity}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {editing ? 'Update Incident' : 'Create Incident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
