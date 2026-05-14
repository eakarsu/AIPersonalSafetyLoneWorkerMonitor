import { useState, useEffect } from 'react';
import api from '../services/api';

export default function EmergencyResponseDisplayPage() {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [emergencyType, setEmergencyType] = useState('sos');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/workers').then(res => setWorkers(res.data.data || [])).catch(() => {});
  }, []);

  const handleTrigger = async () => {
    if (!selectedWorker) { setError('Please select a worker'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post(`/api/workers/${selectedWorker}/emergency`, {
        location,
        type: emergencyType,
        description,
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to trigger emergency');
    } finally {
      setLoading(false);
    }
  };

  const plan = result?.response_plan?.parsed;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emergency Response</h1>
        <p className="text-gray-500 text-sm mt-1">Trigger worker emergency and get AI-generated response plan</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Trigger Emergency</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Worker</label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select worker...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name} — {w.department}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Type</label>
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="sos">SOS / General Emergency</option>
              <option value="medical">Medical Emergency</option>
              <option value="fire">Fire</option>
              <option value="security">Security Threat</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Current location (leave blank to use worker's last known location)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the emergency"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <button
          onClick={handleTrigger}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-60"
        >
          {loading ? 'Generating Emergency Response Plan...' : '🚨 Trigger Emergency & Generate Response Plan'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Emergency record */}
          <div className="bg-red-600 text-white rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🚨</div>
              <div>
                <div className="font-bold text-lg">Emergency #{result.emergency?.id} Created</div>
                <div className="opacity-80">{result.worker?.name} — {result.emergency?.type?.toUpperCase()} — {result.emergency?.location}</div>
              </div>
              <div className="ml-auto text-right text-sm opacity-80">
                <div>Priority: {result.emergency?.priority?.toUpperCase()}</div>
                <div>Status: {result.emergency?.status}</div>
              </div>
            </div>
          </div>

          {/* Response plan */}
          {plan ? (
            <div className="space-y-4">
              {/* Immediate actions */}
              {plan.immediate_actions?.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 p-5">
                  <h3 className="font-semibold text-red-800 mb-3">Immediate Actions (First 5 Minutes)</h3>
                  <div className="space-y-2">
                    {plan.immediate_actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                        <div>
                          <div className="font-medium text-gray-800">{a.action}</div>
                          <div className="text-sm text-gray-500">Time limit: {a.time_limit} | Responsible: {a.responsible}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency services */}
              {plan.emergency_services && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Emergency Services</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'call_police', label: 'Police', icon: '🚔' },
                      { key: 'call_ambulance', label: 'Ambulance', icon: '🚑' },
                      { key: 'call_fire', label: 'Fire Dept', icon: '🚒' },
                    ].map((s) => (
                      <div key={s.key} className={`p-3 rounded-lg text-center font-medium ${
                        plan.emergency_services[s.key] ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-50 text-gray-400'
                      }`}>
                        <div className="text-2xl">{s.icon}</div>
                        <div>{s.label}</div>
                        <div className="text-xs">{plan.emergency_services[s.key] ? 'CALL NOW' : 'Not required'}</div>
                      </div>
                    ))}
                  </div>
                  {plan.emergency_services.rationale && (
                    <p className="text-sm text-gray-600 mt-3">{plan.emergency_services.rationale}</p>
                  )}
                </div>
              )}

              {/* Communication plan */}
              {plan.communication_plan?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Communication Plan</h3>
                  <div className="space-y-2">
                    {plan.communication_plan.map((c, i) => (
                      <div key={i} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-blue-800">{c.contact}</span>
                          <span className="text-blue-500 text-sm">via {c.method}</span>
                        </div>
                        <div className="text-sm text-gray-600 italic">"{c.message}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Site safety & follow-up */}
              <div className="grid grid-cols-2 gap-4">
                {plan.site_safety_steps?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Site Safety Steps</h3>
                    <div className="space-y-2">
                      {plan.site_safety_steps.map((s, i) => (
                        <div key={i} className={`p-2 rounded-lg text-sm ${
                          s.priority === 'immediate' ? 'bg-red-50 text-red-700' : s.priority === 'urgent' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                          <span className="font-medium capitalize">[{s.priority}]</span> {s.step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {plan.follow_up_actions?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Follow-up Actions</h3>
                    <div className="space-y-2">
                      {plan.follow_up_actions.map((a, i) => (
                        <div key={i} className="p-2 bg-green-50 rounded-lg text-sm">
                          <div className="font-medium text-green-800">{a.action}</div>
                          <div className="text-green-600">{a.timeline}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {plan.special_considerations && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="font-medium text-yellow-800">Special Considerations</div>
                  <div className="text-yellow-700 text-sm mt-1">{plan.special_considerations}</div>
                </div>
              )}
            </div>
          ) : result?.response_plan?.raw ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Response Plan</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{result.response_plan.raw}</pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
