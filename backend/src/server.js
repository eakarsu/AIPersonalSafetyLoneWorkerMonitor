import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

import pool from './db.js';
import authRoutes from './routes/auth.js';
import workerRoutes from './routes/workers.js';
import incidentRoutes from './routes/incidents.js';
import checkinRoutes from './routes/checkins.js';
import emergencyRoutes from './routes/emergencies.js';
import locationRoutes from './routes/locations.js';
import complianceRoutes from './routes/compliance.js';
import shiftRoutes from './routes/shifts.js';
import hazardRoutes from './routes/hazards.js';
import trainingRoutes from './routes/training.js';
import equipmentRoutes from './routes/equipment.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Test DB connection and start server
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.log('Starting server without database connection...');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (database not connected)`);
    });
  });

export default app;
