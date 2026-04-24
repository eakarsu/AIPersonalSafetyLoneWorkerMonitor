import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  worker_id: '',
  start_time: '',
  end_time: '',
  location: '',
  type: 'day',
  status: 'scheduled',
  notes: '',
};

function formatDate(val) {
  if (!val) return '-';
  return new Date(val).toLocaleString();
}

function toDatetimeLocal(val) {
  if (!val) return '';
  const d = new Date(val);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ShiftsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shifts');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { key: 'worker_id', label: 'Worker ID' },
    {
      key: 'type',
      label: 'Type',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'location', label: 'Location' },
    {
      key: 'start_time',
      label: 'Start Time',
      render: (val) => formatDate(val),
    },
    {
      key: 'end_time',
      label: 'End Time',
      render: (val) => formatDate(val),
    },
  ];

  const detailFields = [
    { key: 'id', label: 'ID' },
    { key: 'worker_id', label: 'Worker ID' },
    {
      key: 'type',
      label: 'Type',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'location', label: 'Location' },
    { key: 'start_time', label: 'Start Time', render: (val) => formatDate(val) },
    { key: 'end_time', label: 'End Time', render: (val) => formatDate(val) },
    { key: 'notes', label: 'Notes' },
    { key: 'created_at', label: 'Created At', render: (val) => formatDate(val) },
  ];

  const handleRowClick = (item) => {
    setSelected(item);
    setDetailOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      worker_id: item.worker_id || '',
      start_time: toDatetimeLocal(item.start_time),
      end_time: toDatetimeLocal(item.end_time),
      location: item.location || '',
      type: item.type || 'day',
      status: item.status || 'scheduled',
      notes: item.notes || '',
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    try {
      await api.delete(`/shifts/${item.id}`);
      setDetailOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete shift:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      worker_id: Number(form.worker_id),
    };
    try {
      if (editing) {
        await api.put(`/shifts/${editing.id}`, payload);
      } else {
        await api.post('/shifts', payload);
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save shift:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
        <p className="text-sm text-gray-500 mt-1">Manage worker shift schedules and assignments</p>
      </div>

      <DataTable
        title="Shift Records"
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        onAdd={handleAdd}
        addLabel="Add New"
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DetailPanel
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Shift Details"
        data={selected}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Shift' : 'Add Shift'}
        size="lg"
      >
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                name="end_time"
                value={form.end_time}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Enter shift location"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="day">Day</option>
                <option value="night">Night</option>
                <option value="swing">Swing</option>
                <option value="overtime">Overtime</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            >
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
