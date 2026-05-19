import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = Router();

// Store broadcast function reference (set by server.js)
export let broadcastCheckin = null;
export function setBroadcastCheckin(fn) { broadcastCheckin = fn; }

router.use(authMiddleware);

// GET /api/checkins
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM check_ins');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/checkins/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM check_ins WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get check-in error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/checkins
router.post('/',
  body('worker_id').notEmpty().withMessage('Worker ID is required').isInt(),
  body('status').optional().isIn(['safe', 'help_needed', 'no_response']),
  body('location').optional().isString(),
  body('notes').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { worker_id, status, location, notes } = req.body;

      const result = await pool.query(
        `INSERT INTO check_ins (worker_id, status, location, notes)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [worker_id, status || 'safe', location || null, notes || null]
      );

      // Update worker's last check-in
      await pool.query('UPDATE workers SET last_check_in = NOW() WHERE id = $1', [worker_id]);

      const checkin = result.rows[0];

      // Broadcast to WebSocket supervisors
      if (broadcastCheckin) {
        broadcastCheckin({ type: 'checkin', data: checkin });
      }

      res.status(201).json({ success: true, data: checkin });
    } catch (error) {
      console.error('Create check-in error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// PUT /api/checkins/:id
router.put('/:id', async (req, res) => {
  try {
    const { worker_id, status, location, notes } = req.body;

    const result = await pool.query(
      `UPDATE check_ins SET worker_id = COALESCE($1, worker_id),
       status = COALESCE($2, status), location = COALESCE($3, location),
       notes = COALESCE($4, notes) WHERE id = $5 RETURNING *`,
      [worker_id, status, location, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update check-in error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/checkins/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM check_ins WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete check-in error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/checkins/overdue - workers who haven't checked in within their required interval
router.get('/overdue', async (req, res) => {
  try {
    const overdueIntervalMinutes = parseInt(req.query.interval_minutes) || 60;

    const result = await pool.query(`
      SELECT w.*,
             ci.checked_in_at AS last_checkin_at,
             ci.status AS last_checkin_status,
             ci.location AS last_checkin_location,
             EXTRACT(EPOCH FROM (NOW() - COALESCE(w.last_check_in, w.created_at))) / 60 AS minutes_since_checkin
      FROM workers w
      LEFT JOIN LATERAL (
        SELECT * FROM check_ins WHERE worker_id = w.id ORDER BY checked_in_at DESC LIMIT 1
      ) ci ON true
      WHERE w.status != 'offline'
        AND (w.last_check_in IS NULL OR w.last_check_in < NOW() - ($1 || ' minutes')::INTERVAL)
      ORDER BY minutes_since_checkin DESC NULLS LAST
    `, [overdueIntervalMinutes]);

    // Auto-create alerts for critical overdue workers (> 2x interval)
    const criticalWorkers = result.rows.filter(w => w.minutes_since_checkin > overdueIntervalMinutes * 2);
    for (const worker of criticalWorkers) {
      try {
        const existing = await pool.query(
          `SELECT id FROM emergencies WHERE worker_id = $1 AND status = 'active' AND type = 'sos' AND triggered_at > NOW() - INTERVAL '2 hours'`,
          [worker.id]
        );
        if (existing.rows.length === 0) {
          const newEmergency = await pool.query(
            `INSERT INTO emergencies (worker_id, type, status, description, location, priority, triggered_at)
             VALUES ($1, 'sos', 'active', $2, $3, 'high', NOW()) RETURNING *`,
            [worker.id, `Overdue check-in alert: ${worker.name} has not checked in for ${Math.round(worker.minutes_since_checkin)} minutes`, worker.location]
          );
          if (broadcastCheckin) {
            broadcastCheckin({ type: 'overdue_alert', data: { worker, emergency: newEmergency.rows[0] } });
          }
        }
      } catch (alertErr) {
        console.error('Auto-alert error:', alertErr.message);
      }
    }

    res.json({
      success: true,
      data: result.rows,
      meta: {
        overdue_count: result.rows.length,
        critical_count: criticalWorkers.length,
        interval_minutes: overdueIntervalMinutes,
        checked_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Overdue check-ins error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
