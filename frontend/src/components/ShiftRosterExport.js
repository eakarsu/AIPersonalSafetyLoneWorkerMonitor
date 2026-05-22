import React, { useState } from 'react';

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

const today = new Date();
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export default function ShiftRosterExport() {
  const [from, setFrom] = useState(fmt(weekAgo));
  const [to, setTo] = useState(fmt(today));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lastFile, setLastFile] = useState(null);

  async function exportRoster() {
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `/api/custom-views/shift-roster.csv?from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(to)}`;
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
      }
      const csv = await resp.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `shift-roster_${from}_to_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      // Build a small preview table for display
      const lines = csv.trim().split('\n');
      const header = lines[0].split(',');
      const dataRows = lines.slice(1, 11).map((l) => l.split(','));
      setPreview({ header, rows: dataRows, total: lines.length - 1 });
      setLastFile({ name: `shift-roster_${from}_to_${to}.csv`, bytes: csv.length });
    } catch (e) {
      setError(e.message || String(e));
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
        <div>
          <label
            style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}
          >
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              background: '#111827',
              color: '#e5e7eb',
              border: '1px solid #1f2937',
            }}
          />
        </div>
        <div>
          <label
            style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}
          >
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              background: '#111827',
              color: '#e5e7eb',
              border: '1px solid #1f2937',
            }}
          />
        </div>
        <button
          onClick={exportRoster}
          disabled={loading}
          style={{
            background: loading ? '#1e3a8a' : '#2563eb',
            color: 'white',
            fontWeight: 700,
            border: 'none',
            padding: '10px 18px',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            letterSpacing: 0.3,
          }}
        >
          {loading ? 'Exporting…' : 'Export Roster'}
        </button>
        {lastFile && (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            Last: <span style={{ color: '#e5e7eb' }}>{lastFile.name}</span> ({lastFile.bytes} bytes)
          </div>
        )}
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

      {preview && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>
            Preview (first {preview.rows.length} of {preview.total} rows)
          </div>
          <div
            style={{
              border: '1px solid #1f2937',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                color: '#e5e7eb',
              }}
            >
              <thead style={{ background: '#111827' }}>
                <tr>
                  {preview.header.map((h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        color: '#9ca3af',
                        borderBottom: '1px solid #1f2937',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 ? '#0b1220' : '#0f172a' }}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: '6px 10px',
                          borderBottom: '1px solid #1f2937',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
