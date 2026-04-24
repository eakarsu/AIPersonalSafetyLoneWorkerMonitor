import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  worker_id: '',
  requirement: '',
  status: 'pending',
  due_date: '',
  completed_date: '',
  notes: '',
};

function formatDate(val) {
  if (!val) return '-';
  return new Date(val).toLocaleString();
}

export default function CompliancePage() {
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
      const res = await api.get('/compliance');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch compliance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { key: 'worker_id', label: 'Worker ID' },
    { key: 'requirement', label: 'Requirement' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (val) => formatDate(val),
    },
    {
      key: 'completed_date',
      label: 'Completed Date',
      render: (val) => formatDate(val),
    },
  ];

  const detailFields = [
    { key: 'id', label: 'ID' },
    { key: 'worker_id', label: 'Worker ID' },
    { key: 'requirement', label: 'Requirement' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'due_date', label: 'Due Date', render: (val) => formatDate(val) },
    { key: 'completed_date', label: 'Completed Date', render: (val) => formatDate(val) },
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
      requirement: item.requirement || '',
      status: item.status || 'pending',
      due_date: item.due_date ? item.due_date.slice(0, 10) : '',
      completed_date: item.completed_date ? item.completed_date.slice(0, 10) : '',
      notes: item.notes || '',
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this compliance record?')) return;
    try {
      await api.delete(`/compliance/${item.id}`);
      setDetailOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete compliance record:', err);
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
        await api.put(`/compliance/${editing.id}`, payload);
      } else {
        await api.post('/compliance', payload);
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save compliance record:', err);
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
        <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">Manage worker compliance requirements and records</p>
      </div>

      <DataTable
        title="Compliance Records"
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
        title="Compliance Details"
        data={selected}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Compliance Record' : 'Add Compliance Record'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirement</label>
            <input
              type="text"
              name="requirement"
              value={form.requirement}
              onChange={handleChange}
              placeholder="Enter compliance requirement"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="compliant">Compliant</option>
              <option value="non_compliant">Non Compliant</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date</label>
              <input
                type="date"
                name="completed_date"
                value={form.completed_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
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
