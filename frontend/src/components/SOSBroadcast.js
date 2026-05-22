import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function SOSBroadcast() {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [reason, setReason] = useState('Manual SOS broadcast');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [broadcastLog, setBroadcastLog] = useState([]);
  const [lastResponse, setLastResponse] = useState(null);

  async function loadWorkers() {
    try {
      const r = await api.get('/custom-views/worker-locations');
      const list = r.data?.data || [];
      setWorkers(list);
      if (list.length && !selectedWorker) {
        setSelectedWorker(String(list[0].id));
      }
    } catch (e) {
      // non-fatal
    }
  }

  async function loadLog() {
    try {
      const r = await api.get('/custom-views/sos-log');
      setBroadcastLog(r.data?.data || []);
    } catch (e) {
      // non-fatal
    }
  }

  useEffect(() => {
    loadWorkers();
    loadLog();
  }, []);

  async function triggerSOS() {
    setError(null);
    if (!selectedWorker) {
      setError('Please select a worker.');
      return;
    }
    setLoading(true);
    try {
      const worker = workers.find((w) => String(w.id) === String(selectedWorker));
      const resp = await api.post('/custom-views/trigger-sos', {
        worker_id: Number(selectedWorker),
        worker_name: worker?.name,
        reason,
      });
      setLastResponse(resp.data);
      await loadLog();
    } catch (e) {
      setError(e.response?.data?.error || e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: '#0b1220',
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
            Worker
          </label>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              background: '#111827',
              color: '#e5e7eb',
              border: '1px solid #1f2937',
            }}
          >
            {workers.length === 0 && <option value="">No workers available</option>}
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.department ? `(${w.department})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '2 1 260px' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
            Reason
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              background: '#111827',
              color: '#e5e7eb',
              border: '1px solid #1f2937',
            }}
          />
        </div>
        <button
          onClick={triggerSOS}
          disabled={loading}
          style={{
            background: loading ? '#7f1d1d' : '#dc2626',
            color: 'white',
            fontWeight: 700,
            border: 'none',
            padding: '10px 18px',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            letterSpacing: 0.4,
          }}
        >
          {loading ? 'Broadcasting…' : 'Trigger SOS'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            background: '#7f1d1d',
            color: '#fee2e2',
            padding: 10,
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {lastResponse && (
        <div
          style={{
            marginTop: 14,
            background: '#0f172a',
            border: '1px solid #1f2937',
            padding: 12,
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 13, color: '#fca5a5', fontWeight: 700 }}>
            SOS BROADCAST · event #{lastResponse.event_id}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            Worker: <span style={{ color: '#e5e7eb' }}>{lastResponse.worker_name}</span> · Ack:{' '}
            <span style={{ color: '#fbbf24' }}>{lastResponse.ack_status}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Notified</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
                {(lastResponse.notified || []).map((n, i) => (
                  <li
                    key={i}
                    style={{
                      color: '#d1d5db',
                      padding: '3px 0',
                      borderBottom: '1px dashed #1f2937',
                    }}
                  >
                    <span style={{ color: '#60a5fa' }}>{n.channel}</span> → {n.target}{' '}
                    <span style={{ color: '#10b981' }}>· {n.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                Escalation Chain
              </div>
              <ol style={{ padding: '0 0 0 18px', margin: 0, fontSize: 12, color: '#d1d5db' }}>
                {(lastResponse.escalation_chain || []).map((e) => (
                  <li key={e.level} style={{ padding: '3px 0' }}>
                    <span style={{ color: '#fbbf24' }}>L{e.level}</span> {e.role}{' '}
                    <span style={{ color: '#9ca3af' }}>· ETA {e.eta_minutes}m</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            fontSize: 13,
            color: '#9ca3af',
            marginBottom: 6,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Broadcast Log</span>
          <span>{broadcastLog.length} recent event(s)</span>
        </div>
        <div
          style={{
            maxHeight: 220,
            overflowY: 'auto',
            border: '1px solid #1f2937',
            borderRadius: 6,
          }}
        >
          {broadcastLog.length === 0 && (
            <div style={{ padding: 12, fontSize: 12, color: '#6b7280' }}>
              No SOS broadcasts yet.
            </div>
          )}
          {broadcastLog.map((row) => (
            <div
              key={row.id}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #1f2937',
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <span style={{ color: '#fca5a5', fontWeight: 700 }}>#{row.id}</span>{' '}
                <span style={{ color: '#e5e7eb' }}>{row.worker_name}</span>{' '}
                <span style={{ color: '#6b7280' }}>by {row.triggered_by}</span>
              </div>
              <div>
                <span
                  style={{
                    color: row.ack_status === 'acknowledged' ? '#10b981' : '#fbbf24',
                    fontWeight: 600,
                  }}
                >
                  {row.ack_status}
                </span>
                <span style={{ color: '#6b7280', marginLeft: 8 }}>
                  {new Date(row.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
