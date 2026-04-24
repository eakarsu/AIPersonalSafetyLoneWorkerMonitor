import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  worker_id: '',
  course_name: '',
  category: 'Safety Basics',
  status: 'not_started',
  score: '',
  completed_at: '',
  expires_at: '',
};

function formatDate(val) {
  if (!val) return '-';
  return new Date(val).toLocaleString();
}

export default function TrainingPage() {
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
      const res = await api.get('/training');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch training records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { key: 'worker_id', label: 'Worker ID' },
    { key: 'course_name', label: 'Course Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'score', label: 'Score' },
    {
      key: 'completed_at',
      label: 'Completed At',
      render: (val) => formatDate(val),
    },
  ];

  const detailFields = [
    { key: 'id', label: 'ID' },
    { key: 'worker_id', label: 'Worker ID' },
    { key: 'course_name', label: 'Course Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'score', label: 'Score' },
    { key: 'completed_at', label: 'Completed At', render: (val) => formatDate(val) },
    { key: 'expires_at', label: 'Expires At', render: (val) => formatDate(val) },
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
      course_name: item.course_name || '',
      category: item.category || 'Safety Basics',
      status: item.status || 'not_started',
      score: item.score ?? '',
      completed_at: item.completed_at ? item.completed_at.slice(0, 10) : '',
      expires_at: item.expires_at ? item.expires_at.slice(0, 10) : '',
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this training record?')) return;
    try {
      await api.delete(`/training/${item.id}`);
      setDetailOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete training record:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      worker_id: Number(form.worker_id),
      score: form.score !== '' ? Number(form.score) : null,
    };
    try {
      if (editing) {
        await api.put(`/training/${editing.id}`, payload);
      } else {
        await api.post('/training', payload);
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save training record:', err);
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
        <h1 className="text-2xl font-bold text-gray-900">Training</h1>
        <p className="text-sm text-gray-500 mt-1">Manage worker training courses and certifications</p>
      </div>

      <DataTable
        title="Training Records"
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
        title="Training Details"
        data={selected}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Training Record' : 'Add Training Record'}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
            <input
              type="text"
              name="course_name"
              value={form.course_name}
              onChange={handleChange}
              placeholder="Enter course name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="Safety Basics">Safety Basics</option>
                <option value="First Aid">First Aid</option>
                <option value="Hazmat">Hazmat</option>
                <option value="Emergency Response">Emergency Response</option>
                <option value="Equipment Operation">Equipment Operation</option>
                <option value="Fire Safety">Fire Safety</option>
                <option value="Confined Spaces">Confined Spaces</option>
                <option value="Working at Heights">Working at Heights</option>
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
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
            <input
              type="number"
              name="score"
              value={form.score}
              onChange={handleChange}
              placeholder="Enter score (0-100)"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed At</label>
              <input
                type="date"
                name="completed_at"
                value={form.completed_at}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input
                type="date"
                name="expires_at"
                value={form.expires_at}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
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
