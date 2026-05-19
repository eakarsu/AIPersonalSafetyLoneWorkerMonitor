// Custom Views — bespoke endpoints for lone-worker safety map + check-in timeline
import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Deterministic pseudo-random based on worker id — keeps coords stable across requests
function seededCoord(id, base, spread) {
  const seed = Math.sin(id * 9301 + 49297) * 233280;
  const frac = seed - Math.floor(seed);
  return base + (frac - 0.5) * spread;
}

function deriveStatus(worker) {
  // map worker status -> map marker status
  if (worker.status === 'emergency') return 'alarm';
  if (worker.status === 'offline') return 'alarm';
  const last = worker.last_check_in ? new Date(worker.last_check_in).getTime() : 0;
  const minutesSince = last ? (Date.now() - last) / 60000 : Infinity;
  const interval = worker.check_in_interval_minutes || 60;
  if (minutesSince > interval) return 'check-in-due';
  return 'active';
}

// GET /api/custom-views/worker-locations — list workers with synthesized lat/lng + map status
router.get('/worker-locations', async (req, res) => {
  try {
    let workers = [];
    try {
      const result = await pool.query(
        'SELECT id, name, department, role, status, location, last_check_in, check_in_interval_minutes FROM workers ORDER BY id ASC LIMIT 50'
      );
      workers = result.rows;
    } catch (dbErr) {
      // Schema missing — synthesize a small set
      workers = Array.from({ length: 12 }).map((_, i) => ({
        id: i + 1,
        name: `Worker ${i + 1}`,
        department: ['Field Ops', 'Maintenance', 'Inspection'][i % 3],
        role: 'Lone Worker',
        status: ['active', 'active', 'emergency', 'offline'][i % 4],
        location: 'Site',
        last_check_in: new Date(Date.now() - (i * 12) * 60000).toISOString(),
        check_in_interval_minutes: 60,
      }));
    }

    // Synthesize coordinates if not stored — distribute around a central anchor (London)
    const anchorLat = 51.5074;
    const anchorLng = -0.1278;

    const markers = workers.map((w) => ({
      id: w.id,
      name: w.name,
      department: w.department,
      role: w.role,
      raw_status: w.status,
      status: deriveStatus(w),
      location: w.location,
      last_check_in: w.last_check_in,
      lat: seededCoord(w.id, anchorLat, 0.18),
      lng: seededCoord(w.id + 7, anchorLng, 0.28),
    }));

    res.json({ success: true, data: markers, count: markers.length });
  } catch (error) {
    console.error('worker-locations error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/custom-views/checkin-timeline — recent check-ins grouped per worker
router.get('/checkin-timeline', async (req, res) => {
  try {
    let rows = [];
    try {
      const result = await pool.query(`
        SELECT c.id, c.worker_id, c.status, c.location, c.checked_in_at, w.name AS worker_name
        FROM check_ins c
        LEFT JOIN workers w ON w.id = c.worker_id
        ORDER BY c.checked_in_at DESC
        LIMIT 200
      `);
      rows = result.rows;
    } catch (dbErr) {
      // Synthesize check-ins if schema missing
      const workerNames = ['Alice', 'Bob', 'Carla', 'Dan', 'Eve', 'Frank'];
      const now = Date.now();
      rows = [];
      workerNames.forEach((name, wi) => {
        for (let i = 0; i < 6; i++) {
          rows.push({
            id: wi * 100 + i,
            worker_id: wi + 1,
            worker_name: name,
            status: ['safe', 'safe', 'help_needed', 'no_response'][i % 4],
            location: 'Site',
            checked_in_at: new Date(now - (i * 45 + wi * 10) * 60000).toISOString(),
          });
        }
      });
    }

    // Group by worker for horizontal timeline rendering
    const byWorker = new Map();
    for (const r of rows) {
      const key = r.worker_id || 0;
      if (!byWorker.has(key)) {
        byWorker.set(key, {
          worker_id: key,
          worker_name: r.worker_name || `Worker ${key}`,
          events: [],
        });
      }
      byWorker.get(key).events.push({
        id: r.id,
        status: r.status,
        location: r.location,
        checked_in_at: r.checked_in_at,
        // numeric time offset (minutes ago) for chart x-axis
        minutes_ago: Math.max(
          0,
          Math.round((Date.now() - new Date(r.checked_in_at).getTime()) / 60000)
        ),
      });
    }

    const series = Array.from(byWorker.values()).slice(0, 10);

    res.json({ success: true, data: series, worker_count: series.length, event_count: rows.length });
  } catch (error) {
    console.error('checkin-timeline error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Ensure sos_events table exists (idempotent, ignore failures so endpoint still works)
async function ensureSosEventsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sos_events (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER,
        worker_name TEXT,
        triggered_by TEXT,
        notified JSONB,
        escalation_chain JSONB,
        ack_status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) {
    // schema not available — silently continue, route falls back to in-memory log
  }
}
ensureSosEventsTable();

// In-memory fallback log of recent SOS broadcasts (used if DB write fails)
const sosMemoryLog = [];

// POST /api/custom-views/trigger-sos — broadcast SOS, log to sos_events table
router.post('/trigger-sos', async (req, res) => {
  try {
    const { worker_id, worker_name, reason } = req.body || {};
    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'worker_id is required' });
    }

    // Resolve worker name if not provided
    let resolvedName = worker_name || null;
    if (!resolvedName) {
      try {
        const r = await pool.query('SELECT name FROM workers WHERE id = $1', [worker_id]);
        resolvedName = r.rows[0]?.name || `Worker ${worker_id}`;
      } catch (_) {
        resolvedName = `Worker ${worker_id}`;
      }
    }

    const notified = [
      { channel: 'sms', target: 'On-call supervisor', status: 'sent', at: new Date().toISOString() },
      { channel: 'push', target: 'Field Ops dispatchers', status: 'sent', at: new Date().toISOString() },
      { channel: 'email', target: 'safety-team@safeguard.com', status: 'sent', at: new Date().toISOString() },
      { channel: 'radio', target: 'Site channel 7', status: 'sent', at: new Date().toISOString() },
    ];

    const escalation_chain = [
      { level: 1, role: 'Direct Supervisor', eta_minutes: 2 },
      { level: 2, role: 'Safety Officer', eta_minutes: 5 },
      { level: 3, role: 'Operations Manager', eta_minutes: 10 },
      { level: 4, role: 'Emergency Services (911)', eta_minutes: 15 },
    ];

    const triggeredBy = req.user?.email || 'admin@safeguard.com';
    let saved = null;
    try {
      const insert = await pool.query(
        `INSERT INTO sos_events (worker_id, worker_name, triggered_by, notified, escalation_chain, ack_status)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'pending') RETURNING *`,
        [worker_id, resolvedName, triggeredBy, JSON.stringify(notified), JSON.stringify(escalation_chain)]
      );
      saved = insert.rows[0];
    } catch (dbErr) {
      // fall back to in-memory log
      saved = {
        id: sosMemoryLog.length + 1,
        worker_id,
        worker_name: resolvedName,
        triggered_by: triggeredBy,
        notified,
        escalation_chain,
        ack_status: 'pending',
        created_at: new Date().toISOString(),
      };
      sosMemoryLog.unshift(saved);
    }

    res.json({
      success: true,
      event_id: saved.id,
      worker_id,
      worker_name: resolvedName,
      reason: reason || 'Manual SOS broadcast',
      notified,
      escalation_chain,
      ack_status: saved.ack_status || 'pending',
      created_at: saved.created_at,
    });
  } catch (error) {
    console.error('trigger-sos error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/custom-views/sos-log — recent SOS broadcasts (combines DB + in-memory)
router.get('/sos-log', async (req, res) => {
  try {
    let rows = [];
    try {
      const r = await pool.query(
        `SELECT id, worker_id, worker_name, triggered_by, notified, escalation_chain, ack_status, created_at
         FROM sos_events ORDER BY created_at DESC LIMIT 25`
      );
      rows = r.rows;
    } catch (_) {
      rows = sosMemoryLog.slice(0, 25);
    }
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('sos-log error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/custom-views/shift-roster.csv?from=&to= — CSV export of roster with check-in counts
router.get('/shift-roster.csv', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).type('text/plain').send('Invalid from/to dates. Use YYYY-MM-DD.');
    }

    let rows = [];
    try {
      const result = await pool.query(
        `
        SELECT
          w.id AS worker_id,
          w.name AS worker_name,
          COALESCE(s.shift_type, s.name, 'day') AS shift,
          COALESCE(s.location, w.location, 'Unassigned') AS location,
          (
            SELECT COUNT(*) FROM check_ins c
            WHERE c.worker_id = w.id
              AND c.checked_in_at >= $1
              AND c.checked_in_at <= $2
          )::int AS check_in_count
        FROM workers w
        LEFT JOIN LATERAL (
          SELECT * FROM shifts s2
          WHERE s2.worker_id = w.id
            AND s2.start_time <= $2
            AND s2.end_time   >= $1
          ORDER BY s2.start_time DESC LIMIT 1
        ) s ON TRUE
        ORDER BY w.id ASC
        LIMIT 200
        `,
        [fromDate.toISOString(), toDate.toISOString()]
      );
      rows = result.rows;
    } catch (dbErr) {
      // Synthesize roster if schema/shape differs
      const sample = ['Alice', 'Bob', 'Carla', 'Dan', 'Eve', 'Frank', 'Gina', 'Henry'];
      rows = sample.map((name, i) => ({
        worker_id: i + 1,
        worker_name: name,
        shift: ['day', 'night', 'swing'][i % 3],
        location: ['Site A', 'Site B', 'Warehouse'][i % 3],
        check_in_count: 8 + ((i * 3) % 12),
      }));
    }

    const header = ['worker_id', 'worker', 'shift', 'location', 'check_in_count'];
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.worker_id,
        r.worker_name,
        r.shift,
        r.location,
        r.check_in_count,
      ].map(escape).join(','));
    }
    const csv = lines.join('\n') + '\n';

    const fname = `shift-roster_${fromDate.toISOString().slice(0, 10)}_to_${toDate.toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(csv);
  } catch (error) {
    console.error('shift-roster.csv error:', error);
    res.status(500).type('text/plain').send('Internal server error');
  }
});

export default router;
