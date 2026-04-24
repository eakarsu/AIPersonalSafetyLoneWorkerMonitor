import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  title: '',
  description: '',
  location: '',
  severity: 'low',
  status: 'identified',
  reported_by: '',
};

function formatDate(val) {
  if (!val) return '-';
  return new Date(val).toLocaleString();
}

export default function HazardsPage() {
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
      const res = await api.get('/hazards');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch hazards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { key: 'title', label: 'Title' },
    {
      key: 'severity',
      label: 'Severity',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'location', label: 'Location' },
    {
      key: 'reported_at',
      label: 'Reported At',
      render: (val) => formatDate(val),
    },
  ];

  const detailFields = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'location', label: 'Location' },
    {
      key: 'severity',
      label: 'Severity',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'reported_by', label: 'Reported By' },
    { key: 'reported_at', label: 'Reported At', render: (val) => formatDate(val) },
    { key: 'mitigated_at', label: 'Mitigated At', render: (val) => formatDate(val) },
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
      title: item.title || '',
      description: item.description || '',
      location: item.location || '',
      severity: item.severity || 'low',
      status: item.status || 'identified',
      reported_by: item.reported_by || '',
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this hazard?')) return;
    try {
      await api.delete(`/hazards/${item.id}`);
      setDetailOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete hazard:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      reported_by: form.reported_by ? Number(form.reported_by) : undefined,
    };
    try {
      if (editing) {
        await api.put(`/hazards/${editing.id}`, payload);
      } else {
        await api.post('/hazards', payload);
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save hazard:', err);
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
        <h1 className="text-2xl font-bold text-gray-900">Hazards</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage identified workplace hazards</p>
      </div>

      <DataTable
        title="Hazard Records"
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
        title="Hazard Details"
        data={selected}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Hazard' : 'Report Hazard'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter hazard title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the hazard in detail..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Enter hazard location"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                name="severity"
                value={form.severity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
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
                <option value="identified">Identified</option>
                <option value="assessed">Assessed</option>
                <option value="mitigated">Mitigated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reported By (Worker ID)</label>
            <input
              type="number"
              name="reported_by"
              value={form.reported_by}
              onChange={handleChange}
              placeholder="Enter reporter's worker ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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
