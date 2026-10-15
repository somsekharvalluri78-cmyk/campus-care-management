import dns from 'node:dns';
import pg from 'pg';
import { config } from '../config.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const { Pool } = pg;

const requiresSsl = Boolean(config.databaseUrl) && !config.databaseUrl.includes('localhost') && !config.databaseUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

export async function queryWithRetry(sql, params = [], retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      const isTransient = err.code === 'EAI_AGAIN' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.message?.includes('timeout') ||
        err.message?.includes('getaddrinfo');
      if (isTransient && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }
}
