import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  equipment_name: '',
  equipment_type: 'PPE',
  inspector_id: '',
  status: 'passed',
  last_inspection: '',
  next_inspection: '',
  notes: '',
};

function formatDate(val) {
  if (!val) return '-';
  return new Date(val).toLocaleString();
}

export default function EquipmentPage() {
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
      const res = await api.get('/equipment');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { key: 'equipment_name', label: 'Equipment Name' },
    { key: 'equipment_type', label: 'Type' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'last_inspection',
      label: 'Last Inspection',
      render: (val) => formatDate(val),
    },
    {
      key: 'next_inspection',
      label: 'Next Inspection',
      render: (val) => formatDate(val),
    },
  ];

  const detailFields = [
    { key: 'id', label: 'ID' },
    { key: 'equipment_name', label: 'Equipment Name' },
    { key: 'equipment_type', label: 'Type' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    { key: 'inspector_id', label: 'Inspector ID' },
    { key: 'last_inspection', label: 'Last Inspection', render: (val) => formatDate(val) },
    { key: 'next_inspection', label: 'Next Inspection', render: (val) => formatDate(val) },
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
      equipment_name: item.equipment_name || '',
      equipment_type: item.equipment_type || 'PPE',
      inspector_id: item.inspector_id || '',
      status: item.status || 'passed',
      last_inspection: item.last_inspection ? item.last_inspection.slice(0, 10) : '',
      next_inspection: item.next_inspection ? item.next_inspection.slice(0, 10) : '',
      notes: item.notes || '',
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this equipment record?')) return;
    try {
      await api.delete(`/equipment/${item.id}`);
      setDetailOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete equipment:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      inspector_id: form.inspector_id ? Number(form.inspector_id) : undefined,
    };
    try {
      if (editing) {
        await api.put(`/equipment/${editing.id}`, payload);
      } else {
        await api.post('/equipment', payload);
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save equipment:', err);
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
        <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
        <p className="text-sm text-gray-500 mt-1">Track equipment inspections and maintenance status</p>
      </div>

      <DataTable
        title="Equipment Records"
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
        title="Equipment Details"
        data={selected}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Equipment' : 'Add Equipment'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
            <input
              type="text"
              name="equipment_name"
              value={form.equipment_name}
              onChange={handleChange}
              placeholder="Enter equipment name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
              <select
                name="equipment_type"
                value={form.equipment_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="PPE">PPE</option>
                <option value="Communication">Communication</option>
                <option value="Detection">Detection</option>
                <option value="First Aid">First Aid</option>
                <option value="Fire Safety">Fire Safety</option>
                <option value="Fall Protection">Fall Protection</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Electrical">Electrical</option>
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
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inspector ID</label>
            <input
              type="number"
              name="inspector_id"
              value={form.inspector_id}
              onChange={handleChange}
              placeholder="Enter inspector's worker ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Inspection</label>
              <input
                type="date"
                name="last_inspection"
                value={form.last_inspection}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Inspection</label>
              <input
                type="date"
                name="next_inspection"
                value={form.next_inspection}
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
