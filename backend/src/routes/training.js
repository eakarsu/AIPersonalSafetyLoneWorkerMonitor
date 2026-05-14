import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/training
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM training_records');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get training records error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/training/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM training_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Training record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get training record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/training
router.post('/', async (req, res) => {
  try {
    const { worker_id, course_name, category, status, score, completed_at, expires_at } = req.body;

    if (!worker_id || !course_name) {
      return res.status(400).json({ success: false, error: 'Worker ID and course name are required' });
    }

    const result = await pool.query(
      `INSERT INTO training_records (worker_id, course_name, category, status, score, completed_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [worker_id, course_name, category || null, status || 'not_started', score || null, completed_at || null, expires_at || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create training record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/training/:id
router.put('/:id', async (req, res) => {
  try {
    const { worker_id, course_name, category, status, score, completed_at, expires_at } = req.body;

    const result = await pool.query(
      `UPDATE training_records SET worker_id = COALESCE($1, worker_id),
       course_name = COALESCE($2, course_name), category = COALESCE($3, category),
       status = COALESCE($4, status), score = COALESCE($5, score),
       completed_at = COALESCE($6, completed_at), expires_at = COALESCE($7, expires_at)
       WHERE id = $8 RETURNING *`,
      [worker_id, course_name, category, status, score, completed_at, expires_at, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Training record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update training record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/training/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM training_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Training record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete training record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
