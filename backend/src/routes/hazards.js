import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/hazards
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM hazards');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get hazards error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/hazards/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hazards WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hazard not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get hazard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/hazards
router.post('/', async (req, res) => {
  try {
    const { title, description, location, severity, status, reported_by } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO hazards (title, description, location, severity, status, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || null, location || null, severity || 'low', status || 'identified', reported_by || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create hazard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/hazards/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, location, severity, status, reported_by, mitigated_at } = req.body;

    const result = await pool.query(
      `UPDATE hazards SET title = COALESCE($1, title), description = COALESCE($2, description),
       location = COALESCE($3, location), severity = COALESCE($4, severity),
       status = COALESCE($5, status), reported_by = COALESCE($6, reported_by),
       mitigated_at = COALESCE($7, mitigated_at) WHERE id = $8 RETURNING *`,
      [title, description, location, severity, status, reported_by, mitigated_at, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hazard not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update hazard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/hazards/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM hazards WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hazard not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete hazard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
