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
      const res = await api.post(tool.endpoint, body);
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
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
              <input type="number" value={equipForm.equipment_id} onChange={(e) => setEquipForm({ ...equipForm, equipment_id: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Equipment Type</label>
              <input value={equipForm.equipment_type} onChange={(e) => setEquipForm({ ...equipForm, equipment_type: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Age (months)</label>
                <input type="number" value={equipForm.age_months} onChange={(e) => setEquipForm({ ...equipForm, age_months: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
              </div>
              <div>
                <label>Last Serviced</label>
                <input type="date" value={equipForm.last_serviced} onChange={(e) => setEquipForm({ ...equipForm, last_serviced: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Failure History (JSON)</label>
              <textarea rows={3} value={equipForm.failure_history} onChange={(e) => setEquipForm({ ...equipForm, failure_history: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
          </>
        )}

        {activeTool === 'audit-readiness' && (
          <>
            <h3>Audit Readiness Score</h3>
            <div style={{ marginTop: 12 }}>
              <label>Audit Type</label>
              <input value={auditForm.audit_type} onChange={(e) => setAuditForm({ ...auditForm, audit_type: e.target.value })} placeholder="ISO 45001, OSHA, internal..." style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Upcoming Audit Date</label>
              <input type="date" value={auditForm.upcoming_audit_date} onChange={(e) => setAuditForm({ ...auditForm, upcoming_audit_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Open Findings (JSON)</label>
              <textarea rows={3} value={auditForm.open_findings} onChange={(e) => setAuditForm({ ...auditForm, open_findings: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} placeholder='[{"id":1,"severity":"medium","status":"open"}]' />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Last Audit Score (0-100)</label>
              <input type="number" value={auditForm.last_audit_score} onChange={(e) => setAuditForm({ ...auditForm, last_audit_score: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Documentation Summary</label>
              <textarea rows={3} value={auditForm.documentation_summary} onChange={(e) => setAuditForm({ ...auditForm, documentation_summary: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
          </>
        )}

        {activeTool === 'burnout' && (
          <>
            <h3>Burnout Predict</h3>
            <div style={{ marginTop: 12 }}>
              <label>Worker ID</label>
              <input type="number" value={burnoutForm.worker_id} onChange={(e) => setBurnoutForm({ ...burnoutForm, worker_id: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Hours per Week</label>
              <input type="number" value={burnoutForm.hours_per_week} onChange={(e) => setBurnoutForm({ ...burnoutForm, hours_per_week: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Incident Exposure</label>
              <textarea rows={2} value={burnoutForm.incident_exposure} onChange={(e) => setBurnoutForm({ ...burnoutForm, incident_exposure: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Overtime Pattern</label>
              <input value={burnoutForm.overtime_pattern} onChange={(e) => setBurnoutForm({ ...burnoutForm, overtime_pattern: e.target.value })} placeholder="3 weeks consecutive 50+ hrs" style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Self-Reported Notes</label>
              <textarea rows={3} value={burnoutForm.self_reported} onChange={(e) => setBurnoutForm({ ...burnoutForm, self_reported: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 6 }} />
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
          <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        )
      )}
    </div>
  );
}
