import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { queryAI } from '../services/openrouter.js';

const router = Router();

router.use(authMiddleware);

// GET /api/incidents
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM incidents');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

// POST /api/incidents/:id/ai-report
router.post('/:id/ai-report', async (req, res) => {
  try {
    const incidentResult = await pool.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (incidentResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Incident not found' });
    const incident = incidentResult.rows[0];

    let worker = null;
    if (incident.worker_id) {
      const wRes = await pool.query('SELECT * FROM workers WHERE id = $1', [incident.worker_id]);
      if (wRes.rows.length > 0) worker = wRes.rows[0];
    }

    const systemPrompt = `You are an occupational health and safety expert specializing in incident investigation and formal report writing. Respond ONLY with valid JSON.`;
    const userMessage = `Generate a formal incident report. Return JSON with this structure:
{
  "report_number": "IR-${String(incident.id).padStart(5,'0')}",
  "incident_summary": "<paragraph>",
  "incident_classification": {"type": "<string>", "severity": "${incident.severity}", "osha_recordable": <boolean>},
  "root_cause_analysis": {"immediate_cause": "<string>", "contributing_factors": ["<factor>"], "root_causes": ["<cause>"], "systemic_issues": ["<issue>"]},
  "timeline_of_events": [{"time": "<string>", "event": "<string>"}],
  "corrective_actions": [{"action": "<string>", "responsible_party": "<role>", "due_date": "<timeframe>", "priority": "immediate|short_term|long_term", "status": "open"}],
  "preventive_measures": [{"measure": "<string>", "implementation_scope": "individual|team|organization"}],
  "management_summary": "<paragraph>",
  "regulatory_reporting_required": <boolean>,
  "regulatory_bodies": ["<agency>"]
}

Incident:
- Title: ${incident.title}
- Description: ${incident.description || 'No description'}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Location: ${incident.location || 'Unknown'}
- Reported At: ${incident.reported_at}
- Worker: ${worker ? `${worker.name} (${worker.department})` : 'Unknown'}`;

    const aiText = await queryAI(systemPrompt, userMessage);
    let parsed = null;
    try { parsed = JSON.parse(aiText); } catch {}
    if (!parsed) { const m = aiText.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) try { parsed = JSON.parse(m[1].trim()); } catch {} }

    await pool.query(
      `INSERT INTO ai_results (user_id, endpoint, result, metadata) VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'incident-ai-report', aiText, JSON.stringify({ incident_id: incident.id })]
    );

    res.json({ success: true, data: { report: parsed || aiText, raw: aiText, incident, worker } });
  } catch (error) {
    console.error('AI incident report error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate incident report' });
  }
});

export default router;
