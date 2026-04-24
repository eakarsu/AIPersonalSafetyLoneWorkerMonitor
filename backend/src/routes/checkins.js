import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/checkins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC');
    res.json({ success: true, data: result.rows });
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
router.post('/', async (req, res) => {
  try {
    const { worker_id, status, location, notes } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'Worker ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO check_ins (worker_id, status, location, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [worker_id, status || 'safe', location || null, notes || null]
    );

    // Update worker's last check-in
    await pool.query(
      'UPDATE workers SET last_check_in = NOW() WHERE id = $1',
      [worker_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create check-in error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

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

export default router;
