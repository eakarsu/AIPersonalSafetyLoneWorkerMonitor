import pg from 'pg';
import dotenv from 'dotenv';
import { databaseUrl } from './config/security.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const { Pool } = pg;

const pool = new Pool({
  connectionString: databaseUrl(),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
