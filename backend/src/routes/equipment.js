import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/equipment
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment_inspections ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get equipment inspections error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/equipment/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment_inspections WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipment inspection not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get equipment inspection error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/equipment
router.post('/', async (req, res) => {
  try {
    const { equipment_name, equipment_type, inspector_id, status, last_inspection, next_inspection, notes } = req.body;

    if (!equipment_name) {
      return res.status(400).json({ success: false, error: 'Equipment name is required' });
    }

    const result = await pool.query(
      `INSERT INTO equipment_inspections (equipment_name, equipment_type, inspector_id, status, last_inspection, next_inspection, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [equipment_name, equipment_type || null, inspector_id || null, status || 'passed', last_inspection || null, next_inspection || null, notes || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create equipment inspection error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/equipment/:id
router.put('/:id', async (req, res) => {
  try {
    const { equipment_name, equipment_type, inspector_id, status, last_inspection, next_inspection, notes } = req.body;

    const result = await pool.query(
      `UPDATE equipment_inspections SET equipment_name = COALESCE($1, equipment_name),
       equipment_type = COALESCE($2, equipment_type), inspector_id = COALESCE($3, inspector_id),
       status = COALESCE($4, status), last_inspection = COALESCE($5, last_inspection),
       next_inspection = COALESCE($6, next_inspection), notes = COALESCE($7, notes)
       WHERE id = $8 RETURNING *`,
      [equipment_name, equipment_type, inspector_id, status, last_inspection, next_inspection, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipment inspection not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update equipment inspection error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/equipment/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM equipment_inspections WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipment inspection not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete equipment inspection error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
