import { Router } from 'express';
import pool from '../db.js';
import { queryAI } from '../services/openrouter.js';

const router = Router();

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

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          workers_analyzed: workers.rows.length,
          incidents_reviewed: incidents.rows.length,
          checkins_reviewed: checkins.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate risk assessment' });
  }
});

// POST /api/ai/incident-analysis
router.post('/incident-analysis', async (req, res) => {
  try {
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC');
    const workers = await pool.query('SELECT * FROM workers');
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC');

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

    const userData = JSON.stringify({
      incidents: incidents.rows,
      workers: workers.rows,
      hazards: hazards.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze the following incident data and provide comprehensive incident analysis:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          incidents_analyzed: incidents.rows.length,
          hazards_reviewed: hazards.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Incident analysis error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate incident analysis' });
  }
});

// POST /api/ai/anomaly-detection
router.post('/anomaly-detection', async (req, res) => {
  try {
    const checkins = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC');
    const workers = await pool.query('SELECT * FROM workers');
    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC');

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

    const userData = JSON.stringify({
      check_ins: checkins.rows,
      workers: workers.rows,
      locations: locations.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze the following data for behavioral anomalies:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          checkins_analyzed: checkins.rows.length,
          workers_monitored: workers.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
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

    const userData = JSON.stringify({
      emergencies: emergencyData,
      workers: workers.rows,
      recent_locations: locations.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please create an optimal emergency response plan based on the following data:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          active_emergencies: emergencyData.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Emergency response error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate emergency response plan' });
  }
});

// POST /api/ai/route-safety
router.post('/route-safety', async (req, res) => {
  try {
    const { worker_id, start_location, end_location } = req.body;

    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC');
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC');
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

    const userData = JSON.stringify({
      worker_id,
      start_location,
      end_location,
      known_locations: locations.rows,
      known_hazards: hazards.rows,
      recent_incidents: incidents.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze route safety based on the following data:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          hazards_considered: hazards.rows.length,
          incidents_reviewed: incidents.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Route safety error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to analyze route safety' });
  }
});

// POST /api/ai/compliance-predictor
router.post('/compliance-predictor', async (req, res) => {
  try {
    const compliance = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC');
    const workers = await pool.query('SELECT * FROM workers');
    const training = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC');

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

    const userData = JSON.stringify({
      compliance_records: compliance.rows,
      workers: workers.rows,
      training_records: training.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze compliance data and predict upcoming issues:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          records_analyzed: compliance.rows.length,
          workers_evaluated: workers.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Compliance predictor error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to predict compliance issues' });
  }
});

// POST /api/ai/shift-optimizer
router.post('/shift-optimizer', async (req, res) => {
  try {
    const shifts = await pool.query('SELECT * FROM shifts ORDER BY start_time DESC');
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

    const userData = JSON.stringify({
      shifts: shifts.rows,
      workers: workers.rows,
      recent_incidents: incidents.rows,
      recent_checkins: checkins.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze and optimize the shift schedule based on the following data:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          shifts_analyzed: shifts.rows.length,
          workers_considered: workers.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Shift optimizer error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to optimize shifts' });
  }
});

// POST /api/ai/hazard-prediction
router.post('/hazard-prediction', async (req, res) => {
  try {
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC');
    const locations = await pool.query('SELECT * FROM locations ORDER BY recorded_at DESC');
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

    const userData = JSON.stringify({
      hazards: hazards.rows,
      incidents: incidents.rows,
      locations: locations.rows,
      workers: workers.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze hazard data and predict potential future hazards:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          hazards_analyzed: hazards.rows.length,
          incidents_correlated: incidents.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Hazard prediction error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to predict hazards' });
  }
});

// POST /api/ai/training-recommender
router.post('/training-recommender', async (req, res) => {
  try {
    const workers = await pool.query('SELECT * FROM workers');
    const training = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC');
    const compliance = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC');

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

    const userData = JSON.stringify({
      workers: workers.rows,
      training_records: training.rows,
      incidents: incidents.rows,
      compliance_records: compliance.rows,
    });

    const aiResponse = await queryAI(systemPrompt, `Please analyze worker data and recommend training:\n\n${userData}`);

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          workers_evaluated: workers.rows.length,
          training_records_reviewed: training.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Training recommender error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate training recommendations' });
  }
});

// POST /api/ai/safety-report
router.post('/safety-report', async (req, res) => {
  try {
    const workers = await pool.query('SELECT * FROM workers');
    const incidents = await pool.query('SELECT * FROM incidents ORDER BY reported_at DESC');
    const checkins = await pool.query('SELECT * FROM check_ins ORDER BY checked_in_at DESC LIMIT 100');
    const emergencies = await pool.query('SELECT * FROM emergencies ORDER BY triggered_at DESC');
    const hazards = await pool.query('SELECT * FROM hazards ORDER BY reported_at DESC');
    const compliance = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC');
    const shifts = await pool.query('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 50');
    const training = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC');
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

    res.json({
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          workers: workers.rows.length,
          incidents: incidents.rows.length,
          emergencies: emergencies.rows.length,
          hazards: hazards.rows.length,
          compliance_records: compliance.rows.length,
          training_records: training.rows.length,
          equipment_inspections: equipment.rows.length,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Safety report error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate safety report' });
  }
});

export default router;
