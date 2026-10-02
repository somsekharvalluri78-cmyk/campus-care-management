import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';
const requiresSsl = isProduction && Boolean(config.databaseUrl) && !config.databaseUrl.includes('localhost') && !config.databaseUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});