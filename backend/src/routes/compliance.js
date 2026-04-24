import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/compliance
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get compliance records error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/compliance/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Compliance record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get compliance record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/compliance
router.post('/', async (req, res) => {
  try {
    const { worker_id, requirement, status, due_date, completed_date, notes } = req.body;

    if (!worker_id || !requirement) {
      return res.status(400).json({ success: false, error: 'Worker ID and requirement are required' });
    }

    const result = await pool.query(
      `INSERT INTO compliance_records (worker_id, requirement, status, due_date, completed_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [worker_id, requirement, status || 'pending', due_date || null, completed_date || null, notes || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create compliance record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/compliance/:id
router.put('/:id', async (req, res) => {
  try {
    const { worker_id, requirement, status, due_date, completed_date, notes } = req.body;

    const result = await pool.query(
      `UPDATE compliance_records SET worker_id = COALESCE($1, worker_id),
       requirement = COALESCE($2, requirement), status = COALESCE($3, status),
       due_date = COALESCE($4, due_date), completed_date = COALESCE($5, completed_date),
       notes = COALESCE($6, notes) WHERE id = $7 RETURNING *`,
      [worker_id, requirement, status, due_date, completed_date, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Compliance record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update compliance record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/compliance/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Compliance record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete compliance record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
