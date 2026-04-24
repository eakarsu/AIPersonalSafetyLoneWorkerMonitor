import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/shifts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shifts ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/shifts/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shifts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shift not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/shifts
router.post('/', async (req, res) => {
  try {
    const { worker_id, start_time, end_time, location, type, status, notes } = req.body;

    if (!worker_id || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'Worker ID, start time, and end time are required' });
    }

    const result = await pool.query(
      `INSERT INTO shifts (worker_id, start_time, end_time, location, type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [worker_id, start_time, end_time, location || null, type || 'day', status || 'scheduled', notes || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/shifts/:id
router.put('/:id', async (req, res) => {
  try {
    const { worker_id, start_time, end_time, location, type, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE shifts SET worker_id = COALESCE($1, worker_id),
       start_time = COALESCE($2, start_time), end_time = COALESCE($3, end_time),
       location = COALESCE($4, location), type = COALESCE($5, type),
       status = COALESCE($6, status), notes = COALESCE($7, notes)
       WHERE id = $8 RETURNING *`,
      [worker_id, start_time, end_time, location, type, status, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shift not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/shifts/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shift not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
