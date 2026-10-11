import { pool } from '../backend/src/db/pool.js';

async function migrate() {
  try {
    await pool.query('ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE');
    await pool.query('ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ');
    const cols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'complaints' AND column_name IN ('is_deleted', 'deleted_at')"
    );
    console.log('Successfully updated complaints columns in database:', cols.rows);
    await pool.end();
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
