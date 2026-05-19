import { useState } from 'react';
import api from '../services/api';

export default function SafetyBriefingPage() {
  const [form, setForm] = useState({
    job_type: '',
    location_hazards: '',
    weather_conditions: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/api/ai/safety-briefing', form);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to generate briefing');
    } finally {
      setLoading(false);
    }
  };

  const briefing = result?.briefing;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Safety Briefing Generator</h1>
        <p className="text-gray-500 text-sm mt-1">Generate AI-powered pre-job safety briefings with toolbox talk points</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Type *</label>
            <input
              type="text"
              name="job_type"
              value={form.job_type}
              onChange={handleChange}
              placeholder="e.g., Electrical panel maintenance, Pipeline inspection, Confined space entry"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Hazards</label>
            <textarea
              name="location_hazards"
              value={form.location_hazards}
              onChange={handleChange}
              placeholder="e.g., High voltage equipment nearby, chemical storage, uneven terrain, poor lighting"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weather Conditions</label>
            <input
              type="text"
              name="weather_conditions"
              value={form.weather_conditions}
              onChange={handleChange}
              placeholder="e.g., Clear and sunny 22°C, Heavy rain expected, High winds 40km/h"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Generating Safety Briefing...' : 'Generate Safety Briefing'}
          </button>
        </form>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {result && briefing && typeof briefing === 'object' ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-blue-600 text-white rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{briefing.briefing_title}</h2>
                <p className="mt-1 opacity-80">Job: {briefing.job_type}</p>
              </div>
              <div className="text-right text-sm opacity-80">
                <div>Est. Duration</div>
                <div className="text-2xl font-bold">{briefing.estimated_duration_minutes} min</div>
                <div>{briefing.sign_off_required ? '✓ Sign-off required' : 'No sign-off'}</div>
              </div>
            </div>
            {briefing.weather_considerations && (
              <div className="mt-3 bg-white/10 rounded-lg px-4 py-2 text-sm">
                Weather: {briefing.weather_considerations}
              </div>
            )}
          </div>

          {/* PPE */}
          {briefing.required_ppe?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 text-xs font-bold">!</span>
                Required PPE
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {briefing.required_ppe.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{p.item}</div>
                      {p.specification && <div className="text-xs text-gray-500">{p.specification}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toolbox talk points */}
          {briefing.toolbox_talk_points?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Toolbox Talk Points</h3>
              <div className="space-y-3">
                {briefing.toolbox_talk_points.map((t, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-800">{i + 1}. {t.topic}</div>
                    <div className="text-sm text-gray-600 mt-1">{t.key_message}</div>
                    {t.discussion_prompt && (
                      <div className="mt-2 text-sm text-blue-600 italic">Discussion: {t.discussion_prompt}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hazard identification */}
          {briefing.hazard_identification?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Hazard Identification & Controls</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3 rounded-l-lg">Hazard</th>
                      <th className="text-left p-3">Control Measure</th>
                      <th className="text-left p-3 rounded-r-lg">Responsible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {briefing.hazard_identification.map((h, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="p-3 font-medium">{h.hazard}</td>
                        <td className="p-3 text-gray-600">{h.control_measure}</td>
                        <td className="p-3 text-gray-500">{h.responsible_person}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Emergency procedures */}
          {briefing.emergency_procedures?.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <h3 className="font-semibold text-red-800 mb-3">Emergency Procedures</h3>
              <div className="space-y-2">
                {briefing.emergency_procedures.map((p, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border border-red-100">
                    <div className="font-medium text-gray-800">{p.scenario}</div>
                    <div className="text-sm text-gray-600 mt-1">{p.action}</div>
                    {p.contact && <div className="text-sm text-red-600 mt-1">Contact: {p.contact}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Check-in requirements */}
          {briefing.check_in_requirements && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-5">
              <h3 className="font-semibold text-green-800 mb-2">Check-in Requirements</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-green-600 font-medium">Frequency</div>
                  <div className="text-gray-800">Every {briefing.check_in_requirements.frequency_minutes} minutes</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Method</div>
                  <div className="text-gray-800">{briefing.check_in_requirements.method}</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Supervisor</div>
                  <div className="text-gray-800">{briefing.check_in_requirements.supervisor_contact}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : result && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{result.raw}</pre>
        </div>
      )}
    </div>
  );
}
