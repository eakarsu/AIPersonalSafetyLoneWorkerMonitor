import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const STATUS_COLOR = {
  safe: '#10b981',
  help_needed: '#f59e0b',
  no_response: '#ef4444',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: '#0b1220', border: '1px solid #1f2937', padding: 8, borderRadius: 6, color: '#e5e7eb', fontSize: 12 }}>
      <div style={{ fontWeight: 700 }}>{p.workerName}</div>
      <div>Status: <span style={{ color: STATUS_COLOR[p.status] || '#9ca3af' }}>{p.status}</span></div>
      <div>{p.minutes_ago} min ago</div>
      {p.location && <div>Loc: {p.location}</div>}
    </div>
  );
}

export default function CheckInTimeline({ series = [], height = 420 }) {
  // Build a numeric Y mapping: each worker on its own row
  const workerIndex = useMemo(() => {
    const m = new Map();
    series.forEach((s, i) => m.set(s.worker_id, { index: i, name: s.worker_name }));
    return m;
  }, [series]);

  const groupedByStatus = useMemo(() => {
    const groups = {};
    for (const s of series) {
      for (const ev of s.events || []) {
        const status = ev.status || 'unknown';
        if (!groups[status]) groups[status] = [];
        groups[status].push({
          x: -1 * (ev.minutes_ago || 0), // negative => left = older, right = recent (0)
          y: workerIndex.get(s.worker_id)?.index ?? 0,
          status,
          workerName: s.worker_name,
          minutes_ago: ev.minutes_ago,
          location: ev.location,
        });
      }
    }
    return groups;
  }, [series, workerIndex]);

  const yTickFormatter = (v) => {
    const found = Array.from(workerIndex.values()).find((w) => w.index === v);
    return found ? found.name : '';
  };

  const xTickFormatter = (v) => (v === 0 ? 'now' : `${Math.abs(v)}m`);

  return (
    <div style={{ width: '100%', height, background: '#0b1220', borderRadius: 8, border: '1px solid #1f2937', padding: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 24, left: 24, bottom: 16 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Minutes ago"
            tickFormatter={xTickFormatter}
            stroke="#9ca3af"
            domain={['dataMin', 0]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Worker"
            tickFormatter={yTickFormatter}
            stroke="#9ca3af"
            domain={[-0.5, Math.max(0, series.length - 0.5)]}
            ticks={series.map((_, i) => i)}
            width={90}
          />
          <ZAxis range={[80, 80]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          {Object.entries(groupedByStatus).map(([status, points]) => (
            <Scatter
              key={status}
              name={status}
              data={points}
              fill={STATUS_COLOR[status] || '#6b7280'}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
