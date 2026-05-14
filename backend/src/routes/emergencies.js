import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/emergencies
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM emergencies');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM emergencies ORDER BY triggered_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get emergencies error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/emergencies/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM emergencies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Emergency not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get emergency error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/emergencies
router.post('/', async (req, res) => {
  try {
    const { worker_id, type, status, description, location, priority } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'Worker ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO emergencies (worker_id, type, status, description, location, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [worker_id, type || 'sos', status || 'active', description || null, location || null, priority || 'high']
    );

    // Update worker status to emergency
    await pool.query(
      "UPDATE workers SET status = 'emergency' WHERE id = $1",
      [worker_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create emergency error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/emergencies/:id
router.put('/:id', async (req, res) => {
  try {
    const { worker_id, type, status, description, location, priority, resolved_at } = req.body;

    const result = await pool.query(
      `UPDATE emergencies SET worker_id = COALESCE($1, worker_id),
       type = COALESCE($2, type), status = COALESCE($3, status),
       description = COALESCE($4, description), location = COALESCE($5, location),
       priority = COALESCE($6, priority), resolved_at = COALESCE($7, resolved_at)
       WHERE id = $8 RETURNING *`,
      [worker_id, type, status, description, location, priority, resolved_at, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Emergency not found' });
    }

    // If resolved, update worker status back to active
    if (status === 'resolved') {
      const emergency = result.rows[0];
      await pool.query(
        "UPDATE workers SET status = 'active' WHERE id = $1",
        [emergency.worker_id]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update emergency error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/emergencies/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM emergencies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Emergency not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete emergency error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
