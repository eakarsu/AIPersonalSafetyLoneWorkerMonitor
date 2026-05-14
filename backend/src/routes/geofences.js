import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/geofences
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM geofences');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM geofences ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/geofences/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM geofences WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Geofence not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get geofence error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/geofences
router.post('/', async (req, res) => {
  try {
    const { name, zone_type, boundary, risk_level } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO geofences (name, zone_type, boundary, risk_level) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, zone_type || 'restricted', boundary ? JSON.stringify(boundary) : null, risk_level || 'medium']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create geofence error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/geofences/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, zone_type, boundary, risk_level } = req.body;

    const result = await pool.query(
      `UPDATE geofences SET name = COALESCE($1, name), zone_type = COALESCE($2, zone_type),
       boundary = COALESCE($3, boundary), risk_level = COALESCE($4, risk_level)
       WHERE id = $5 RETURNING *`,
      [name, zone_type, boundary ? JSON.stringify(boundary) : null, risk_level, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Geofence not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update geofence error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/geofences/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM geofences WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Geofence not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete geofence error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/geofences/check-location
router.post('/check-location', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'lat and lng are required' });
    }

    const geofences = await pool.query('SELECT * FROM geofences WHERE boundary IS NOT NULL');

    const matchingGeofences = [];

    for (const geofence of geofences.rows) {
      let boundary = geofence.boundary;
      if (typeof boundary === 'string') {
        try { boundary = JSON.parse(boundary); } catch { continue; }
      }

      // Simple bounding box check: boundary = { minLat, maxLat, minLng, maxLng }
      if (boundary && boundary.minLat !== undefined) {
        const { minLat, maxLat, minLng, maxLng } = boundary;
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          matchingGeofences.push(geofence);
        }
      }
      // Polygon boundary = { points: [{lat, lng}, ...] } — simple bounding box of polygon
      else if (boundary && Array.isArray(boundary.points) && boundary.points.length > 0) {
        const lats = boundary.points.map((p) => p.lat);
        const lngs = boundary.points.map((p) => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          matchingGeofences.push(geofence);
        }
      }
    }

    res.json({ success: true, data: { lat, lng, matching_geofences: matchingGeofences, inside_count: matchingGeofences.length } });
  } catch (error) {
    console.error('Check location error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
