import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { databaseUrl } from './config/security.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl() });

async function seed() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') throw new Error('set ALLOW_DESTRUCTIVE_SEED=true to run the destructive demo seed explicitly');
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL;
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedAdminEmail || !seedAdminPassword) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  const client = await pool.connect();

  try {
    console.log('Starting database seed...');

    // Drop tables in reverse dependency order
    await client.query(`
      DROP TABLE IF EXISTS ai_results CASCADE;
      DROP TABLE IF EXISTS emergency_events CASCADE;
      DROP TABLE IF EXISTS escalation_chains CASCADE;
      DROP TABLE IF EXISTS device_heartbeats CASCADE;
      DROP TABLE IF EXISTS geofences CASCADE;
      DROP TABLE IF EXISTS equipment_inspections CASCADE;
      DROP TABLE IF EXISTS training_records CASCADE;
      DROP TABLE IF EXISTS hazards CASCADE;
      DROP TABLE IF EXISTS shifts CASCADE;
      DROP TABLE IF EXISTS compliance_records CASCADE;
      DROP TABLE IF EXISTS locations CASCADE;
      DROP TABLE IF EXISTS emergencies CASCADE;
      DROP TABLE IF EXISTS check_ins CASCADE;
      DROP TABLE IF EXISTS incidents CASCADE;
      DROP TABLE IF EXISTS workers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('Dropped existing tables');

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create workers table
    await client.query(`
      CREATE TABLE workers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        department VARCHAR(100),
        role VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','inactive','emergency','offline')),
        risk_level VARCHAR(50) DEFAULT 'low',
        last_check_in TIMESTAMP,
        location VARCHAR(255),
        check_in_interval_minutes INTEGER DEFAULT 60,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create incidents table
    await client.query(`
      CREATE TABLE incidents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        severity VARCHAR(50) DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
        location VARCHAR(255),
        reported_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create check_ins table
    await client.query(`
      CREATE TABLE check_ins (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'safe' CHECK (status IN ('safe','help_needed','no_response')),
        location VARCHAR(255),
        notes TEXT,
        checked_in_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create emergencies table
    await client.query(`
      CREATE TABLE emergencies (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'sos' CHECK (type IN ('sos','medical','fire','security','other')),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','responding','resolved')),
        description TEXT,
        location VARCHAR(255),
        priority VARCHAR(50) DEFAULT 'high' CHECK (priority IN ('low','medium','high','critical')),
        triggered_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `);

    // Create locations table
    await client.query(`
      CREATE TABLE locations (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        address VARCHAR(255),
        zone VARCHAR(100),
        risk_level VARCHAR(50) DEFAULT 'low',
        recorded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create compliance_records table
    await client.query(`
      CREATE TABLE compliance_records (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        requirement VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('compliant','non_compliant','pending','expired')),
        due_date DATE,
        completed_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create shifts table
    await client.query(`
      CREATE TABLE shifts (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        location VARCHAR(255),
        type VARCHAR(50) DEFAULT 'day' CHECK (type IN ('day','night','swing','overtime')),
        status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create hazards table
    await client.query(`
      CREATE TABLE hazards (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        severity VARCHAR(50) DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
        status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified','assessed','mitigated','closed')),
        reported_by INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        reported_at TIMESTAMP DEFAULT NOW(),
        mitigated_at TIMESTAMP
      )
    `);

    // Create training_records table
    await client.query(`
      CREATE TABLE training_records (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        course_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','expired')),
        score INTEGER,
        completed_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create equipment_inspections table
    await client.query(`
      CREATE TABLE equipment_inspections (
        id SERIAL PRIMARY KEY,
        equipment_name VARCHAR(255) NOT NULL,
        equipment_type VARCHAR(100),
        inspector_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'passed' CHECK (status IN ('passed','failed','needs_repair','retired')),
        last_inspection TIMESTAMP,
        next_inspection TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create device_heartbeats table
    await client.query(`
      CREATE TABLE device_heartbeats (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        lat DECIMAL(10, 7),
        lng DECIMAL(10, 7),
        battery_pct INTEGER,
        recorded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create escalation_chains table
    await client.query(`
      CREATE TABLE escalation_chains (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        contact_name VARCHAR(100),
        contact_phone VARCHAR(20),
        contact_email VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create geofences table
    await client.query(`
      CREATE TABLE geofences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        zone_type VARCHAR(100),
        boundary JSONB,
        risk_level VARCHAR(50) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create emergency_events table (detailed emergency log)
    await client.query(`
      CREATE TABLE emergency_events (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        emergency_id INTEGER REFERENCES emergencies(id) ON DELETE SET NULL,
        location VARCHAR(255),
        type VARCHAR(50) DEFAULT 'sos',
        description TEXT,
        response_plan TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create ai_results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        endpoint VARCHAR(100),
        result TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('All tables created');

    // Seed default admin user
    const hashedPassword = await bcrypt.hash(seedAdminPassword, 10);
    await client.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)`,
      ['Admin User', seedAdminEmail, hashedPassword, 'admin']
    );
    console.log('Default admin user created');

    // Seed workers (15)
    await client.query(`
      INSERT INTO workers (name, email, phone, department, role, status, risk_level, last_check_in, location) VALUES
      ('James Wilson', 'james.wilson@company.com', '+1-555-0101', 'Field Operations', 'Field Technician', 'active', 'low', NOW() - INTERVAL '30 minutes', 'North Industrial Zone, Building A'),
      ('Sarah Chen', 'sarah.chen@company.com', '+1-555-0102', 'Maintenance', 'Senior Maintenance Engineer', 'active', 'medium', NOW() - INTERVAL '1 hour', 'Power Plant Section 3'),
      ('Michael Brown', 'michael.brown@company.com', '+1-555-0103', 'Security', 'Night Security Officer', 'offline', 'low', NOW() - INTERVAL '8 hours', 'Perimeter Gate B'),
      ('Emily Rodriguez', 'emily.rodriguez@company.com', '+1-555-0104', 'Field Operations', 'Pipeline Inspector', 'active', 'high', NOW() - INTERVAL '45 minutes', 'Remote Pipeline Station 7'),
      ('David Kim', 'david.kim@company.com', '+1-555-0105', 'Electrical', 'High Voltage Electrician', 'active', 'critical', NOW() - INTERVAL '15 minutes', 'Substation Delta'),
      ('Lisa Thompson', 'lisa.thompson@company.com', '+1-555-0106', 'Environmental', 'Environmental Compliance Officer', 'active', 'low', NOW() - INTERVAL '2 hours', 'Chemical Storage Facility'),
      ('Robert Martinez', 'robert.martinez@company.com', '+1-555-0107', 'Construction', 'Crane Operator', 'active', 'high', NOW() - INTERVAL '20 minutes', 'Construction Site C'),
      ('Amanda Foster', 'amanda.foster@company.com', '+1-555-0108', 'Field Operations', 'Gas Line Inspector', 'emergency', 'critical', NOW() - INTERVAL '5 minutes', 'Gas Distribution Hub East'),
      ('Thomas Anderson', 'thomas.anderson@company.com', '+1-555-0109', 'Maintenance', 'HVAC Specialist', 'active', 'low', NOW() - INTERVAL '3 hours', 'Office Complex B, Roof Level'),
      ('Jessica Park', 'jessica.park@company.com', '+1-555-0110', 'Field Operations', 'Telecommunications Technician', 'active', 'medium', NOW() - INTERVAL '1 hour', 'Cell Tower 14, Rural Highway'),
      ('Christopher Lee', 'christopher.lee@company.com', '+1-555-0111', 'Mining', 'Underground Mining Engineer', 'active', 'critical', NOW() - INTERVAL '25 minutes', 'Mine Shaft B, Level 3'),
      ('Maria Gonzalez', 'maria.gonzalez@company.com', '+1-555-0112', 'Healthcare', 'Remote Healthcare Worker', 'active', 'medium', NOW() - INTERVAL '50 minutes', 'Rural Clinic Station 5'),
      ('Daniel Wright', 'daniel.wright@company.com', '+1-555-0113', 'Forestry', 'Forest Ranger', 'offline', 'high', NOW() - INTERVAL '6 hours', 'North Ridge Fire Watch Tower'),
      ('Jennifer Taylor', 'jennifer.taylor@company.com', '+1-555-0114', 'Utilities', 'Water Treatment Operator', 'active', 'medium', NOW() - INTERVAL '40 minutes', 'Water Treatment Plant 2'),
      ('Kevin Hughes', 'kevin.hughes@company.com', '+1-555-0115', 'Transport', 'Long Haul Driver', 'active', 'medium', NOW() - INTERVAL '35 minutes', 'Interstate 90, Mile Marker 245')
    `);
    console.log('Workers seeded');

    // Seed incidents (15)
    await client.query(`
      INSERT INTO incidents (title, description, worker_id, severity, status, location, reported_at, resolved_at) VALUES
      ('Slip and Fall at Pipeline Station', 'Worker slipped on oil-covered surface near valve manifold. Minor knee injury sustained.', 4, 'medium', 'resolved', 'Remote Pipeline Station 7', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
      ('Electrical Arc Flash Near Miss', 'Near miss event during breaker maintenance. PPE prevented injury. Procedure review needed.', 5, 'critical', 'investigating', 'Substation Delta', NOW() - INTERVAL '2 days', NULL),
      ('Chemical Spill in Storage Area', 'Minor chemical spill detected during transfer operations. Area evacuated per protocol.', 6, 'high', 'resolved', 'Chemical Storage Facility', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
      ('Crane Cable Fraying Detected', 'Routine inspection revealed fraying on main hoist cable. Crane taken out of service.', 7, 'high', 'investigating', 'Construction Site C', NOW() - INTERVAL '1 day', NULL),
      ('Gas Leak Detected at Distribution Hub', 'Automated sensors detected elevated gas levels. Worker reported unusual odor.', 8, 'critical', 'open', 'Gas Distribution Hub East', NOW() - INTERVAL '2 hours', NULL),
      ('Heat Exhaustion on Cell Tower', 'Technician reported dizziness during tower climb in high temperature. Descended safely.', 10, 'medium', 'resolved', 'Cell Tower 14, Rural Highway', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
      ('Rock Fall in Mine Shaft', 'Small rock fall reported in section B3. Area cordoned off for geological assessment.', 11, 'critical', 'investigating', 'Mine Shaft B, Level 3', NOW() - INTERVAL '3 days', NULL),
      ('Vehicle Breakdown in Remote Area', 'Company vehicle experienced engine failure on rural road. Worker stranded for 2 hours.', 12, 'medium', 'resolved', 'Rural Highway 45, km 120', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
      ('Wildlife Encounter at Watch Tower', 'Ranger reported aggressive bear activity near tower base. Shelter-in-place activated.', 13, 'high', 'resolved', 'North Ridge Fire Watch Tower', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
      ('Equipment Malfunction at Water Plant', 'Chlorine dosing pump malfunction. Manual override engaged. No contamination risk.', 14, 'medium', 'closed', 'Water Treatment Plant 2', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),
      ('Tire Blowout on Highway', 'Long haul driver experienced tire blowout at highway speed. Safely pulled over.', 15, 'high', 'resolved', 'Interstate 90, Mile Marker 200', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
      ('Scaffolding Instability Reported', 'Worker noticed swaying in temporary scaffolding at level 4. Area evacuated.', 7, 'high', 'resolved', 'Construction Site C', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
      ('Communication Equipment Failure', 'Two-way radio and satellite phone both failed simultaneously during remote assignment.', 4, 'high', 'closed', 'Remote Pipeline Station 7', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
      ('Confined Space Oxygen Level Drop', 'Oxygen monitor alarm triggered during tank entry. Worker evacuated within 30 seconds.', 2, 'critical', 'resolved', 'Power Plant Section 3', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
      ('Unauthorized Access Attempt', 'Security detected unauthorized personnel attempting to enter restricted area.', 3, 'medium', 'closed', 'Perimeter Gate B', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
    `);
    console.log('Incidents seeded');

    // Seed check_ins (15)
    await client.query(`
      INSERT INTO check_ins (worker_id, status, location, notes, checked_in_at) VALUES
      (1, 'safe', 'North Industrial Zone, Building A', 'All clear. Completing routine inspection.', NOW() - INTERVAL '30 minutes'),
      (2, 'safe', 'Power Plant Section 3', 'Maintenance on turbine 4 proceeding on schedule.', NOW() - INTERVAL '1 hour'),
      (4, 'safe', 'Remote Pipeline Station 7', 'Pipeline pressure readings normal. Moving to station 8.', NOW() - INTERVAL '45 minutes'),
      (5, 'safe', 'Substation Delta', 'Transformer testing complete. Starting breaker inspections.', NOW() - INTERVAL '15 minutes'),
      (7, 'safe', 'Construction Site C', 'Morning safety briefing completed. Starting crane operations.', NOW() - INTERVAL '20 minutes'),
      (8, 'help_needed', 'Gas Distribution Hub East', 'Detecting unusual gas odor near valve cluster 3. Requesting backup.', NOW() - INTERVAL '5 minutes'),
      (9, 'safe', 'Office Complex B, Roof Level', 'HVAC unit replacement going well. Expect completion by 3 PM.', NOW() - INTERVAL '3 hours'),
      (10, 'safe', 'Cell Tower 14, Rural Highway', 'Antenna alignment adjusted. Signal strength improved 15%.', NOW() - INTERVAL '1 hour'),
      (11, 'safe', 'Mine Shaft B, Level 3', 'Air quality readings normal. Proceeding with geological survey.', NOW() - INTERVAL '25 minutes'),
      (12, 'safe', 'Rural Clinic Station 5', 'Patient consultations on schedule. Road conditions fair.', NOW() - INTERVAL '50 minutes'),
      (14, 'safe', 'Water Treatment Plant 2', 'Water quality tests within normal parameters.', NOW() - INTERVAL '40 minutes'),
      (15, 'safe', 'Interstate 90, Mile Marker 245', 'On schedule. Next rest stop in 45 minutes.', NOW() - INTERVAL '35 minutes'),
      (1, 'safe', 'North Industrial Zone, Building A', 'Completed morning rounds. No issues.', NOW() - INTERVAL '4 hours'),
      (3, 'no_response', 'Perimeter Gate B', NULL, NOW() - INTERVAL '8 hours'),
      (13, 'no_response', 'North Ridge Fire Watch Tower', NULL, NOW() - INTERVAL '6 hours')
    `);
    console.log('Check-ins seeded');

    // Seed emergencies (15)
    await client.query(`
      INSERT INTO emergencies (worker_id, type, status, description, location, priority, triggered_at, resolved_at) VALUES
      (8, 'sos', 'active', 'Gas leak detected at distribution hub. Worker reporting difficulty breathing.', 'Gas Distribution Hub East', 'critical', NOW() - INTERVAL '5 minutes', NULL),
      (11, 'sos', 'responding', 'Minor rock fall reported. Worker is safe but trapped in section B3.', 'Mine Shaft B, Level 3', 'critical', NOW() - INTERVAL '30 minutes', NULL),
      (5, 'security', 'resolved', 'Unauthorized vehicle approached substation. Worker felt threatened.', 'Substation Delta', 'high', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
      (13, 'sos', 'responding', 'No response from ranger for 6 hours. Last known location: watch tower.', 'North Ridge Fire Watch Tower', 'high', NOW() - INTERVAL '1 hour', NULL),
      (4, 'medical', 'resolved', 'Worker twisted ankle on uneven terrain near pipeline. Ambulance dispatched.', 'Remote Pipeline Station 7', 'medium', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
      (7, 'sos', 'resolved', 'Worker reported unstable scaffolding. Self-evacuated to ground level.', 'Construction Site C', 'high', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
      (10, 'medical', 'resolved', 'Heat exhaustion symptoms during tower maintenance. Worker descended safely.', 'Cell Tower 14, Rural Highway', 'medium', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
      (15, 'sos', 'resolved', 'Tire blowout at highway speed. Driver safely stopped. Requesting roadside assistance.', 'Interstate 90, Mile Marker 200', 'high', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
      (2, 'fire', 'resolved', 'Small electrical fire in control panel. Extinguished with fire suppressor. No injuries.', 'Power Plant Section 3', 'critical', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
      (12, 'medical', 'resolved', 'Patient had allergic reaction. Healthcare worker administered epinephrine.', 'Rural Clinic Station 5', 'high', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
      (6, 'other', 'resolved', 'Chemical spill containment activated. Worker evacuated per protocol.', 'Chemical Storage Facility', 'high', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
      (3, 'security', 'resolved', 'Attempted unauthorized entry detected. Security protocol enacted.', 'Perimeter Gate B', 'medium', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
      (1, 'medical', 'resolved', 'Worker reported chest tightness after exposure to dust. Precautionary medical check.', 'North Industrial Zone, Building A', 'medium', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
      (9, 'sos', 'resolved', 'Worker locked on roof level after door jammed. Rescue team dispatched.', 'Office Complex B, Roof Level', 'medium', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
      (14, 'other', 'resolved', 'Chlorine gas alarm triggered. Worker evacuated. False alarm confirmed.', 'Water Treatment Plant 2', 'high', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days')
    `);
    console.log('Emergencies seeded');

    // Seed locations (15)
    await client.query(`
      INSERT INTO locations (worker_id, latitude, longitude, address, zone, risk_level, recorded_at) VALUES
      (1, 40.7128000, -74.0060000, 'North Industrial Zone, Building A', 'Industrial', 'medium', NOW() - INTERVAL '30 minutes'),
      (2, 40.7580000, -73.9855000, 'Power Plant Section 3', 'Energy', 'high', NOW() - INTERVAL '1 hour'),
      (3, 40.6892000, -74.0445000, 'Perimeter Gate B', 'Security', 'low', NOW() - INTERVAL '8 hours'),
      (4, 41.8781000, -87.6298000, 'Remote Pipeline Station 7', 'Remote', 'high', NOW() - INTERVAL '45 minutes'),
      (5, 34.0522000, -118.2437000, 'Substation Delta', 'Electrical', 'critical', NOW() - INTERVAL '15 minutes'),
      (6, 37.7749000, -122.4194000, 'Chemical Storage Facility', 'Hazmat', 'high', NOW() - INTERVAL '2 hours'),
      (7, 47.6062000, -122.3321000, 'Construction Site C', 'Construction', 'high', NOW() - INTERVAL '20 minutes'),
      (8, 29.7604000, -95.3698000, 'Gas Distribution Hub East', 'Energy', 'critical', NOW() - INTERVAL '5 minutes'),
      (9, 42.3601000, -71.0589000, 'Office Complex B, Roof Level', 'Commercial', 'medium', NOW() - INTERVAL '3 hours'),
      (10, 33.4484000, -112.0740000, 'Cell Tower 14, Rural Highway', 'Remote', 'medium', NOW() - INTERVAL '1 hour'),
      (11, 39.7392000, -104.9903000, 'Mine Shaft B, Level 3', 'Mining', 'critical', NOW() - INTERVAL '25 minutes'),
      (12, 35.2271000, -80.8431000, 'Rural Clinic Station 5', 'Healthcare', 'low', NOW() - INTERVAL '50 minutes'),
      (13, 45.5152000, -122.6784000, 'North Ridge Fire Watch Tower', 'Forestry', 'high', NOW() - INTERVAL '6 hours'),
      (14, 32.7157000, -117.1611000, 'Water Treatment Plant 2', 'Utilities', 'medium', NOW() - INTERVAL '40 minutes'),
      (15, 43.0389000, -87.9065000, 'Interstate 90, Mile Marker 245', 'Transport', 'medium', NOW() - INTERVAL '35 minutes')
    `);
    console.log('Locations seeded');

    // Seed compliance_records (15)
    await client.query(`
      INSERT INTO compliance_records (worker_id, requirement, status, due_date, completed_date, notes) VALUES
      (1, 'Annual Safety Certification', 'compliant', '2026-06-15', '2026-01-10', 'Passed with 95% score'),
      (2, 'Confined Space Entry Permit', 'compliant', '2026-05-01', '2026-02-15', 'Renewed for 12 months'),
      (3, 'Security Clearance Renewal', 'pending', '2026-04-30', NULL, 'Application submitted, awaiting review'),
      (4, 'Pipeline Safety Certification', 'compliant', '2026-08-20', '2026-03-01', 'Advanced certification obtained'),
      (5, 'High Voltage Work Permit', 'compliant', '2026-07-15', '2026-01-20', 'Permit renewed with additional endorsements'),
      (6, 'HAZMAT Handling License', 'expired', '2026-03-01', NULL, 'License expired. Renewal in progress'),
      (7, 'Crane Operation License', 'compliant', '2026-09-01', '2026-02-28', 'License renewed. All tests passed'),
      (8, 'Gas Safety Certification', 'non_compliant', '2026-02-15', NULL, 'Failed recertification exam. Retest scheduled'),
      (9, 'Working at Heights Certification', 'compliant', '2026-10-01', '2026-03-15', 'Annual certification renewed'),
      (10, 'Tower Climbing Safety Certificate', 'pending', '2026-04-20', NULL, 'Scheduled for recertification next week'),
      (11, 'Underground Mining Safety License', 'compliant', '2026-11-15', '2026-03-10', 'Includes methane detection endorsement'),
      (12, 'Remote Healthcare Provider License', 'compliant', '2026-12-01', '2026-01-05', 'State license renewed'),
      (13, 'Wildfire Response Certification', 'expired', '2026-03-15', NULL, 'Must complete refresher course'),
      (14, 'Water Treatment Operator License', 'compliant', '2026-08-01', '2026-02-20', 'Grade 4 operator license maintained'),
      (15, 'Commercial Driver License Medical', 'pending', '2026-05-01', NULL, 'Physical exam scheduled for April 25')
    `);
    console.log('Compliance records seeded');

    // Seed shifts (15)
    await client.query(`
      INSERT INTO shifts (worker_id, start_time, end_time, location, type, status, notes) VALUES
      (1, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '6 hours', 'North Industrial Zone', 'day', 'active', 'Routine inspection shift'),
      (2, NOW() - INTERVAL '3 hours', NOW() + INTERVAL '5 hours', 'Power Plant Section 3', 'day', 'active', 'Scheduled maintenance window'),
      (3, NOW() + INTERVAL '10 hours', NOW() + INTERVAL '18 hours', 'Perimeter Gate B', 'night', 'scheduled', 'Night patrol duty'),
      (4, NOW() - INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'Remote Pipeline Stations 7-9', 'day', 'active', 'Pipeline inspection route'),
      (5, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 hours', 'Substation Delta', 'day', 'active', 'Transformer testing and maintenance'),
      (6, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 8 hours', 'Chemical Storage Facility', 'day', 'scheduled', 'Quarterly environmental audit'),
      (7, NOW() - INTERVAL '5 hours', NOW() + INTERVAL '3 hours', 'Construction Site C', 'day', 'active', 'Heavy lift operations'),
      (8, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '2 hours', 'Gas Distribution Hub East', 'day', 'active', 'Emergency response - gas leak investigation'),
      (9, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '10 hours', 'Office Complex B', 'swing', 'scheduled', 'HVAC maintenance after business hours'),
      (10, NOW() - INTERVAL '3 hours', NOW() + INTERVAL '5 hours', 'Cell Tower 14', 'day', 'active', 'Antenna realignment and signal testing'),
      (11, NOW() - INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'Mine Shaft B', 'day', 'active', 'Geological survey shift'),
      (12, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '6 hours', 'Rural Clinic Station 5', 'day', 'active', 'Patient consultation hours'),
      (13, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '4 hours', 'North Ridge Fire Watch Tower', 'night', 'completed', 'Overnight fire watch'),
      (14, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 hours', 'Water Treatment Plant 2', 'day', 'active', 'Water quality monitoring shift'),
      (15, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'Interstate 90 Route', 'day', 'active', 'Long haul delivery - Milwaukee to Chicago')
    `);
    console.log('Shifts seeded');

    // Seed hazards (15)
    await client.query(`
      INSERT INTO hazards (title, description, location, severity, status, reported_by, reported_at, mitigated_at) VALUES
      ('Oil Spill on Walkway', 'Hydraulic oil leak from compressor creating slippery surface on main walkway.', 'North Industrial Zone, Building A', 'medium', 'mitigated', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
      ('Exposed Electrical Wiring', 'Conduit damage exposing live wires in maintenance corridor.', 'Power Plant Section 3', 'critical', 'assessed', 2, NOW() - INTERVAL '1 day', NULL),
      ('Broken Perimeter Lighting', 'Three lighting fixtures non-functional along east perimeter fence.', 'Perimeter Gate B', 'medium', 'identified', 3, NOW() - INTERVAL '5 days', NULL),
      ('Corroded Pipeline Valve', 'Significant corrosion detected on isolation valve at station 7.', 'Remote Pipeline Station 7', 'high', 'assessed', 4, NOW() - INTERVAL '2 days', NULL),
      ('Missing Grounding Connection', 'Transformer grounding cable disconnected during recent storm.', 'Substation Delta', 'critical', 'mitigated', 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
      ('Chemical Container Label Fading', 'Several chemical containers have faded or illegible labels.', 'Chemical Storage Facility', 'high', 'identified', 6, NOW() - INTERVAL '6 days', NULL),
      ('Unstable Ground at Excavation', 'Soil instability detected near foundation excavation area.', 'Construction Site C', 'high', 'assessed', 7, NOW() - INTERVAL '2 days', NULL),
      ('Gas Detector Calibration Overdue', 'Portable gas detectors past calibration date by 2 weeks.', 'Gas Distribution Hub East', 'critical', 'identified', 8, NOW() - INTERVAL '1 day', NULL),
      ('Loose Roof Hatch Mechanism', 'Roof access hatch does not lock properly from outside.', 'Office Complex B, Roof Level', 'medium', 'mitigated', 9, NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
      ('Rusted Tower Climbing Pegs', 'Several climbing pegs showing significant rust at base connection.', 'Cell Tower 14, Rural Highway', 'high', 'assessed', 10, NOW() - INTERVAL '7 days', NULL),
      ('Poor Ventilation in Tunnel', 'Ventilation system operating at 40% capacity in main tunnel.', 'Mine Shaft B, Level 3', 'critical', 'assessed', 11, NOW() - INTERVAL '3 days', NULL),
      ('Damaged Road Surface', 'Large pothole on access road to clinic causing vehicle damage risk.', 'Rural Clinic Station 5 Access Road', 'medium', 'identified', 12, NOW() - INTERVAL '14 days', NULL),
      ('Dead Tree Near Structure', 'Large dead tree leaning toward watch tower. High wind risk.', 'North Ridge Fire Watch Tower', 'high', 'identified', 13, NOW() - INTERVAL '9 days', NULL),
      ('Chlorine Storage Leak Risk', 'Aging chlorine storage tank showing micro-cracks on inspection.', 'Water Treatment Plant 2', 'critical', 'assessed', 14, NOW() - INTERVAL '4 days', NULL),
      ('Uneven Loading Dock Surface', 'Loading dock surface has 3-inch height differential creating trip hazard.', 'Interstate 90 Distribution Center', 'medium', 'mitigated', 15, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days')
    `);
    console.log('Hazards seeded');

    // Seed training_records (15)
    await client.query(`
      INSERT INTO training_records (worker_id, course_name, category, status, score, completed_at, expires_at) VALUES
      (1, 'Industrial Safety Fundamentals', 'Safety', 'completed', 92, NOW() - INTERVAL '60 days', NOW() + INTERVAL '305 days'),
      (2, 'Confined Space Entry & Rescue', 'Safety', 'completed', 88, NOW() - INTERVAL '45 days', NOW() + INTERVAL '320 days'),
      (3, 'Security Threat Assessment', 'Security', 'completed', 95, NOW() - INTERVAL '90 days', NOW() + INTERVAL '275 days'),
      (4, 'Pipeline Integrity Management', 'Technical', 'completed', 90, NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days'),
      (5, 'Electrical Safety & Arc Flash Prevention', 'Safety', 'completed', 97, NOW() - INTERVAL '20 days', NOW() + INTERVAL '345 days'),
      (6, 'HAZMAT Emergency Response', 'Safety', 'expired', 78, NOW() - INTERVAL '400 days', NOW() - INTERVAL '35 days'),
      (7, 'Crane Safety & Load Calculations', 'Technical', 'completed', 85, NOW() - INTERVAL '50 days', NOW() + INTERVAL '315 days'),
      (8, 'Gas Detection & Monitoring Systems', 'Technical', 'in_progress', NULL, NULL, NULL),
      (9, 'Working at Heights Safety', 'Safety', 'completed', 91, NOW() - INTERVAL '25 days', NOW() + INTERVAL '340 days'),
      (10, 'Tower Rescue Procedures', 'Safety', 'completed', 89, NOW() - INTERVAL '70 days', NOW() + INTERVAL '295 days'),
      (11, 'Underground Mining Emergency Procedures', 'Safety', 'completed', 94, NOW() - INTERVAL '40 days', NOW() + INTERVAL '325 days'),
      (12, 'Remote First Aid & Trauma Care', 'Medical', 'completed', 96, NOW() - INTERVAL '15 days', NOW() + INTERVAL '350 days'),
      (13, 'Wildfire Behavior & Suppression', 'Safety', 'expired', 82, NOW() - INTERVAL '380 days', NOW() - INTERVAL '15 days'),
      (14, 'Water Chemistry & Treatment Safety', 'Technical', 'completed', 93, NOW() - INTERVAL '55 days', NOW() + INTERVAL '310 days'),
      (15, 'Defensive Driving & Fatigue Management', 'Safety', 'completed', 87, NOW() - INTERVAL '35 days', NOW() + INTERVAL '330 days')
    `);
    console.log('Training records seeded');

    // Seed equipment_inspections (15)
    await client.query(`
      INSERT INTO equipment_inspections (equipment_name, equipment_type, inspector_id, status, last_inspection, next_inspection, notes) VALUES
      ('Personal Gas Monitor #101', 'Safety Equipment', 1, 'passed', NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', 'All sensors calibrated and functioning'),
      ('Confined Space Blower Unit', 'Safety Equipment', 2, 'passed', NOW() - INTERVAL '14 days', NOW() + INTERVAL '16 days', 'Airflow rate within specifications'),
      ('CCTV Camera Array - Gate B', 'Security Equipment', 3, 'needs_repair', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', 'Camera 3 has intermittent connection. Repair scheduled'),
      ('Pipeline Pressure Gauge Set', 'Measurement', 4, 'passed', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'Calibration verified against reference standard'),
      ('Insulated Glove Set - HV', 'PPE', 5, 'passed', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 'Dielectric test passed. No punctures detected'),
      ('Spill Containment Kit', 'Safety Equipment', 6, 'needs_repair', NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days', 'Absorbent pads need replacement. Boom damaged'),
      ('Overhead Crane #7', 'Heavy Equipment', 7, 'failed', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days', 'Main hoist cable fraying detected. Out of service until replacement'),
      ('Portable Gas Detector Array', 'Safety Equipment', 8, 'failed', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', 'Calibration overdue. Sensors reading inconsistently'),
      ('Fall Arrest Harness Set', 'PPE', 9, 'passed', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 'All connections secure. Webbing in good condition'),
      ('Tower Climbing Kit', 'PPE', 10, 'needs_repair', NOW() - INTERVAL '8 days', NOW() + INTERVAL '22 days', 'Carabiner gate spring weakened. Replacement ordered'),
      ('Mine Ventilation Monitor', 'Safety Equipment', 11, 'passed', NOW() - INTERVAL '6 days', NOW() + INTERVAL '24 days', 'Airflow sensors calibrated. CO2 detection verified'),
      ('Emergency Medical Kit - Mobile', 'Medical Equipment', 12, 'passed', NOW() - INTERVAL '12 days', NOW() + INTERVAL '18 days', 'All medications within expiry. Supplies restocked'),
      ('Satellite Communication Unit', 'Communication', 13, 'needs_repair', NOW() - INTERVAL '4 days', NOW() + INTERVAL '26 days', 'Battery not holding full charge. Replacement needed'),
      ('Chlorine Level Analyzer', 'Measurement', 14, 'passed', NOW() - INTERVAL '9 days', NOW() + INTERVAL '21 days', 'Sensor replaced. Calibration verified'),
      ('Vehicle Safety Kit - Truck #22', 'Safety Equipment', 15, 'passed', NOW() - INTERVAL '11 days', NOW() + INTERVAL '19 days', 'Fire extinguisher recharged. First aid kit complete. Flares replaced')
    `);
    console.log('Equipment inspections seeded');

    console.log('\nDatabase seed completed successfully!');
    console.log(`Configured admin created for ${seedAdminEmail}`);
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
