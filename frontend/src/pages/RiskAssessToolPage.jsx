import { useState } from 'react';
import api from '../services/api';

export default function RiskAssessToolPage() {
  const [form, setForm] = useState({
    location_description: '',
    task_type: '',
    worker_count: 1,
    time_of_day: 'daytime',
    environmental_conditions: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/api/ai/risk-assess', form);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assess risk');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 8) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 6) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'high') return 'bg-red-100 text-red-700';
    if (severity === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const assessment = result?.assessment;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Assessment Tool</h1>
        <p className="text-gray-500 text-sm mt-1">AI-powered situational risk analysis for lone worker operations</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Situation Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Description *</label>
              <input
                type="text"
                name="location_description"
                value={form.location_description}
                onChange={handleChange}
                placeholder="e.g., Remote pipeline station, underground mine"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Type *</label>
              <input
                type="text"
                name="task_type"
                value={form.task_type}
                onChange={handleChange}
                placeholder="e.g., High voltage maintenance, confined space entry"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Worker Count</label>
              <input
                type="number"
                name="worker_count"
                value={form.worker_count}
                onChange={handleChange}
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time of Day</label>
              <select
                name="time_of_day"
                value={form.time_of_day}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="early_morning">Early Morning (5-8am)</option>
                <option value="daytime">Daytime (8am-5pm)</option>
                <option value="evening">Evening (5-10pm)</option>
                <option value="night">Night (10pm-5am)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Environmental Conditions</label>
            <textarea
              name="environmental_conditions"
              value={form.environmental_conditions}
              onChange={handleChange}
              placeholder="e.g., Heavy rain, high winds, extreme temperatures, hazardous chemicals present"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Analyzing Risk...' : 'Run AI Risk Assessment'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Risk Score */}
          {assessment && typeof assessment === 'object' ? (
            <>
              <div className={`rounded-xl border-2 p-6 ${getRiskColor(assessment.risk_score)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-5xl font-bold">{assessment.risk_score}/10</div>
                    <div className="text-xl font-semibold mt-1 capitalize">{assessment.risk_level} Risk</div>
                    <p className="mt-2 opacity-80">{assessment.summary}</p>
                  </div>
                  <div className="text-right text-sm opacity-70">
                    <div>Check-in interval:</div>
                    <div className="text-2xl font-bold">{assessment.recommended_check_in_interval_minutes} min</div>
                    <div>Emergency contacts: {assessment.emergency_contacts_required ? 'Required' : 'Optional'}</div>
                  </div>
                </div>
              </div>

              {/* Hazards */}
              {assessment.specific_hazards?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Identified Hazards</h3>
                  <div className="space-y-2">
                    {assessment.specific_hazards.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(h.severity)}`}>
                          {h.severity}
                        </span>
                        <div>
                          <div className="font-medium text-gray-800">{h.hazard}</div>
                          <div className="text-sm text-gray-500">{h.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mitigation steps */}
              {assessment.mitigation_steps?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Mitigation Steps</h3>
                  <div className="space-y-2">
                    {assessment.mitigation_steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.priority === 'immediate' ? 'bg-red-100 text-red-700' :
                          s.priority === 'short_term' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }`}>{s.priority}</span>
                        <div>
                          <div className="font-medium text-gray-800">{s.step}</div>
                          <div className="text-sm text-gray-500">{s.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Risk Assessment</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded-lg">{result.raw}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
