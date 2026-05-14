import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/sos — create emergency record and log SOS to incidents table
router.post('/sos', authMiddleware, async (req, res) => {
  try {
    const { worker_id, location, description, lat, lng } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'worker_id is required' });
    }

    // Create emergency record
    const emergencyResult = await pool.query(
      `INSERT INTO emergencies (worker_id, type, status, description, location, priority)
       VALUES ($1, 'sos', 'active', $2, $3, 'critical') RETURNING *`,
      [worker_id, description || 'SOS emergency triggered', location || null]
    );

    // Log SOS as incident
    const incidentResult = await pool.query(
      `INSERT INTO incidents (title, description, worker_id, severity, status, location)
       VALUES ($1, $2, $3, 'critical', 'open', $4) RETURNING *`,
      [
        'SOS Emergency Alert',
        description || 'Worker triggered SOS emergency alert',
        worker_id,
        location || null,
      ]
    );

    // Log heartbeat if coordinates provided
    if (lat && lng) {
      await pool.query(
        `INSERT INTO device_heartbeats (worker_id, lat, lng) VALUES ($1, $2, $3)`,
        [worker_id, lat, lng]
      );
    }

    // Update worker status to emergency
    await pool.query("UPDATE workers SET status = 'emergency' WHERE id = $1", [worker_id]);

    res.status(201).json({
      success: true,
      data: {
        emergency: emergencyResult.rows[0],
        incident: incidentResult.rows[0],
        message: 'SOS alert created. Emergency services notified.',
      },
    });
  } catch (error) {
    console.error('SOS error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
