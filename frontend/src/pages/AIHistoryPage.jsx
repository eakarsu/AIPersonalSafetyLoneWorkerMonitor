import { useState, useEffect } from 'react';
import { History, ChevronLeft, ChevronRight, Brain } from 'lucide-react';
import api from '../services/api';

function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

const ENDPOINT_LABELS = {
  'risk-assessment': 'Risk Assessment',
  'incident-analysis': 'Incident Analysis',
  'anomaly-detection': 'Anomaly Detection',
  'emergency-response': 'Emergency Response',
  'route-safety': 'Route Safety',
  'compliance-predictor': 'Compliance Predictor',
  'shift-optimizer': 'Shift Optimizer',
  'hazard-prediction': 'Hazard Prediction',
  'training-recommender': 'Training Recommender',
  'safety-report': 'Safety Report',
};

export default function AIHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [selected, setSelected] = useState(null);

  const fetchHistory = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/ai/history?page=${p}&limit=15`);
      setHistory(res.data.data || []);
      setPagination(res.data.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(page); }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI History</h1>
        <p className="text-sm text-gray-500 mt-1">Past AI analysis results for your account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* History list */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No AI history yet. Run an AI analysis to see results here.</p>
          ) : (
            <>
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${selected?.id === item.id ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ENDPOINT_LABELS[item.endpoint] || item.endpoint}</p>
                      <p className="text-xs text-gray-400">{formatTime(item.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500">Page {page} of {pagination.totalPages} ({pagination.total} total)</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Selected result */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {selected ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-gray-700">{ENDPOINT_LABELS[selected.endpoint] || selected.endpoint}</h2>
                <span className="text-xs text-gray-400 ml-auto">{formatTime(selected.created_at)}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-auto max-h-[600px] font-mono leading-relaxed">
                  {selected.result}
                </pre>
              </div>
              {selected.metadata && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs font-medium text-purple-700 mb-1">Metadata</p>
                  <pre className="text-xs text-purple-600">{JSON.stringify(typeof selected.metadata === 'string' ? JSON.parse(selected.metadata) : selected.metadata, null, 2)}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <History className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Select an AI result to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
