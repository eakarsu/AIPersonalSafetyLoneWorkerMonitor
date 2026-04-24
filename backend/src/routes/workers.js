import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/workers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workers ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/workers/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get worker error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/workers
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, department, role, status, risk_level, location } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const result = await pool.query(
      `INSERT INTO workers (name, email, phone, department, role, status, risk_level, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, email, phone || null, department || null, role || null, status || 'active', risk_level || 'low', location || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create worker error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/workers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, department, role, status, risk_level, last_check_in, location } = req.body;

    const result = await pool.query(
      `UPDATE workers SET name = COALESCE($1, name), email = COALESCE($2, email),
       phone = COALESCE($3, phone), department = COALESCE($4, department),
       role = COALESCE($5, role), status = COALESCE($6, status),
       risk_level = COALESCE($7, risk_level), last_check_in = COALESCE($8, last_check_in),
       location = COALESCE($9, location) WHERE id = $10 RETURNING *`,
      [name, email, phone, department, role, status, risk_level, last_check_in, location, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update worker error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/workers/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM workers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete worker error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
