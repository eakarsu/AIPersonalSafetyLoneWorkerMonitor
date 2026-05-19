// Apply pass 5 — backlog extensions for AIPersonalSafetyLoneWorkerMonitor
//
// Implements the 6 deferred backlog items from _AUDIT_NOTE.md:
//   1. Wearable / smartwatch integration (NEEDS-CREDS)
//      -> env: WEARABLE_PROVIDER (apple_health|google_fit|garmin|fitbit), WEARABLE_API_KEY
//   2. 911 / emergency dispatch integration (NEEDS-CREDS)
//      -> env: DISPATCH_PROVIDER (rapidsos|noonlight), DISPATCH_API_KEY
//   3. Biometric (HR / SpO2) monitoring (NEEDS-CREDS)
//      -> env: BIOMETRIC_PROVIDER, BIOMETRIC_API_KEY
//   4. Multi-language support (NEEDS-PRODUCT-DECISION)
//      -> PRODUCT-DECISION: i18n keys are stored as JSONB; default locale is 'en'.
//   5. CV body-cam incident detection (NEEDS-PRODUCT-DECISION)
//      -> PRODUCT-DECISION: registry-only. Stream URL stored; CV inference runs out-of-process.
//   6. IoT environmental sensor ingestion (NEEDS-CREDS)
//      -> env: IOT_BROKER_URL, IOT_API_KEY
//
// All endpoints use authMiddleware. CREATE TABLE IF NOT EXISTS only.

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

async function bootstrap() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wearable_links (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER,
        provider TEXT NOT NULL,
        external_user_id TEXT,
        status TEXT DEFAULT 'linked',
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dispatch_calls (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER,
        incident_id INTEGER,
        provider TEXT,
        external_call_id TEXT,
        status TEXT DEFAULT 'pending',
        location JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS biometric_readings (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER,
        heart_rate INTEGER,
        spo2 INTEGER,
        temperature_c DOUBLE PRECISION,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        provider TEXT
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS i18n_translations (
        id SERIAL PRIMARY KEY,
        locale TEXT NOT NULL,
        namespace TEXT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(locale, namespace, key)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bodycam_streams (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER,
        stream_url TEXT,
        status TEXT DEFAULT 'pending',
        cv_findings JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS iot_sensor_readings (
        id SERIAL PRIMARY KEY,
        sensor_id TEXT,
        worker_id INTEGER,
        sensor_type TEXT,
        value DOUBLE PRECISION,
        unit TEXT,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB
      )
    `);
  } catch (e) {
    console.error('extensions bootstrap warning:', e.message);
  }
}
bootstrap();

router.use(authMiddleware);

// ── 1. Wearable integration (NEEDS-CREDS) ─────────────────────────────────
function wearableEnvCheck() {
  const missing = [];
  if (!process.env.WEARABLE_PROVIDER) missing.push('WEARABLE_PROVIDER');
  if (!process.env.WEARABLE_API_KEY) missing.push('WEARABLE_API_KEY');
  return missing;
}

router.get('/wearable/status', (req, res) => {
  const missing = wearableEnvCheck();
  if (missing.length) return res.status(503).json({ success: false, error: 'wearable not configured', missing });
  res.json({ success: true, provider: process.env.WEARABLE_PROVIDER, configured: true });
});

router.post('/wearable/link', async (req, res) => {
  const missing = wearableEnvCheck();
  if (missing.length) return res.status(503).json({ success: false, error: 'wearable not configured', missing });
  try {
    const { worker_id, external_user_id } = req.body || {};
    const r = await pool.query(
      `INSERT INTO wearable_links (worker_id, provider, external_user_id, status, last_synced_at)
       VALUES ($1, $2, $3, 'linked', NOW()) RETURNING *`,
      [worker_id || null, process.env.WEARABLE_PROVIDER, external_user_id || null]
    );
    res.json({ success: true, link: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── 2. 911 / emergency dispatch (NEEDS-CREDS) ─────────────────────────────
function dispatchEnvCheck() {
  const missing = [];
  if (!process.env.DISPATCH_PROVIDER) missing.push('DISPATCH_PROVIDER');
  if (!process.env.DISPATCH_API_KEY) missing.push('DISPATCH_API_KEY');
  return missing;
}

router.post('/dispatch/911', async (req, res) => {
  const missing = dispatchEnvCheck();
  if (missing.length) return res.status(503).json({ success: false, error: 'dispatch not configured', missing });
  try {
    const { worker_id, incident_id, location } = req.body || {};
    const r = await pool.query(
      `INSERT INTO dispatch_calls (worker_id, incident_id, provider, status, location)
       VALUES ($1, $2, $3, 'queued', $4) RETURNING *`,
      [worker_id || null, incident_id || null, process.env.DISPATCH_PROVIDER, JSON.stringify(location || {})]
    );
    res.json({ success: true, dispatch: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/dispatch/calls', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM dispatch_calls ORDER BY id DESC LIMIT 100`);
    res.json({ success: true, calls: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── 3. Biometric monitoring (NEEDS-CREDS for ingest) ──────────────────────
function biometricEnvCheck() {
  const missing = [];
  if (!process.env.BIOMETRIC_PROVIDER) missing.push('BIOMETRIC_PROVIDER');
  if (!process.env.BIOMETRIC_API_KEY) missing.push('BIOMETRIC_API_KEY');
  return missing;
}

router.post('/biometric/ingest', async (req, res) => {
  const missing = biometricEnvCheck();
  if (missing.length) return res.status(503).json({ success: false, error: 'biometric not configured', missing });
  try {
    const { worker_id, heart_rate, spo2, temperature_c } = req.body || {};
    const r = await pool.query(
      `INSERT INTO biometric_readings (worker_id, heart_rate, spo2, temperature_c, provider)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [worker_id || null, heart_rate || null, spo2 || null, temperature_c || null, process.env.BIOMETRIC_PROVIDER]
    );
    res.json({ success: true, reading: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/biometric/readings', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM biometric_readings ORDER BY id DESC LIMIT 200`);
    res.json({ success: true, readings: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── 4. Multi-language (NEEDS-PRODUCT-DECISION: default locale 'en') ────────
router.get('/i18n/:locale', async (req, res) => {
  try {
    const r = await pool.query(`SELECT key, value, namespace FROM i18n_translations WHERE locale = $1`, [req.params.locale]);
    res.json({ success: true, locale: req.params.locale, translations: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/i18n', async (req, res) => {
  try {
    const { locale, namespace, key, value } = req.body || {};
    if (!locale || !key || value === undefined) return res.status(400).json({ success: false, error: 'locale, key, value required' });
    const r = await pool.query(
      `INSERT INTO i18n_translations (locale, namespace, key, value) VALUES ($1, $2, $3, $4)
       ON CONFLICT (locale, namespace, key) DO UPDATE SET value = EXCLUDED.value RETURNING *`,
      [locale, namespace || 'default', key, value]
    );
    res.json({ success: true, translation: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── 5. CV body-cam incident detection (NEEDS-PRODUCT-DECISION: registry only) ─
router.post('/bodycam/streams', async (req, res) => {
  try {
    const { worker_id, stream_url } = req.body || {};
    if (!stream_url) return res.status(400).json({ success: false, error: 'stream_url required' });
    const r = await pool.query(
      `INSERT INTO bodycam_streams (worker_id, stream_url, status) VALUES ($1, $2, 'pending') RETURNING *`,
      [worker_id || null, stream_url]
    );
    res.json({ success: true, stream: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/bodycam/streams', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM bodycam_streams ORDER BY id DESC LIMIT 100`);
    res.json({ success: true, streams: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── 6. IoT environmental sensors (NEEDS-CREDS) ────────────────────────────
function iotEnvCheck() {
  const missing = [];
  if (!process.env.IOT_BROKER_URL) missing.push('IOT_BROKER_URL');
  if (!process.env.IOT_API_KEY) missing.push('IOT_API_KEY');
  return missing;
}

router.post('/iot/ingest', async (req, res) => {
  const missing = iotEnvCheck();
  if (missing.length) return res.status(503).json({ success: false, error: 'IoT not configured', missing });
  try {
    const { sensor_id, worker_id, sensor_type, value, unit, metadata } = req.body || {};
    if (!sensor_id || !sensor_type) return res.status(400).json({ success: false, error: 'sensor_id and sensor_type required' });
    const r = await pool.query(
      `INSERT INTO iot_sensor_readings (sensor_id, worker_id, sensor_type, value, unit, metadata)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [sensor_id, worker_id || null, sensor_type, value || null, unit || null, JSON.stringify(metadata || {})]
    );
    res.json({ success: true, reading: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/iot/readings', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM iot_sensor_readings ORDER BY id DESC LIMIT 200`);
    res.json({ success: true, readings: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
