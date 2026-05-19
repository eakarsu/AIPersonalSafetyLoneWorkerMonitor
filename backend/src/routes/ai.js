import { Router } from 'express';
import pool from '../db.js';
import { queryAI } from '../services/openrouter.js';
import { authMiddleware } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

const router = Router();

// 3-strategy JSON parser
function parseAIJson(text) {
  // Strategy 1: direct parse
  try { return JSON.parse(text); } catch {}
  // Strategy 2: extract JSON block from markdown
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }
  // Strategy 3: find first { or [ and extract balanced JSON
  const firstBrace = text.search(/[{[]/);
  if (firstBrace >= 0) {
    let depth = 0; let inStr = false; let escape = false;
    const opener = text[firstBrace] === '{' ? ['{','}'] : ['[',']'];
    for (let i = firstBrace; i < text.length; i++) {
      const c = text[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === opener[0]) depth++;
      else if (c === opener[1]) { depth--; if (depth === 0) { try { return JSON.parse(text.slice(firstBrace, i + 1)); } catch {} break; } }
    }
  }
  return null;
}

// Rate limiter: 20 requests per hour per user/IP
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req.user ? `user_${req.user.id}` : req.ip),
  message: { success: false, error: 'Too many AI requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply auth to all AI routes
router.use(authMiddleware);
router.use(aiRateLimiter);

// Helper: persist AI result
async function saveAiResult(userId, endpoint, result, metadata) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, endpoint, result, metadata) VALUES ($1, $2, $3, $4)`,
      [userId, endpoint, result, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Failed to save AI result:', err.message);
  }
}

// GET /api/ai/history
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM ai_results WHERE user_id = $1', [req.user.id]);
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      'SELECT id, endpoint, result, metadata, created_at FROM ai_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    res.json({ success: true, data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('AI history error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/ai/risk-assessment
router.post('/risk-assessment', async (req, res) => {
  try {
    const workers = await pool.query('SELECT * FROM workers ORDER BY created_at DESC');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 50');
    const checkins = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC LIMIT 50');
    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC LIMIT 50');

    const systemPrompt = `You are an AI Safety Risk Assessment Specialist for a lone worker monitoring system.
Your job is to analyze worker data including their profiles, recent incidents, check-in patterns, and location history
to assess the risk level for each worker. Consider factors like:
- Frequency and recency of check-ins
- History of incidents involving the worker
- Current location risk levels
- Worker status patterns
- Department-specific risks

Provide a structured risk assessment with:
1. Overall risk summary
2. Individual worker risk ratings (low/medium/high/critical) with explanations
3. Key risk factors identified
4. Recommended immediate actions
5. Long-term risk mitigation strategies

Format your response in clear sections with headers.`;

    const userData = JSON.stringify({
      workers: workers.rows,
      recent_incidents: incidents.rows,
      recent_checkins: checkins.rows,
      recent_locations: locations.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze the following worker safety data and provide a comprehensive risk assessment:\n\n${userData}`);

    const metadata = {
      workers_analyzed: workers.rows.length,
      incidents_reviewed: incidents.rows.length,
      checkins_reviewed: checkins.rows.length,
      generated_at: new Date().toISOString(),
    };

    await saveAiResult(req.user.id, 'risk-assessment', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate risk assessment' });
  }
});

// POST /api/ai/incident-analysis
router.post('/incident-analysis', async (req, res) => {
  try {
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 50');
    const workers = await pool.query('SELECT * FROM workers');
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC LIMIT 30');

    const systemPrompt = `You are an AI Incident Analysis Expert for a lone worker safety monitoring system.
Your role is to analyze safety incidents to identify patterns, root causes, and provide actionable recommendations.
Consider:
- Incident frequency and severity trends
- Common locations and times for incidents
- Worker-specific incident patterns
- Correlation with known hazards
- Seasonal or temporal patterns

Provide a structured analysis with:
1. Incident overview and statistics
2. Pattern analysis (recurring types, locations, times)
3. Root cause analysis for major incidents
4. Correlation with hazard reports
5. Specific recommendations to prevent future incidents
6. Priority actions ranked by impact

Format your response in clear sections with headers.`;

    const userData = JSON.stringify({ incidents: incidents.rows, workers: workers.rows, hazards: hazards.rows });

    const aiResponse = await queryAI(systemPrompt, `Please analyze the following incident data and provide comprehensive incident analysis:\n\n${userData}`);

    const metadata = { incidents_analyzed: incidents.rows.length, hazards_reviewed: hazards.rows.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'incident-analysis', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Incident analysis error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate incident analysis' });
  }
});

// POST /api/ai/anomaly-detection
router.post('/anomaly-detection', async (req, res) => {
  try {
    const checkins = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC LIMIT 50');
    const workers = await pool.query('SELECT * FROM workers');
    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC LIMIT 50');

    const systemPrompt = `You are an AI Anomaly Detection Specialist for a lone worker safety monitoring system.
Your role is to detect unusual patterns in worker behavior that could indicate safety concerns.
Look for anomalies such as:
- Missed or irregular check-in patterns
- Unusual location patterns or deviations from normal routes
- Sudden changes in check-in status patterns
- Workers in unexpected locations or zones
- Abnormal timing patterns (e.g., check-ins at unusual hours)
- Workers who have gone offline unexpectedly

Provide a structured report with:
1. Summary of detected anomalies
2. Anomaly severity ratings
3. Affected workers and details
4. Possible explanations for each anomaly
5. Recommended follow-up actions
6. Monitoring suggestions

Format your response in clear sections with headers.`;

    const userData = JSON.stringify({ check_ins: checkins.rows, workers: workers.rows, locations: locations.rows });

    const aiResponse = await queryAI(systemPrompt, `Please analyze the following data for behavioral anomalies:\n\n${userData}`);

    const metadata = { checkins_analyzed: checkins.rows.length, workers_monitored: workers.rows.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'anomaly-detection', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to run anomaly detection' });
  }
});

// POST /api/ai/emergency-response
router.post('/emergency-response', async (req, res) => {
  try {
    const { emergency_id } = req.body;

    let emergencyData;
    if (emergency_id) {
      const result = await pool.query('SELECT * FROM emergencies WHERE id = $1', [emergency_id]);
      emergencyData = result.rows;
    } else {
      const result = await pool.query("SELECT * FROM emergencies WHERE status = 'active' ORDER BY triggered_at DESC");
      emergencyData = result.rows;
    }

    const workers = await pool.query('SELECT * FROM workers');
    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC LIMIT 30');

    const systemPrompt = `You are an AI Emergency Response Coordinator for a lone worker safety monitoring system.
Your role is to provide optimal emergency response plans for active emergencies.
Consider:
- Type and severity of the emergency
- Worker location and accessibility
- Available nearby resources and personnel
- Communication protocols
- Escalation procedures
- Environmental factors

Provide a structured emergency response plan with:
1. Immediate actions (first 5 minutes)
2. Short-term response (5-30 minutes)
3. Resource deployment recommendations
4. Communication plan (who to notify and how)
5. Escalation criteria and procedures
6. Worker safety protocols during the emergency
7. Post-emergency follow-up steps

Format your response as an actionable emergency response plan with clear priorities.`;

    const userData = JSON.stringify({ emergencies: emergencyData, workers: workers.rows, recent_locations: locations.rows });

    const aiResponse = await queryAI(systemPrompt, `Please create an optimal emergency response plan based on the following data:\n\n${userData}`);

    const metadata = { active_emergencies: emergencyData.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'emergency-response', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Emergency response error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate emergency response plan' });
  }
});

// POST /api/ai/route-safety
router.post('/route-safety', async (req, res) => {
  try {
    const { worker_id, start_location, end_location } = req.body;

    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC LIMIT 50');
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC LIMIT 30');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 30');

    const systemPrompt = `You are an AI Route Safety Analyst for a lone worker safety monitoring system.
Your role is to analyze routes and locations to assess safety and suggest the safest travel paths.
Consider:
- Known hazard locations and their severity
- Historical incident locations
- Zone risk levels
- Time-of-day safety variations
- Environmental and weather considerations
- Available emergency resources along routes

Provide a structured route safety analysis with:
1. Overall route safety rating
2. Identified risk points along the route
3. Known hazards near the route
4. Historical incidents in the area
5. Safer alternative routes if applicable
6. Safety precautions for the worker
7. Emergency contact points along the route
8. Recommended check-in intervals for the route

Format your response as a practical safety briefing for the worker.`;

    const userData = JSON.stringify({ worker_id, start_location, end_location, known_locations: locations.rows, known_hazards: hazards.rows, recent_incidents: incidents.rows });

    const aiResponse = await queryAI(systemPrompt, `Please analyze route safety based on the following data:\n\n${userData}`);

    const metadata = { hazards_considered: hazards.rows.length, incidents_reviewed: incidents.rows.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'route-safety', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Route safety error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to analyze route safety' });
  }
});

// POST /api/ai/compliance-predictor
router.post('/compliance-predictor', async (req, res) => {
  try {
    const compliance = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC LIMIT 30');
    const workers = await pool.query('SELECT * FROM workers');
    const training = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC LIMIT 30');

    const systemPrompt = `You are an AI Compliance Prediction Specialist for a lone worker safety monitoring system.
Your role is to analyze compliance records and predict upcoming compliance issues before they occur.
Consider:
- Current compliance status across all workers
- Upcoming due dates and expiration patterns
- Historical compliance violation patterns
- Training completion rates and their impact on compliance
- Department-specific compliance requirements
- Regulatory deadline patterns

Provide a structured compliance prediction report with:
1. Current compliance overview (compliant vs non-compliant percentages)
2. Predicted compliance issues for the next 30/60/90 days
3. Workers at highest risk of compliance violations
4. Expiring certifications and requirements
5. Department-level compliance risks
6. Recommended proactive actions
7. Compliance improvement strategies

Format your response in clear sections with specific actionable items.`;

    const userData = JSON.stringify({ compliance_records: compliance.rows, workers: workers.rows, training_records: training.rows });

    const aiResponse = await queryAI(systemPrompt, `Please analyze compliance data and predict upcoming issues:\n\n${userData}`);

    const metadata = { records_analyzed: compliance.rows.length, workers_evaluated: workers.rows.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'compliance-predictor', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Compliance predictor error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to predict compliance issues' });
  }
});

// POST /api/ai/shift-optimizer
router.post('/shift-optimizer', async (req, res) => {
  try {
    const shifts = await pool.query('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 50');
    const workers = await pool.query('SELECT * FROM workers');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 30');
    const checkins = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC LIMIT 50');

    const systemPrompt = `You are an AI Shift Optimization Specialist for a lone worker safety monitoring system.
Your role is to analyze current shift arrangements and suggest optimal scheduling for worker safety.
Consider:
- Current shift distribution and coverage gaps
- Worker fatigue and overtime patterns
- Incident rates during different shift types
- Worker availability and preferences
- High-risk periods requiring more coverage
- Lone worker safety requirements during night/swing shifts
- Check-in frequency patterns across shifts

Provide a structured shift optimization report with:
1. Current shift arrangement analysis
2. Identified coverage gaps and risks
3. Fatigue risk assessment
4. Optimized shift schedule recommendations
5. Specific worker reassignment suggestions
6. Safety-focused scheduling guidelines
7. Cost-benefit analysis of proposed changes

Format your response with clear, implementable scheduling recommendations.`;

    const userData = JSON.stringify({ shifts: shifts.rows, workers: workers.rows, recent_incidents: incidents.rows, recent_checkins: checkins.rows });

    const aiResponse = await queryAI(systemPrompt, `Please analyze and optimize the shift schedule based on the following data:\n\n${userData}`);

    const metadata = { shifts_analyzed: shifts.rows.length, workers_considered: workers.rows.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'shift-optimizer', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Shift optimizer error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to optimize shifts' });
  }
});

// POST /api/ai/hazard-prediction
router.post('/hazard-prediction', async (req, res) => {
  try {
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC LIMIT 30');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 50');
    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC LIMIT 50');
    const workers = await pool.query('SELECT * FROM workers');

    const systemPrompt = `You are an AI Hazard Prediction Specialist for a lone worker safety monitoring system.
Your role is to analyze existing hazard data and predict potential future hazards.
Consider:
- Historical hazard patterns and recurrence rates
- Correlation between hazards and incidents
- Location-based hazard clusters
- Seasonal or temporal hazard patterns
- Industry-specific hazard indicators
- Environmental and equipment-related risks
- Near-miss patterns that could escalate

Provide a structured hazard prediction report with:
1. Current hazard landscape summary
2. Predicted emerging hazards (next 30 days)
3. High-risk locations and zones
4. Hazard escalation risks (existing hazards likely to worsen)
5. Workers most at risk from predicted hazards
6. Preventive measures for each predicted hazard
7. Monitoring and early warning recommendations

Format your response with clear hazard predictions and actionable preventive measures.`;

    const userData = JSON.stringify({ hazards: hazards.rows, incidents: incidents.rows, locations: locations.rows, workers: workers.rows });

    const aiResponse = await queryAI(systemPrompt, `Please analyze hazard data and predict potential future hazards:\n\n${userData}`);

    const metadata = { hazards_analyzed: hazards.rows.length, incidents_correlated: incidents.rows.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'hazard-prediction', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Hazard prediction error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to predict hazards' });
  }
});

// POST /api/ai/training-recommender
router.post('/training-recommender', async (req, res) => {
  try {
    const workers = await pool.query('SELECT * FROM workers');
    const training = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC LIMIT 50');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 30');
    const compliance = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC LIMIT 30');

    const systemPrompt = `You are an AI Training Recommendation Specialist for a lone worker safety monitoring system.
Your role is to analyze worker profiles, training history, incident records, and compliance data to recommend personalized training.
Consider:
- Current training completion status and gaps
- Incident history and types (what training could have prevented incidents)
- Compliance requirements and upcoming deadlines
- Department and role-specific training needs
- Expired or soon-to-expire certifications
- Industry best practices for lone worker safety
- Skill gaps based on worker performance

Provide a structured training recommendation report with:
1. Overall training status summary
2. Critical training gaps (safety-critical skills missing)
3. Personalized recommendations per worker
4. Priority training courses ranked by safety impact
5. Training schedule recommendations
6. Compliance-driven training requirements
7. Budget and time estimates for recommended training

Format your response with specific, actionable training recommendations for each worker.`;

    const userData = JSON.stringify({ workers: workers.rows, training_records: training.rows, incidents: incidents.rows, compliance_records: compliance.rows });

    const aiResponse = await queryAI(systemPrompt, `Please analyze worker data and recommend training:\n\n${userData}`);

    const metadata = { workers_evaluated: workers.rows.length, training_records_reviewed: training.rows.length, generated_at: new Date().toISOString() };
    await saveAiResult(req.user.id, 'training-recommender', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Training recommender error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate training recommendations' });
  }
});

// POST /api/ai/safety-report
router.post('/safety-report', async (req, res) => {
  try {
    const workers = await pool.query('SELECT * FROM workers');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 50');
    const checkins = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC LIMIT 50');
    const emergencies = await pool.query('SELECT * FROM emergencies ORDER BY triggered_at DESC');
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC LIMIT 30');
    const compliance = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC LIMIT 30');
    const shifts = await pool.query('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 50');
    const training = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC LIMIT 50');
    const equipment = await pool.query('SELECT * FROM equipment_inspections ORDER BY created_at DESC');

    const systemPrompt = `You are an AI Safety Report Generator for a lone worker safety monitoring system.
Your role is to compile all safety data into a comprehensive, executive-level safety report.
This report should be suitable for management review and regulatory compliance.

Generate a comprehensive safety report that includes:
1. Executive Summary - High-level safety status overview
2. Workforce Safety Metrics - Worker counts, status distribution, risk levels
3. Incident Report - Total incidents, severity breakdown, trends, resolution rates
4. Emergency Response Summary - Emergencies handled, response times, outcomes
5. Check-in Compliance - Check-in rates, missed check-ins, patterns
6. Hazard Assessment - Active hazards, mitigation status, new hazards
7. Compliance Status - Overall compliance rate, violations, upcoming deadlines
8. Training Overview - Completion rates, gaps, expiring certifications
9. Equipment Status - Inspection results, equipment requiring attention
10. Shift Safety Analysis - Safety metrics by shift type
11. Key Recommendations - Top 5 priority actions for safety improvement
12. Risk Outlook - 30-day safety risk forecast

Format this as a professional safety report with clear sections, statistics, and actionable insights.`;

    const userData = JSON.stringify({
      workers: workers.rows,
      incidents: incidents.rows,
      check_ins: checkins.rows,
      emergencies: emergencies.rows,
      hazards: hazards.rows,
      compliance_records: compliance.rows,
      shifts: shifts.rows,
      training_records: training.rows,
      equipment_inspections: equipment.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please generate a comprehensive safety report from the following data:\n\n${userData}`);

    const metadata = {
      workers: workers.rows.length,
      incidents: incidents.rows.length,
      emergencies: emergencies.rows.length,
      hazards: hazards.rows.length,
      compliance_records: compliance.rows.length,
      training_records: training.rows.length,
      equipment_inspections: equipment.rows.length,
      generated_at: new Date().toISOString(),
    };
    await saveAiResult(req.user.id, 'safety-report', aiResponse, metadata);

    res.json({ success: true, data: { analysis: aiResponse, metadata } });
  } catch (error) {
    console.error('Safety report error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate safety report' });
  }
});

// POST /api/ai/risk-assess - structured risk assessment for a specific situation
router.post('/risk-assess',
  body('location_description').optional().isString(),
  body('task_type').optional().isString(),
  body('worker_count').optional().isInt({ min: 1 }),
  body('time_of_day').optional().isString(),
  body('environmental_conditions').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { location_description, task_type, worker_count, time_of_day, environmental_conditions } = req.body;

      const systemPrompt = `You are a certified safety risk assessor for lone worker operations. You must respond ONLY with valid JSON. No markdown, no explanation.`;

      const userMessage = `Assess the risk for the following situation and return a JSON object with this exact structure:
{
  "risk_score": <integer 1-10>,
  "risk_level": "<low|medium|high|critical>",
  "summary": "<1-2 sentence overall summary>",
  "specific_hazards": [{"hazard": "<name>", "severity": "<low|medium|high>", "description": "<explanation>"}],
  "mitigation_steps": [{"step": "<action>", "priority": "<immediate|short_term|long_term>", "description": "<details>"}],
  "recommended_check_in_interval_minutes": <integer>,
  "emergency_contacts_required": <boolean>
}

Situation:
- Location: ${location_description || 'unspecified'}
- Task type: ${task_type || 'general maintenance'}
- Worker count: ${worker_count || 1}
- Time of day: ${time_of_day || 'daytime'}
- Environmental conditions: ${environmental_conditions || 'standard'}`;

      const aiText = await queryAI(systemPrompt, userMessage);
      const parsed = parseAIJson(aiText);

      const metadata = { location_description, task_type, worker_count, time_of_day, environmental_conditions, generated_at: new Date().toISOString() };
      await saveAiResult(req.user.id, 'risk-assess', aiText, metadata);

      res.json({ success: true, data: { assessment: parsed || aiText, raw: aiText, metadata } });
    } catch (error) {
      console.error('Risk assess error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to assess risk' });
    }
  }
);

// POST /api/ai/safety-briefing - pre-job safety briefing generator
router.post('/safety-briefing',
  body('job_type').notEmpty().withMessage('job_type is required'),
  body('location_hazards').optional().isString(),
  body('weather_conditions').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { job_type, location_hazards, weather_conditions } = req.body;

      const systemPrompt = `You are a workplace safety expert who creates pre-job safety briefing documents for lone workers. Respond ONLY with valid JSON.`;

      const userMessage = `Create a complete pre-job safety briefing document and return JSON with this exact structure:
{
  "briefing_title": "<string>",
  "job_type": "${job_type}",
  "estimated_duration_minutes": <integer>,
  "required_ppe": [{"item": "<PPE item>", "specification": "<details>"}],
  "toolbox_talk_points": [{"topic": "<title>", "key_message": "<message>", "discussion_prompt": "<question to ask workers>"}],
  "hazard_identification": [{"hazard": "<name>", "control_measure": "<measure>", "responsible_person": "<role>"}],
  "emergency_procedures": [{"scenario": "<situation>", "action": "<what to do>", "contact": "<who to call>"}],
  "check_in_requirements": {"frequency_minutes": <integer>, "method": "<communication method>", "supervisor_contact": "<contact details placeholder>"},
  "sign_off_required": <boolean>,
  "weather_considerations": "<string>"
}

Job Type: ${job_type}
Location Hazards: ${location_hazards || 'standard workplace hazards'}
Weather Conditions: ${weather_conditions || 'check forecast before starting'}`;

      const aiText = await queryAI(systemPrompt, userMessage);
      const parsed = parseAIJson(aiText);

      const metadata = { job_type, location_hazards, weather_conditions, generated_at: new Date().toISOString() };
      await saveAiResult(req.user.id, 'safety-briefing', aiText, metadata);

      res.json({ success: true, data: { briefing: parsed || aiText, raw: aiText, metadata } });
    } catch (error) {
      console.error('Safety briefing error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to generate safety briefing' });
    }
  }
);

// POST /api/ai/equipment-failure-predict
router.post('/equipment-failure-predict', async (req, res) => {
  try {
    const eqRes = await pool.query('SELECT * FROM equipment_inspections ORDER BY created_at DESC LIMIT 100');
    const systemPrompt = `You predict PPE / safety-equipment failure risks (helmets, harnesses, gas detectors, beacons) and flag items nearing expiration. Return ONLY JSON:
{ "items_at_risk": [{"equipment_id": any, "equipment_name": string, "predicted_failure_window": string, "risk_level": "low|medium|high|critical", "expiry_date": string, "recommended_action": string}], "summary": string, "next_inspection_priorities": [any] }`;
    const userMessage = `Recent equipment inspections: ${JSON.stringify(eqRes.rows).slice(0, 6000)}`;
    const aiResponse = await queryAI(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse);
    await saveAiResult(req.user.id, 'equipment-failure-predict', aiResponse, { count: eqRes.rows.length });
    res.json({ success: true, data: { analysis: aiResponse, parsed } });
  } catch (error) {
    console.error('Equipment failure predict error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/audit-readiness-score
router.post('/audit-readiness-score', async (req, res) => {
  try {
    const compliance = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC LIMIT 50');
    const training = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC LIMIT 50');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 30');
    const equipment = await pool.query('SELECT * FROM equipment_inspections ORDER BY created_at DESC LIMIT 50');
    const systemPrompt = `You score a lone-worker safety program's audit readiness against OSHA / ISO 45001-style frameworks. Return ONLY JSON:
{ "overall_score_0_100": number, "tier": "green|yellow|orange|red", "category_scores": [{"category": string, "score": number, "gaps": [string]}], "predicted_audit_findings": [string], "remediation_actions": [{"action": string, "priority": "low|medium|high", "effort": "low|medium|high"}], "estimated_remediation_days": number }`;
    const userMessage = `Compliance records: ${JSON.stringify(compliance.rows).slice(0, 3500)}\nTraining records: ${JSON.stringify(training.rows).slice(0, 2500)}\nIncidents: ${JSON.stringify(incidents.rows).slice(0, 2500)}\nEquipment: ${JSON.stringify(equipment.rows).slice(0, 2500)}`;
    const aiResponse = await queryAI(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse);
    await saveAiResult(req.user.id, 'audit-readiness-score', aiResponse, { compliance: compliance.rows.length, training: training.rows.length });
    res.json({ success: true, data: { analysis: aiResponse, parsed } });
  } catch (error) {
    console.error('Audit readiness score error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/burnout-predict
router.post('/burnout-predict', async (req, res) => {
  try {
    const workers = await pool.query('SELECT * FROM workers');
    const shifts = await pool.query('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 200');
    const checkins = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC LIMIT 200');
    const systemPrompt = `You predict burnout risk for lone workers from shift-load, check-in cadence, and incident exposure. Return ONLY JSON:
{ "at_risk_workers": [{"worker_id": any, "worker_name": string, "burnout_risk": "low|medium|high", "drivers": [string], "recommended_interventions": [string]}], "team_load_summary": string, "rebalancing_actions": [string] }`;
    const userMessage = `Workers: ${JSON.stringify(workers.rows).slice(0, 3000)}\nRecent shifts: ${JSON.stringify(shifts.rows).slice(0, 3500)}\nRecent check-ins: ${JSON.stringify(checkins.rows).slice(0, 3500)}`;
    const aiResponse = await queryAI(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse);
    await saveAiResult(req.user.id, 'burnout-predict', aiResponse, { workers: workers.rows.length });
    res.json({ success: true, data: { analysis: aiResponse, parsed } });
  } catch (error) {
    console.error('Burnout predict error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
