import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTelemetry, classifySignal, validateTransition } from '../src/domain/safetyPolicy.js';

const telemetry = { worker_ref: 'worker-1', device_ref: 'device-1', source_ref: 'source-1', schema_version: 'v1', sequence: 7, recorded_at: '2026-07-18T12:00:00Z' };

test('normalizes monotonic telemetry and reports sequence gaps', () => {
  const result = validateTelemetry(telemetry, 4);
  assert.equal(result.gap, 2);
  assert.equal(result.recorded_at, '2026-07-18T12:00:00.000Z');
});

test('rejects replayed telemetry', () => {
  assert.throws(() => validateTelemetry(telemetry, 7), /replayed telemetry/);
});

test('classifies critical signals deterministically but retains manual review', () => {
  assert.deepEqual(classifySignal({ sos: true, fall_detected: true, missed_checkin_minutes: 10, hazard_level: 2 }), { score: 100, severity: 'critical', manual_review: true });
});

test('rejects out-of-range hazard signals', () => {
  assert.throws(() => classifySignal({ hazard_level: 8 }), /invalid safety signals/);
});

test('requires independent approval for disruptive safety action', () => {
  assert.throws(() => validateTransition('owner_review', 'action_approved', { role: 'safety_operator', actorId: 'u1', createdBy: 'u1', evidenceCount: 1 }), /independent/);
  assert.equal(validateTransition('owner_review', 'action_approved', { role: 'safety_operator', actorId: 'u2', createdBy: 'u1', evidenceCount: 1 }), true);
});

test('dispatch and closure fail closed without receipts', () => {
  assert.throws(() => validateTransition('action_approved', 'dispatched', { role: 'dispatcher' }), /dispatch receipt/);
  assert.throws(() => validateTransition('recovered', 'closed', { role: 'safety_operator' }), /recovery evidence/);
});
