
import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import NativeAIControls from "../components/NativeAIControls";
import useNativeAIRequest from "../components/useNativeAIRequest";
import FormattedAIReport from "../components/FormattedAIReport";
import { useState } from 'react';
import { Brain, Wrench, ClipboardCheck, HeartPulse } from 'lucide-react';
import api from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const TOOLS = [
  { id: 'equipment-failure', label: 'Equipment Failure Predict', icon: Wrench, endpoint: '/ai/equipment-failure-predict' },
  { id: 'audit-readiness', label: 'Audit Readiness Score', icon: ClipboardCheck, endpoint: '/ai/audit-readiness-score' },
  { id: 'burnout', label: 'Burnout Predict', icon: HeartPulse, endpoint: '/ai/burnout-predict' },
];

export default function AIPredictivePage() {
  const fullAIExamples = useFullAIExamples();

  const nativeAIRequest = useNativeAIRequest();

  const [activeTool, setActiveTool] = useState('equipment-failure');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [equipForm, setEquipForm] = useState({
    equipment_id: '',
    equipment_type: '',
    age_months: '',
    last_serviced: '',
    failure_history: '',
  });
  const [auditForm, setAuditForm] = useState({
    audit_type: '',
    upcoming_audit_date: '',
    open_findings: '',
    last_audit_score: '',
    documentation_summary: '',
  });
  const [burnoutForm, setBurnoutForm] = useState({
    worker_id: '',
    hours_per_week: '',
    incident_exposure: '',
    overtime_pattern: '',
    self_reported: '',
  });

  const parseJsonOrText = (s) => {
    if (!s || !s.trim()) return undefined;
    try { return JSON.parse(s); } catch { return s; }
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const tool = TOOLS.find(t => t.id === activeTool);
      let body;
      if (activeTool === 'equipment-failure') {
        body = {
          equipment_id: equipForm.equipment_id ? parseInt(equipForm.equipment_id, 10) : undefined,
          equipment_type: equipForm.equipment_type,
          age_months: equipForm.age_months ? parseInt(equipForm.age_months, 10) : undefined,
          last_serviced: equipForm.last_serviced,
          failure_history: parseJsonOrText(equipForm.failure_history),
        };
      } else if (activeTool === 'audit-readiness') {
        body = {
          audit_type: auditForm.audit_type,
          upcoming_audit_date: auditForm.upcoming_audit_date,
          open_findings: parseJsonOrText(auditForm.open_findings),
          last_audit_score: auditForm.last_audit_score ? parseFloat(auditForm.last_audit_score) : undefined,
          documentation_summary: auditForm.documentation_summary,
        };
      } else {
        body = {
          worker_id: burnoutForm.worker_id ? parseInt(burnoutForm.worker_id, 10) : undefined,
          hours_per_week: burnoutForm.hours_per_week ? parseFloat(burnoutForm.hours_per_week) : undefined,
          incident_exposure: burnoutForm.incident_exposure,
          overtime_pattern: burnoutForm.overtime_pattern,
          self_reported: burnoutForm.self_reported,
        };
      }
      const res = await nativeAIRequest.run((signal) => api.post(tool.endpoint, body, { signal }));
      if (res.data.success !== false) {
        setResponse(res.data.data?.analysis || res.data.result || res.data.data || res.data);
      } else {
        setError(res.data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <NativeAIControls busy={nativeAIRequest.busy} onCancel={nativeAIRequest.cancel} context="Personal Safety Lone Worker Monitor"><div data-full-ai-workspace="AIPredictivePage"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} /><div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Brain size={32} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>AI Predictive Tools</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '1rem' }}>Equipment failure, audit readiness, and burnout prediction</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TOOLS.map(t => {
          const Icon = t.icon;
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTool(t.id); setResponse(null); setError(null); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 1rem', borderRadius: 8,
                background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#fff',
                color: active ? '#fff' : '#475569',
                border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 500,
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
        {activeTool === 'equipment-failure' && (
          <>
            <h3>Equipment Failure Predict</h3>
            <div style={{ marginTop: 12 }}>
              <label>Equipment ID</label>
              <input data-ai-field="equipment_id" type="number" value={equipForm.equipment_id} onChange={(e) => setEquipForm({ ...equipForm, equipment_id: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: equipForm.equipment_id, change: (e) => setEquipForm({ ...equipForm, equipment_id: e.target.value }), label: "equipForm.equipment_id", manual: false, json: false, sample: '' }, "p1-5800", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Equipment Type</label>
              <input data-ai-field="equipment_type" value={equipForm.equipment_type} onChange={(e) => setEquipForm({ ...equipForm, equipment_type: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: equipForm.equipment_type, change: (e) => setEquipForm({ ...equipForm, equipment_type: e.target.value }), label: "equipForm.equipment_type", manual: false, json: false, sample: '' }, "p1-6175", undefined)} />
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Age (months)</label>
                <input data-ai-field="age_months" type="number" value={equipForm.age_months} onChange={(e) => setEquipForm({ ...equipForm, age_months: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: equipForm.age_months, change: (e) => setEquipForm({ ...equipForm, age_months: e.target.value }), label: "equipForm.age_months", manual: false, json: false, sample: '' }, "p1-6622", undefined)} />
              </div>
              <div>
                <label>Last Serviced</label>
                <input data-ai-field="last_serviced" type="date" value={equipForm.last_serviced} onChange={(e) => setEquipForm({ ...equipForm, last_serviced: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: equipForm.last_serviced, change: (e) => setEquipForm({ ...equipForm, last_serviced: e.target.value }), label: "equipForm.last_serviced", manual: false, json: false, sample: '' }, "p1-6972", undefined)} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Failure History (JSON)</label>
              <textarea data-ai-field="failure_history" rows={3} value={equipForm.failure_history} onChange={(e) => setEquipForm({ ...equipForm, failure_history: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: equipForm.failure_history, change: (e) => setEquipForm({ ...equipForm, failure_history: e.target.value }), label: "equipForm.failure_history", manual: false, json: true, sample: '[{"date":"2026-09-01","issue":"sensor calibration drift","action":"recalibrated"}]' }, "failure-history", undefined)} />
            </div>
          </>
        )}

        {activeTool === 'audit-readiness' && (
          <>
            <h3>Audit Readiness Score</h3>
            <div style={{ marginTop: 12 }}>
              <label>Audit Type</label>
              <input data-ai-field="audit_type" value={auditForm.audit_type} onChange={(e) => setAuditForm({ ...auditForm, audit_type: e.target.value })} placeholder="ISO 45001, OSHA, internal..." style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: auditForm.audit_type, change: (e) => setAuditForm({ ...auditForm, audit_type: e.target.value }), label: "auditForm.audit_type", manual: false, json: false, sample: '' }, "p1-7884", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Upcoming Audit Date</label>
              <input data-ai-field="upcoming_audit_date" type="date" value={auditForm.upcoming_audit_date} onChange={(e) => setAuditForm({ ...auditForm, upcoming_audit_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: auditForm.upcoming_audit_date, change: (e) => setAuditForm({ ...auditForm, upcoming_audit_date: e.target.value }), label: "auditForm.upcoming_audit_date", manual: false, json: false, sample: '' }, "p1-8287", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Open Findings (JSON)</label>
              <textarea data-ai-field="open_findings" rows={3} value={auditForm.open_findings} onChange={(e) => setAuditForm({ ...auditForm, open_findings: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} placeholder='[{"id":1,"severity":"medium","status":"open"}]' data-full-ai-field={fullAIExamples.bind({ current: auditForm.open_findings, change: (e) => setAuditForm({ ...auditForm, open_findings: e.target.value }), label: "auditForm.open_findings", manual: false, json: false, sample: '' }, "p1-8687", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Last Audit Score (0-100)</label>
              <input data-ai-field="last_audit_score" type="number" value={auditForm.last_audit_score} onChange={(e) => setAuditForm({ ...auditForm, last_audit_score: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: auditForm.last_audit_score, change: (e) => setAuditForm({ ...auditForm, last_audit_score: e.target.value }), label: "auditForm.last_audit_score", manual: false, json: false, sample: '' }, "p1-9134", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Documentation Summary</label>
              <textarea data-ai-field="documentation_summary" rows={3} value={auditForm.documentation_summary} onChange={(e) => setAuditForm({ ...auditForm, documentation_summary: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: auditForm.documentation_summary, change: (e) => setAuditForm({ ...auditForm, documentation_summary: e.target.value }), label: "auditForm.documentation_summary", manual: false, json: false, sample: '' }, "p1-9528", undefined)} />
            </div>
          </>
        )}

        {activeTool === 'burnout' && (
          <>
            <h3>Burnout Predict</h3>
            <div style={{ marginTop: 12 }}>
              <label>Worker ID</label>
              <input data-ai-field="worker_id" type="number" value={burnoutForm.worker_id} onChange={(e) => setBurnoutForm({ ...burnoutForm, worker_id: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: burnoutForm.worker_id, change: (e) => setBurnoutForm({ ...burnoutForm, worker_id: e.target.value }), label: "burnoutForm.worker_id", manual: false, json: false, sample: '' }, "p1-10038", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Hours per Week</label>
              <input data-ai-field="hours_per_week" type="number" value={burnoutForm.hours_per_week} onChange={(e) => setBurnoutForm({ ...burnoutForm, hours_per_week: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: burnoutForm.hours_per_week, change: (e) => setBurnoutForm({ ...burnoutForm, hours_per_week: e.target.value }), label: "burnoutForm.hours_per_week", manual: false, json: false, sample: '' }, "p1-10410", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Incident Exposure</label>
              <textarea data-ai-field="incident_exposure" rows={2} value={burnoutForm.incident_exposure} onChange={(e) => setBurnoutForm({ ...burnoutForm, incident_exposure: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: burnoutForm.incident_exposure, change: (e) => setBurnoutForm({ ...burnoutForm, incident_exposure: e.target.value }), label: "burnoutForm.incident_exposure", manual: false, json: false, sample: '' }, "p1-10800", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Overtime Pattern</label>
              <input data-ai-field="overtime_pattern" value={burnoutForm.overtime_pattern} onChange={(e) => setBurnoutForm({ ...burnoutForm, overtime_pattern: e.target.value })} placeholder="3 weeks consecutive 50+ hrs" style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: burnoutForm.overtime_pattern, change: (e) => setBurnoutForm({ ...burnoutForm, overtime_pattern: e.target.value }), label: "burnoutForm.overtime_pattern", manual: false, json: false, sample: '' }, "p1-11196", undefined)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Self-Reported Notes</label>
              <textarea data-ai-field="self_reported" rows={3} value={burnoutForm.self_reported} onChange={(e) => setBurnoutForm({ ...burnoutForm, self_reported: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} data-full-ai-field={fullAIExamples.bind({ current: burnoutForm.self_reported, change: (e) => setBurnoutForm({ ...burnoutForm, self_reported: e.target.value }), label: "burnoutForm.self_reported", manual: false, json: false, sample: '' }, "p1-11622", undefined)} />
            </div>
          </>
        )}

        <button
          onClick={run}
          disabled={loading}
          style={{
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 2rem',
            fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '1.5rem',
          }}
        >
          {loading ? 'Running...' : 'Run AI'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', color: '#991b1b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {response && (
        typeof response === 'string' ? (
          <AIResponseDisplay response={response} />
        ) : (
          <FormattedAIReport response={response} />
        )
      )}
    </div></div></NativeAIControls>
  );
}
