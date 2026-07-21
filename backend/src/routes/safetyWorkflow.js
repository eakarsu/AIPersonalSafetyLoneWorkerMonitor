import { Router } from 'express';
import pool from '../db.js';
import { validateTelemetry, classifySignal, validateTransition } from '../domain/safetyPolicy.js';

const router = Router();
const tenantFor = (user) => String(user.tenant_id || user.tenantId || user.id);
const actorFor = (user) => String(user.id);

router.post('/telemetry', async (req, res) => {
  const client = await pool.connect();
  try {
    const { payload_hash, consent_reference, case_ref, idempotency_key, correlation_id } = req.body || {};
    if (!payload_hash || !consent_reference || !case_ref || !idempotency_key || !correlation_id) throw new Error('payload_hash, consent_reference, case_ref, idempotency_key, and correlation_id are required');
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    await client.query('BEGIN');
    const duplicate = await client.query('SELECT * FROM safety_telemetry WHERE tenant_id=$1 AND device_ref=$2 AND sequence=$3', [tenantId, req.body.device_ref, req.body.sequence]);
    if (duplicate.rows.length) {
      if (duplicate.rows[0].payload_hash !== payload_hash) throw Object.assign(new Error('telemetry sequence conflict'), { status: 409 });
      const existing = await client.query('SELECT c.* FROM safety_cases c JOIN safety_case_telemetry l ON l.case_id=c.id WHERE l.telemetry_id=$1', [duplicate.rows[0].id]);
      await client.query('COMMIT');
      return res.json({ telemetry: duplicate.rows[0], safety_case: existing.rows[0] || null });
    }
    const latest = await client.query('SELECT sequence FROM safety_telemetry WHERE tenant_id=$1 AND device_ref=$2 ORDER BY sequence DESC LIMIT 1', [tenantId, req.body.device_ref]);
    const telemetry = validateTelemetry(req.body, latest.rows[0]?.sequence);
    const classification = classifySignal(req.body.signals || {});
    const telemetryResult = await client.query(
      `INSERT INTO safety_telemetry
       (tenant_id, worker_ref, device_ref, source_ref, schema_version, sequence, recorded_at, payload, payload_hash, consent_reference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenantId, telemetry.worker_ref, telemetry.device_ref, telemetry.source_ref, telemetry.schema_version, telemetry.sequence, telemetry.recorded_at, JSON.stringify(req.body.payload || {}), payload_hash, consent_reference]
    );
    const caseResult = await client.query(
      `INSERT INTO safety_cases (tenant_id, case_ref, worker_ref, severity, score, created_by, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING *`,
      [tenantId, case_ref, telemetry.worker_ref, classification.severity, classification.score, actorId, idempotency_key]
    );
    if (!caseResult.rows.length) throw Object.assign(new Error('idempotency key already belongs to another telemetry record'), { status: 409 });
    const safetyCase = caseResult.rows[0];
    await client.query('INSERT INTO safety_case_telemetry (case_id, telemetry_id) VALUES ($1,$2)', [safetyCase.id, telemetryResult.rows[0].id]);
    await client.query(
      `INSERT INTO safety_workflow_audit (tenant_id, case_id, actor_id, action, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'detected','detected',$4,$5)`,
      [tenantId, safetyCase.id, actorId, JSON.stringify({ telemetry_id: telemetryResult.rows[0].id, classification, sequence_gap: telemetry.gap }), correlation_id]
    );
    await client.query('COMMIT');
    res.status(201).json({ telemetry: telemetryResult.rows[0], safety_case: safetyCase, classification });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || (error.code === '23505' ? 409 : 400)).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/cases/:caseRef/transition', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const { to_stage, expected_version, correlation_id, evidence = {} } = req.body || {};
    if (!to_stage || !Number.isInteger(expected_version) || !correlation_id) throw new Error('to_stage, integer expected_version, and correlation_id are required');
    await client.query('BEGIN');
    const priorAudit = await client.query('SELECT case_id FROM safety_workflow_audit WHERE tenant_id=$1 AND correlation_id=$2', [tenantId, correlation_id]);
    if (priorAudit.rows.length) {
      const existing = await client.query('SELECT * FROM safety_cases WHERE id=$1', [priorAudit.rows[0].case_id]);
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }
    const current = await client.query('SELECT * FROM safety_cases WHERE tenant_id=$1 AND case_ref=$2 FOR UPDATE', [tenantId, req.params.caseRef]);
    if (!current.rows.length) throw Object.assign(new Error('safety case not found'), { status: 404 });
    const safetyCase = current.rows[0];
    if (safetyCase.version !== expected_version) throw Object.assign(new Error('stale workflow version'), { status: 409 });
    validateTransition(safetyCase.stage, to_stage, { ...evidence, role: req.user.role, actorId, createdBy: safetyCase.created_by });
    const updated = await client.query('UPDATE safety_cases SET stage=$1, owner_id=COALESCE($2,owner_id), disposition=COALESCE($3,disposition), recovery_evidence=COALESCE($4,recovery_evidence), version=version+1, updated_at=NOW() WHERE id=$5 RETURNING *', [to_stage, evidence.ownerId || null, evidence.disposition || null, evidence.recoveryEvidence ? JSON.stringify(evidence.recoveryEvidence) : null, safetyCase.id]);
    await client.query(
      `INSERT INTO safety_workflow_audit (tenant_id, case_id, actor_id, action, from_stage, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'transition',$4,$5,$6,$7)`,
      [tenantId, safetyCase.id, actorId, safetyCase.stage, to_stage, JSON.stringify(evidence), correlation_id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
