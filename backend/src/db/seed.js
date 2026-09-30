import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const demoPassword = await bcrypt.hash('CampusDemo2026!', 12);
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const departments = [
    ['CSE', 'Computer Science and Engineering'],
    ['ADMIN', 'Administration'],
    ['LIB', 'Library'],
    ['HOSTEL', 'Hostel'],
  ];
  for (const [code, name] of departments) {
    await client.query('INSERT INTO departments (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING', [code, name]);
  }

  const categories = ['Academic', 'Faculty', 'Examination', 'Library', 'Hostel', 'Transport', 'Infrastructure', 'Internet/Wi-Fi', 'Other'];
  for (const name of categories) {
    await client.query('INSERT INTO complaint_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  }

  const { rows: departmentRows } = await client.query('SELECT id, code FROM departments');
  const departmentId = Object.fromEntries(departmentRows.map((department) => [department.code, department.id]));
  const users = [
    ['STU-2026-001', 'student@campus.test', 'Aarav Sharma', 'student', departmentId.CSE, 3, 'A', 'Student'],
    ['STF-001', 'staff@campus.test', 'Maya Nair', 'staff', departmentId.LIB, null, null, 'Library Officer'],
    ['ADM-001', 'admin@campus.test', 'Jordan Lee', 'admin', departmentId.ADMIN, null, null, 'System Administrator'],
  ];

  for (const [loginId, email, name, role, deptId, year, section, designation] of users) {
    await client.query(
      `INSERT INTO users (login_id, email, password_hash, full_name, role, department_id, year, section, designation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (login_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name, role = EXCLUDED.role, department_id = EXCLUDED.department_id`,
      [loginId, email, demoPassword, name, role, deptId, year, section, designation],
    );
  }

  const { rows: studentRows } = await client.query("SELECT id FROM users WHERE login_id = 'STU-2026-001'");
  const { rows: staffRows } = await client.query("SELECT id FROM users WHERE login_id = 'STF-001'");
  const { rows: categoryRows } = await client.query("SELECT id FROM complaint_categories WHERE name = 'Library'");
  const samples = [
    ['CMP-2026-00001', 'Study hall lighting needs attention', 'Several lights on the second floor are not working, making evening study difficult.', 'Medium', 'In Progress', 12],
    ['CMP-2026-00002', 'Library access card not working', 'My access card has stopped opening the library turnstile since Monday.', 'High', 'Assigned', 3],
    ['CMP-2026-00003', 'Quiet study room booking', 'I would like to request clearer booking availability for the small group study rooms.', 'Low', 'Resolved', 8],
  ];
  for (const [complaintId, title, description, priority, status, daysAgo] of samples) {
    const { rows } = await client.query(
      `INSERT INTO complaints (complaint_id, student_id, category_id, department_id, assigned_staff_id, title, description, priority, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - ($10 * INTERVAL '1 day'), NOW() - ($10 * INTERVAL '1 day'))
       ON CONFLICT (complaint_id) DO NOTHING RETURNING id`,
      [complaintId, studentRows[0].id, categoryRows[0].id, departmentId.LIB, staffRows[0].id, title, description, priority, status, daysAgo],
    );
    if (rows[0]) {
      await client.query(
        'INSERT INTO complaint_history (complaint_id, user_id, action, new_status, remarks) VALUES ($1, $2, $3, $4, $5)',
        [rows[0].id, studentRows[0].id, 'Created', 'Submitted', 'Complaint submitted through the student portal.'],
      );
      if (status !== 'Submitted') {
        await client.query(
          'INSERT INTO complaint_history (complaint_id, user_id, action, old_status, new_status, remarks) VALUES ($1, $2, $3, $4, $5, $6)',
          [rows[0].id, staffRows[0].id, 'Status changed', 'Submitted', status, 'Demo history entry.'],
        );
      }
    }
  }

  await client.query('COMMIT');
  console.log('Demo data is ready. All demo accounts use password: CampusDemo2026!');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Could not seed demo data:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}