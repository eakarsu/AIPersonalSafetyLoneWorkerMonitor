import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

import pool from './db.js';
import authRoutes from './routes/auth.js';
import workerRoutes from './routes/workers.js';
import incidentRoutes from './routes/incidents.js';
import checkinRoutes, { setBroadcastCheckin } from './routes/checkins.js';
import emergencyRoutes from './routes/emergencies.js';
import locationRoutes from './routes/locations.js';
import complianceRoutes from './routes/compliance.js';
import shiftRoutes from './routes/shifts.js';
import hazardRoutes from './routes/hazards.js';
import trainingRoutes from './routes/training.js';
import equipmentRoutes from './routes/equipment.js';
import aiRoutes from './routes/ai.js';
import heartbeatRoutes from './routes/heartbeat.js';
import sosRoutes from './routes/sos.js';
import geofenceRoutes from './routes/geofences.js';
import extensionsRoutes from './routes/extensions.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', heartbeatRoutes);
app.use('/api', sosRoutes);
app.use('/api/geofences', geofenceRoutes);
// Apply pass 5 — backlog extensions (wearable, dispatch, biometric, i18n, bodycam, IoT)
app.use('/api/extensions', extensionsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// WebSocket server for real-time check-in broadcasts
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ port: WS_PORT });

const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`WebSocket client connected (${wsClients.size} total)`);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`WebSocket client disconnected (${wsClients.size} remaining)`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    wsClients.delete(ws);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to SafeGuard AI real-time feed' }));
});

function broadcastToAll(payload) {
  const message = JSON.stringify(payload);
  for (const client of wsClients) {
    try {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    } catch (err) {
      console.error('Broadcast error:', err.message);
    }
  }
}

// Register broadcast function with checkins route
setBroadcastCheckin(broadcastToAll);

// Start overdue check polling every 5 minutes
setInterval(async () => {
  try {
    const overdueResult = await pool.query(`
      SELECT w.id, w.name, w.department, w.status,
             EXTRACT(EPOCH FROM (NOW() - COALESCE(w.last_check_in, w.created_at))) / 60 AS minutes_since_checkin
      FROM workers w
      WHERE w.status != 'offline'
        AND (w.last_check_in IS NULL OR w.last_check_in < NOW() - INTERVAL '60 minutes')
    `);
    if (overdueResult.rows.length > 0) {
      broadcastToAll({ type: 'overdue_poll', data: overdueResult.rows, count: overdueResult.rows.length });
    }
  } catch (err) {
    console.error('Overdue poll error:', err.message);
  }
}, 5 * 60 * 1000);

// Test DB connection and start server
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Database connected successfully');
    httpServer.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT}`);
      console.log(`WebSocket server running on port ${WS_PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.log('Starting server without database connection...');
    httpServer.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT} (database not connected)`);
      console.log(`WebSocket server running on port ${WS_PORT}`);
    });
  });

export default app;


// === Custom Feature Mounts (batch_06) ===
import('./routes/customFeat01_AgenticSafetyOrchestration.js').then(m => app.use('/api/cf-agentic-safety-orchestration', m.default));
import('./routes/customFeat02_ComputerVisionIncidentDetection.js').then(m => app.use('/api/cf-computer-vision-incident-detection', m.default));
import('./routes/customFeat03_BehavioralRiskProfiling.js').then(m => app.use('/api/cf-behavioral-risk-profiling', m.default));
import('./routes/customFeat04_EnvironmentalHazardSensing.js').then(m => app.use('/api/cf-environmental-hazard-sensing', m.default));
import('./routes/customFeat05_PeerSafetyNetworks.js').then(m => app.use('/api/cf-peer-safety-networks', m.default));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-equipment-without-equipment', require('./routes/gapFeat_equipment_without_equipment'));
app.use('/api/gap-compliance-without-audit', require('./routes/gapFeat_compliance_without_audit'));
app.use('/api/gap-shifts-without-burnout', require('./routes/gapFeat_shifts_without_burnout'));
app.use('/api/gap-no-wearable-device-integration-smartwatch-beacon', require('./routes/gapFeat_no_wearable_device_integration_smartwatch_beacon'));
app.use('/api/gap-no-integration-with-emergency-services-911-auto', require('./routes/gapFeat_no_integration_with_emergency_services_911_auto'));
app.use('/api/gap-no-real', require('./routes/gapFeat_no_real'));
app.use('/api/gap-limited-multi', require('./routes/gapFeat_limited_multi'));
app.use('/api/gap-no-notifications-module-dedicated-route-relies-on-', require('./routes/gapFeat_no_notifications_module_dedicated_route_relies_on_'));
app.use('/api/gap-no-webhooks-for-external-dispatch-systems', require('./routes/gapFeat_no_webhooks_for_external_dispatch_systems'));
app.use('/api/gap-no-native-mobile-app-despite-field', require('./routes/gapFeat_no_native_mobile_app_despite_field'));
