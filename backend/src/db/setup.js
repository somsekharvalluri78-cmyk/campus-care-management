import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');

try {
  const schema = await readFile(resolve(projectRoot, 'database/schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Database schema is ready.');
} catch (error) {
  console.error('Could not apply database schema:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}