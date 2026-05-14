import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { queryAI } from '../services/openrouter.js';

const router = Router();

router.use(authMiddleware);

// GET /api/workers
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM workers');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM workers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

// GET /api/workers/:id/heartbeat-history
router.get('/:id/heartbeat-history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM device_heartbeats WHERE worker_id = $1 ORDER BY recorded_at DESC LIMIT 100',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get heartbeat history error:', error);
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

// POST /api/workers/:id/emergency - create emergency event and generate AI response plan
router.post('/:id/emergency', async (req, res) => {
  try {
    const { location, type, description } = req.body;
    const workerId = parseInt(req.params.id);

    const workerResult = await pool.query('SELECT * FROM workers WHERE id = $1', [workerId]);
    if (workerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }
    const worker = workerResult.rows[0];

    // Create emergency record
    const emergencyResult = await pool.query(
      `INSERT INTO emergencies (worker_id, type, status, description, location, priority, triggered_at)
       VALUES ($1, $2, 'active', $3, $4, 'critical', NOW()) RETURNING *`,
      [workerId, type || 'sos', description || `Emergency triggered for worker ${worker.name}`, location || worker.location]
    );
    const emergency = emergencyResult.rows[0];

    // Get recent locations for context
    const locations = await pool.query('SELECT * FROM locations WHERE worker_id = $1 ORDER BY recorded_at DESC LIMIT 5', [workerId]);

    // Generate AI emergency response plan
    const systemPrompt = `You are an AI Emergency Response Coordinator. Generate an emergency response plan. Respond ONLY with valid JSON.`;
    const userMessage = `Generate an emergency response plan for this situation and return JSON:
{
  "immediate_actions": [{"action": "<string>", "time_limit": "<seconds/minutes>", "responsible": "<role>"}],
  "emergency_services": {"call_police": <boolean>, "call_ambulance": <boolean>, "call_fire": <boolean>, "rationale": "<string>"},
  "communication_plan": [{"contact": "<role>", "method": "<phone/radio/etc>", "message": "<what to say>"}],
  "site_safety_steps": [{"step": "<action>", "priority": "immediate|urgent|standard"}],
  "estimated_response_time_minutes": <integer>,
  "special_considerations": "<string>",
  "follow_up_actions": [{"action": "<string>", "timeline": "<string>"}]
}

Emergency:
- Worker: ${worker.name} (${worker.department}, ${worker.role})
- Type: ${type || 'SOS'}
- Location: ${location || worker.location}
- Description: ${description || 'Emergency triggered'}
- Worker Status: ${worker.status}
- Last Known Location: ${locations.rows[0]?.address || worker.location}`;

    let responsePlan = null;
    try {
      const aiText = await queryAI(systemPrompt, userMessage);
      responsePlan = { parsed: null, raw: aiText };
      // 3-strategy parse
      try { responsePlan.parsed = JSON.parse(aiText); } catch {}
      if (!responsePlan.parsed) {
        const m = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) try { responsePlan.parsed = JSON.parse(m[1].trim()); } catch {}
      }
      if (!responsePlan.parsed) {
        const i = aiText.search(/[{[]/);
        if (i >= 0) {
          let d = 0, inStr = false, esc = false;
          for (let j = i; j < aiText.length; j++) {
            const c = aiText[j];
            if (esc) { esc = false; continue; }
            if (c === '\\') { esc = true; continue; }
            if (c === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (c === '{' || c === '[') d++;
            else if (c === '}' || c === ']') { d--; if (d === 0) { try { responsePlan.parsed = JSON.parse(aiText.slice(i, j+1)); } catch {} break; } }
          }
        }
      }

      // Persist AI result
      await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, result, metadata) VALUES ($1, $2, $3, $4)`,
        [req.user.id, 'emergency-plan', aiText, JSON.stringify({ worker_id: workerId, emergency_id: emergency.id, type })]
      );
    } catch (aiErr) {
      console.error('AI emergency plan error:', aiErr.message);
    }

    res.status(201).json({
      success: true,
      data: {
        emergency,
        worker,
        response_plan: responsePlan,
      },
    });
  } catch (error) {
    console.error('Create emergency error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/incidents/:id/ai-report - AI-generated formal incident report
router.post('/:workerId/incidents/:incidentId/ai-report', async (req, res) => {
  try {
    const { workerId, incidentId } = req.params;
    const incidentResult = await pool.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
    if (incidentResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Incident not found' });
    const incident = incidentResult.rows[0];
    const workerResult = await pool.query('SELECT * FROM workers WHERE id = $1', [workerId]);
    const worker = workerResult.rows.length > 0 ? workerResult.rows[0] : null;

    const systemPrompt = `You are an occupational health and safety expert specializing in incident investigation and formal report writing. Respond ONLY with valid JSON.`;
    const userMessage = `Generate a formal incident report for this incident. Return JSON:
{
  "report_number": "IR-${String(incidentId).padStart(5,'0')}",
  "incident_summary": "<paragraph>",
  "incident_classification": {"type": "<injury|near_miss|property_damage|environmental>", "severity": "${incident.severity}", "osha_recordable": <boolean>},
  "root_cause_analysis": {"immediate_cause": "<string>", "contributing_factors": ["<factor>"], "root_causes": ["<root cause>"], "systemic_issues": ["<issue>"]},
  "timeline_of_events": [{"time": "<timestamp or description>", "event": "<what happened>"}],
  "corrective_actions": [{"action": "<action>", "responsible_party": "<role>", "due_date": "<timeframe>", "priority": "immediate|short_term|long_term", "status": "open"}],
  "preventive_measures": [{"measure": "<measure>", "implementation_scope": "<individual|team|organization>"}],
  "management_summary": "<executive summary paragraph>",
  "regulatory_reporting_required": <boolean>,
  "regulatory_bodies": ["<agency>"]
}

Incident Details:
- Title: ${incident.title}
- Description: ${incident.description || 'No description provided'}
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
      [req.user.id, 'incident-ai-report', aiText, JSON.stringify({ incident_id: incidentId, worker_id: workerId })]
    );

    res.json({ success: true, data: { report: parsed || aiText, raw: aiText, incident, worker } });
  } catch (error) {
    console.error('AI incident report error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
