# Lone Worker Safety Monitor operations

## Safe local lifecycle

1. Copy `.env.example` to `.env` and set a unique JWT secret of at least 32 characters plus the database URL.
2. Install backend and frontend dependencies explicitly during provisioning.
3. Apply reviewed migrations explicitly with `./scripts/migrate.sh`.
4. Start with `./start.sh`. The launcher refuses occupied ports and missing dependencies; it never installs packages, creates databases, seeds data, applies migrations, or terminates unrelated processes.

Startup performs connection/schema checks only and fails closed when required configuration or durable schema is missing.

## Narrow workflow

`POST /api/safety-workflows/telemetry` enforces monotonic telemetry, deterministic severity classification, durable cases, and append-only evidence; the transition endpoint enforces approval, dispatch, and recovery gates.

Public registration is fixed to the worker role. Disruptive actions require independent safety authority; dispatch and closure require receipts and recovery evidence. Every write is tenant-scoped, idempotency/correlation keyed, version checked, and appended to a database audit table protected against update/delete.

## External boundaries

Generated `/api/cf-*` and `/api/gap-*` routes are quarantined where present. Trusted device enrollment, emergency-dispatch credentials/contracts, notification providers, field validation, representative adversarial corpora, and regulated operational approval remain deployment gates. Provider failures must remain explicit and must not be replaced with fabricated success receipts.

## Validation

Run `node --test backend/test/safetyPolicy.test.js`, syntax-check changed JavaScript with `node --check`, and run `bash -n start.sh scripts/migrate.sh`. CI performs these dependency-free checks and verifies that migrations are transactional and contain no table-drop, truncate, or row-delete statements.

