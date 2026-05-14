import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/locations
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM locations');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/locations/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/locations
router.post('/', async (req, res) => {
  try {
    const { worker_id, latitude, longitude, address, zone, risk_level } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'Worker ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO locations (worker_id, latitude, longitude, address, zone, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [worker_id, latitude || null, longitude || null, address || null, zone || null, risk_level || 'low']
    );

    // Update worker location
    if (address) {
      await pool.query('UPDATE workers SET location = $1 WHERE id = $2', [address, worker_id]);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/locations/:id
router.put('/:id', async (req, res) => {
  try {
    const { worker_id, latitude, longitude, address, zone, risk_level } = req.body;

    const result = await pool.query(
      `UPDATE locations SET worker_id = COALESCE($1, worker_id),
       latitude = COALESCE($2, latitude), longitude = COALESCE($3, longitude),
       address = COALESCE($4, address), zone = COALESCE($5, zone),
       risk_level = COALESCE($6, risk_level) WHERE id = $7 RETURNING *`,
      [worker_id, latitude, longitude, address, zone, risk_level, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/locations/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
