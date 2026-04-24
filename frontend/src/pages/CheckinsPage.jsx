import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const CHECKIN_STATUSES = ['safe', 'help_needed', 'no_response'];

const emptyForm = {
  worker_id: '',
  status: 'safe',
  location: '',
  notes: '',
};

const columns = [
  { key: 'worker_id', label: 'Worker ID' },
  { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
  { key: 'location', label: 'Location' },
  { key: 'checked_in_at', label: 'Checked In At', render: (val) => val ? new Date(val).toLocaleString() : '—' },
];

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/checkins');
      setCheckins(res.data);
    } catch (err) {
      console.error('Failed to fetch check-ins:', err);
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

  const openEdit = (checkin) => {
    setEditing(checkin);
    setForm({
      worker_id: checkin.worker_id || '',
      status: checkin.status || 'safe',
      location: checkin.location || '',
      notes: checkin.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, worker_id: form.worker_id ? Number(form.worker_id) : null };
    try {
      if (editing) {
        await api.put(`/api/checkins/${editing.id}`, payload);
      } else {
        await api.post('/api/checkins', payload);
      }
      setModalOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save check-in:', err);
    }
  };

  const handleDelete = async (checkin) => {
    if (!window.confirm('Are you sure you want to delete this check-in?')) return;
    try {
      await api.delete(`/api/checkins/${checkin.id}`);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete check-in:', err);
    }
  };

  const formatDate = (val) => val ? new Date(val).toLocaleString() : '—';

  const detailFields = selected
    ? [
        { label: 'Worker ID', value: selected.worker_id },
        { label: 'Status', value: <StatusBadge status={selected.status} /> },
        { label: 'Location', value: selected.location || '—' },
        { label: 'Checked In At', value: formatDate(selected.checked_in_at) },
        { label: 'Notes', value: selected.notes || '—' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading check-ins...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Check-ins</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add New Check-in
        </button>
      </div>

      <DataTable
        columns={columns}
        data={checkins}
        onRowClick={(row) => setSelected(row)}
      />

      {selected && (
        <DetailPanel
          title={`Check-in #${selected.id}`}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Check-in' : 'Add New Check-in'}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CHECKIN_STATUSES.map((s) => (
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional notes..."
              rows={3}
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
              {editing ? 'Update Check-in' : 'Create Check-in'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
