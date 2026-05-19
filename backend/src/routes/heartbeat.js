import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/heartbeat — no auth required for device uploads
router.post('/heartbeat', async (req, res) => {
  try {
    const { worker_id, lat, lng, battery_pct } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'worker_id is required' });
    }

    // Verify the worker exists
    const workerCheck = await pool.query('SELECT id FROM workers WHERE id = $1', [worker_id]);
    if (workerCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    const result = await pool.query(
      `INSERT INTO device_heartbeats (worker_id, lat, lng, battery_pct) VALUES ($1, $2, $3, $4) RETURNING *`,
      [worker_id, lat || null, lng || null, battery_pct !== undefined ? battery_pct : null]
    );

    // Update worker location if lat/lng provided
    if (lat && lng) {
      await pool.query('UPDATE workers SET last_check_in = NOW() WHERE id = $1', [worker_id]);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/workers/:id/heartbeat-history is handled in workers.js

export default router;
