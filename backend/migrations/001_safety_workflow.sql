BEGIN;

CREATE TABLE IF NOT EXISTS safety_telemetry (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  worker_ref TEXT NOT NULL,
  device_ref TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  sequence BIGINT NOT NULL CHECK (sequence >= 0),
  recorded_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  consent_reference TEXT NOT NULL,
  UNIQUE (tenant_id, device_ref, sequence),
  UNIQUE (tenant_id, source_ref, payload_hash)
);

CREATE TABLE IF NOT EXISTS safety_cases (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_ref TEXT NOT NULL,
  worker_ref TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'detected' CHECK (stage IN ('detected','triaged','owner_review','action_approved','dispatched','contained','recovered','closed')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  score NUMERIC(7,3) NOT NULL CHECK (score >= 0 AND score <= 100),
  created_by TEXT NOT NULL,
  owner_id TEXT,
  disposition TEXT,
  recovery_evidence JSONB,
  idempotency_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, case_ref),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS safety_case_telemetry (
  case_id BIGINT NOT NULL REFERENCES safety_cases(id),
  telemetry_id BIGINT NOT NULL REFERENCES safety_telemetry(id),
  PRIMARY KEY (case_id, telemetry_id)
);

CREATE TABLE IF NOT EXISTS safety_actions (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES safety_cases(id),
  action_type TEXT NOT NULL,
  disruptive BOOLEAN NOT NULL DEFAULT FALSE,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approval_evidence JSONB,
  dispatch_provider TEXT,
  dispatch_receipt TEXT,
  status TEXT NOT NULL CHECK (status IN ('requested','approved','dispatched','failed','cancelled','reconciled')),
  idempotency_key TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS safety_evaluations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  corpus_version TEXT NOT NULL,
  detector_version TEXT NOT NULL,
  precision_score NUMERIC(7,6),
  recall_score NUMERIC(7,6),
  false_positive_rate NUMERIC(7,6),
  detect_seconds NUMERIC(12,3),
  respond_seconds NUMERIC(12,3),
  adversarial_passed BOOLEAN NOT NULL,
  drift_score NUMERIC(7,6),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_workflow_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id BIGINT NOT NULL REFERENCES safety_cases(id),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_safety_telemetry_worker_time ON safety_telemetry (tenant_id, worker_ref, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_cases_stage_severity ON safety_cases (tenant_id, stage, severity, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_actions_retry ON safety_actions (status, next_attempt_at);

CREATE OR REPLACE FUNCTION reject_safety_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'safety_workflow_audit is append-only';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'safety_workflow_audit_append_only') THEN
    CREATE TRIGGER safety_workflow_audit_append_only
      BEFORE UPDATE OR DELETE ON safety_workflow_audit
      FOR EACH ROW EXECUTE FUNCTION reject_safety_audit_mutation();
  END IF;
END;
$$;

COMMIT;
