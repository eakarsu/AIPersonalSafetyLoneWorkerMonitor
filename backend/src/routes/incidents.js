import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/incidents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/incidents
router.post('/', async (req, res) => {
  try {
    const { title, description, worker_id, severity, status, location } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO incidents (title, description, worker_id, severity, status, location)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || null, worker_id || null, severity || 'low', status || 'open', location || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/incidents/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, worker_id, severity, status, location, resolved_at } = req.body;

    const result = await pool.query(
      `UPDATE incidents SET title = COALESCE($1, title), description = COALESCE($2, description),
       worker_id = COALESCE($3, worker_id), severity = COALESCE($4, severity),
       status = COALESCE($5, status), location = COALESCE($6, location),
       resolved_at = COALESCE($7, resolved_at) WHERE id = $8 RETURNING *`,
      [title, description, worker_id, severity, status, location, resolved_at, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/incidents/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM incidents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
