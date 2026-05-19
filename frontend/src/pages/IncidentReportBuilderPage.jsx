import { useState, useEffect } from 'react';
import api from '../services/api';

export default function IncidentReportBuilderPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    api.get('/api/incidents').then(res => {
      setIncidents(res.data.data || []);
    }).catch(() => {}).finally(() => setListLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedIncident) { setError('Please select an incident'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post(`/api/incidents/${selectedIncident}/ai-report`);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const report = result?.report;

  const getPriorityColor = (priority) => {
    if (priority === 'immediate') return 'bg-red-100 text-red-700';
    if (priority === 'short_term') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Incident Report Builder</h1>
        <p className="text-gray-500 text-sm mt-1">AI-generated formal incident reports with root cause analysis</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Select Incident</h2>
        {listLoading ? (
          <div className="text-gray-400 text-sm">Loading incidents...</div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedIncident}
              onChange={(e) => { setSelectedIncident(e.target.value); setResult(null); setError(null); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an incident...</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  #{inc.id} — {inc.title} ({inc.severity} | {inc.status})
                </option>
              ))}
            </select>
            {selectedIncident && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {(() => {
                  const inc = incidents.find(i => String(i.id) === String(selectedIncident));
                  if (!inc) return null;
                  return (
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <div><span className="font-medium">Title:</span> {inc.title}</div>
                      <div><span className="font-medium">Severity:</span> {inc.severity}</div>
                      <div><span className="font-medium">Status:</span> {inc.status}</div>
                      <div><span className="font-medium">Location:</span> {inc.location || 'N/A'}</div>
                      <div className="col-span-2"><span className="font-medium">Description:</span> {inc.description || 'N/A'}</div>
                    </div>
                  );
                })()}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedIncident}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Generating AI Incident Report...' : 'Generate Formal Incident Report'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {result && report && typeof report === 'object' && (
        <div className="space-y-4">
          {/* Report header */}
          <div className="bg-gray-800 text-white rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60 mb-1">Formal Safety Incident Report</div>
                <div className="text-xl font-bold">{report.report_number}</div>
                <div className="opacity-80 mt-1">{result.incident?.title}</div>
              </div>
              <div className="text-right text-sm">
                <div className="opacity-60">Severity</div>
                <div className={`font-bold text-lg mt-0.5 ${
                  report.incident_classification?.severity === 'critical' ? 'text-red-400' :
                  report.incident_classification?.severity === 'high' ? 'text-orange-400' :
                  report.incident_classification?.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>{report.incident_classification?.severity?.toUpperCase()}</div>
                {report.incident_classification?.osha_recordable && (
                  <div className="text-red-400 text-xs mt-1">OSHA Recordable</div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {report.incident_summary && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-2">Incident Summary</h3>
              <p className="text-gray-700 leading-relaxed">{report.incident_summary}</p>
            </div>
          )}

          {/* Root cause analysis */}
          {report.root_cause_analysis && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Root Cause Analysis</h3>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Immediate Cause</div>
                  <div className="text-gray-800">{report.root_cause_analysis.immediate_cause}</div>
                </div>
                {report.root_cause_analysis.contributing_factors?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Contributing Factors</div>
                    <ul className="space-y-1">
                      {report.root_cause_analysis.contributing_factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-orange-400 mt-0.5">•</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.root_cause_analysis.root_causes?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Root Causes</div>
                    <ul className="space-y-1">
                      {report.root_cause_analysis.root_causes.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-purple-400 mt-0.5">•</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Corrective actions */}
          {report.corrective_actions?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Corrective Actions</h3>
              <div className="space-y-2">
                {report.corrective_actions.map((a, i) => (
                  <div key={i} className="p-3 border border-gray-100 rounded-lg flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(a.priority)}`}>{a.priority}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{a.action}</div>
                      <div className="text-sm text-gray-500 mt-0.5">Responsible: {a.responsible_party} | Due: {a.due_date}</div>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Management summary */}
          {report.management_summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-blue-800 mb-2">Management Summary</h3>
              <p className="text-blue-700 leading-relaxed">{report.management_summary}</p>
            </div>
          )}

          {/* Regulatory */}
          {report.regulatory_reporting_required && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="font-semibold text-yellow-800">Regulatory Reporting Required</div>
              <div className="text-yellow-700 text-sm mt-1">
                Agencies: {report.regulatory_bodies?.join(', ') || 'Contact HSE/OSHA'}
              </div>
            </div>
          )}
        </div>
      )}

      {result && report && typeof report !== 'object' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{result.raw}</pre>
        </div>
      )}
    </div>
  );
}
