import React, { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import WorkerMap from '../components/WorkerMap';
import CheckInTimeline from '../components/CheckInTimeline';
import SOSBroadcast from '../components/SOSBroadcast.js';
import ShiftRosterExport from '../components/ShiftRosterExport.js';

export default function CustomViewsPage() {
  const [workers, setWorkers] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [locRes, tlRes] = await Promise.all([
          api.get('/custom-views/worker-locations'),
          api.get('/custom-views/checkin-timeline'),
        ]);
        if (cancelled) return;
        setWorkers(locRes.data?.data || []);
        setTimeline(tlRes.data?.data || []);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const statusCounts = workers.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: 24, color: '#e5e7eb' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Safety Views</h1>
      <p style={{ color: '#9ca3af', marginBottom: 20 }}>
        Bespoke lone-worker situational awareness — live geo map and recent check-in cadence.
      </p>

      {error && (
        <div style={{ background: '#7f1d1d', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          Error: {error}
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Worker Location Map</h2>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {loading ? 'Loading…' : `${workers.length} workers`}
            {!loading && (
              <span style={{ marginLeft: 12 }}>
                <span style={{ color: '#10b981' }}>● active {statusCounts.active || 0}</span>{' '}
                <span style={{ color: '#f59e0b' }}>● check-in-due {statusCounts['check-in-due'] || 0}</span>{' '}
                <span style={{ color: '#ef4444' }}>● alarm {statusCounts.alarm || 0}</span>
              </span>
            )}
          </div>
        </div>
        <WorkerMap workers={workers} height={460} />
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Check-In Timeline</h2>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {loading ? 'Loading…' : `${timeline.length} workers, ${timeline.reduce((s, w) => s + (w.events?.length || 0), 0)} events`}
          </div>
        </div>
        <CheckInTimeline series={timeline} height={420} />
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>SOS Broadcast</h2>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Emergency broadcast + ack chain</div>
        </div>
        <SOSBroadcast />
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Shift Roster CSV Export</h2>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Date-range export with check-in counts</div>
        </div>
        <ShiftRosterExport />
      </section>
    </div>
  );
}
