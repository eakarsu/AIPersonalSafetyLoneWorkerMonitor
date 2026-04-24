import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const DEPARTMENTS = ['Operations', 'Field Services', 'Construction', 'Mining', 'Security', 'Maintenance', 'Logistics'];
const STATUSES = ['active', 'inactive', 'offline'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  department: 'Operations',
  role: '',
  status: 'active',
  risk_level: 'low',
  location: '',
};

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
  { key: 'risk_level', label: 'Risk Level', render: (val) => <StatusBadge status={val} /> },
];

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/workers');
      setWorkers(res.data);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
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

  const openEdit = (worker) => {
    setEditing(worker);
    setForm({
      name: worker.name || '',
      email: worker.email || '',
      phone: worker.phone || '',
      department: worker.department || 'Operations',
      role: worker.role || '',
      status: worker.status || 'active',
      risk_level: worker.risk_level || 'low',
      location: worker.location || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/api/workers/${editing.id}`, form);
      } else {
        await api.post('/api/workers', form);
      }
      setModalOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save worker:', err);
    }
  };

  const handleDelete = async (worker) => {
    if (!window.confirm(`Are you sure you want to delete ${worker.name}?`)) return;
    try {
      await api.delete(`/api/workers/${worker.id}`);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete worker:', err);
    }
  };

  const formatDate = (val) => val ? new Date(val).toLocaleString() : '—';

  const detailFields = selected
    ? [
        { label: 'Name', value: selected.name },
        { label: 'Email', value: selected.email },
        { label: 'Phone', value: selected.phone },
        { label: 'Department', value: selected.department },
        { label: 'Role', value: selected.role },
        { label: 'Status', value: <StatusBadge status={selected.status} /> },
        { label: 'Risk Level', value: <StatusBadge status={selected.risk_level} /> },
        { label: 'Location', value: selected.location },
        { label: 'Last Check-in', value: formatDate(selected.last_check_in) },
        { label: 'Created At', value: formatDate(selected.created_at) },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading workers...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add New Worker
        </button>
      </div>

      <DataTable
        columns={columns}
        data={workers}
        onRowClick={(row) => setSelected(row)}
      />

      {selected && (
        <DetailPanel
          title={selected.name}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Worker' : 'Add New Worker'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter worker name"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="worker@example.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              name="role"
              value={form.role}
              onChange={handleChange}
              placeholder="Enter role"
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
              {editing ? 'Update Worker' : 'Create Worker'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
