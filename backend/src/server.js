import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { config } from './config.js';
import { makeComplaintId } from './complaint-id.js';
import { studentRegistrationSchema } from './registration.js';
import { pool } from './db/pool.js';

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    },
  },
}));
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Wait a few minutes and try again.' } });
const complaintStatuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Waiting for Student', 'Resolved', 'Closed', 'Rejected'];
const statusSchema = z.object({ status: z.enum(complaintStatuses), remarks: z.string().trim().max(2000).optional().default('') });

function authenticate(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ error: 'Sign in to continue.' });
  try {
    request.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return response.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function allow(...roles) {
  return (request, response, next) => roles.includes(request.user.role)
    ? next()
    : response.status(403).json({ error: 'You do not have permission to do that.' });
}

const userSelect = `SELECT u.id, u.login_id AS "loginId", u.email, u.full_name AS "fullName", u.role,
  u.department_id AS "departmentId", d.name AS department, u.year, u.section, u.designation
  FROM users u LEFT JOIN departments d ON d.id = u.department_id`;

app.get('/api/health', asyncRoute(async (_request, response) => {
  await pool.query('SELECT 1');
  response.json({ status: 'ok' });
}));

app.get('/api/departments', asyncRoute(async (_request, response) => {
  const { rows } = await pool.query("SELECT id, code, name FROM departments WHERE status = 'Active' ORDER BY name");
  response.json({ departments: rows });
}));

app.post('/api/auth/register', authLimiter, asyncRoute(async (request, response) => {
  const parsed = studentRegistrationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message || 'Check the registration form.' });
  const student = parsed.data;
  const passwordHash = await bcrypt.hash(student.password, 12);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (login_id, email, password_hash, full_name, role, department_id, year, section, phone)
       SELECT $1, $2, $3, $4, 'student', d.id, $6, $7, NULLIF($8, '')
       FROM departments d WHERE d.id = $5 AND d.status = 'Active'
       RETURNING id`,
      [student.studentId, student.email, passwordHash, student.fullName, student.departmentId, student.year, student.section, student.phone],
    );
    if (!rows[0]) return response.status(400).json({ error: 'Choose an active department.' });
    const { rows: profileRows } = await pool.query(`${userSelect} WHERE u.id = $1`, [rows[0].id]);
    const user = profileRows[0];
    const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, { expiresIn: '8h' });
    response.status(201).json({ token, user });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'That student ID or email is already registered. Sign in or contact your administrator.' });
    throw error;
  }
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (request, response) => {
  const parsed = z.object({ identifier: z.string().trim().min(1), password: z.string().min(1) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter your student/staff ID or email and password.' });
  const { identifier, password } = parsed.data;
  const { rows } = await pool.query(`${userSelect} WHERE (LOWER(u.email) = LOWER($1) OR LOWER(u.login_id) = LOWER($1)) AND u.status = 'Active'`, [identifier]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, (await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id])).rows[0].password_hash))) {
    return response.status(401).json({ error: 'The ID/email or password is incorrect.' });
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, { expiresIn: '8h' });
  response.json({ token, user });
}));

app.get('/api/auth/me', authenticate, asyncRoute(async (request, response) => {
  const { rows } = await pool.query(`${userSelect} WHERE u.id = $1`, [request.user.userId]);
  if (!rows[0]) return response.status(401).json({ error: 'Account no longer exists.' });
  response.json({ user: rows[0] });
}));

app.get('/api/categories', authenticate, asyncRoute(async (_request, response) => {
  const { rows } = await pool.query("SELECT id, name FROM complaint_categories WHERE status = 'Active' ORDER BY name");
  response.json({ categories: rows });
}));

const complaintSelect = `SELECT c.id, c.complaint_id AS "complaintId", c.title, c.description, c.priority, c.status,
  c.created_at AS "createdAt", c.updated_at AS "updatedAt", c.resolved_at AS "resolvedAt",
  cat.name AS category, d.name AS department, student.full_name AS "studentName", student.login_id AS "studentLoginId",
  staff.full_name AS "assignedStaff", c.assigned_staff_id AS "assignedStaffId", c.student_id AS "studentUserId"
  FROM complaints c JOIN complaint_categories cat ON cat.id = c.category_id
  JOIN departments d ON d.id = c.department_id JOIN users student ON student.id = c.student_id
  LEFT JOIN users staff ON staff.id = c.assigned_staff_id`;

app.get('/api/dashboard', authenticate, asyncRoute(async (request, response) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('Submitted', 'Under Review', 'Assigned', 'Waiting for Student'))::int AS pending,
      COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved,
      COUNT(*) FILTER (WHERE status = 'Closed')::int AS closed,
      COUNT(*) FILTER (WHERE priority = 'Critical' AND status NOT IN ('Resolved', 'Closed', 'Rejected'))::int AS critical
     FROM complaints c
     WHERE ($1 = 'admin') OR ($1 = 'student' AND c.student_id = $2) OR ($1 = 'staff' AND c.assigned_staff_id = $2)`,
    [request.user.role, request.user.userId],
  );
  const countKey = request.user.role === 'admin' ? 'students' : request.user.role === 'staff' ? 'assigned' : null;
  let peopleCount = null;
  if (countKey) {
    const role = countKey === 'students' ? 'student' : 'staff';
    peopleCount = (await pool.query('SELECT COUNT(*)::int AS total FROM users WHERE role = $1 AND status = $2', [role, 'Active'])).rows[0].total;
  }
  response.json({ stats: { ...rows[0], peopleCount } });
}));

app.get('/api/complaints', authenticate, asyncRoute(async (request, response) => {
  const conditions = [];
  const values = [];
  if (request.user.role === 'student') {
    values.push(request.user.userId);
    conditions.push(`c.student_id = $${values.length}`);
  } else if (request.user.role === 'staff') {
    values.push(request.user.userId);
    conditions.push(`c.assigned_staff_id = $${values.length}`);
  }
  const search = String(request.query.search || '').trim();
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(c.complaint_id ILIKE $${values.length} OR c.title ILIKE $${values.length} OR student.full_name ILIKE $${values.length})`);
  }
  if (request.query.status && complaintStatuses.includes(request.query.status)) {
    values.push(request.query.status);
    conditions.push(`c.status = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`${complaintSelect} ${where} ORDER BY c.created_at DESC LIMIT 100`, values);
  response.json({ complaints: rows });
}));

app.get('/api/complaints/export', authenticate, allow('admin'), asyncRoute(async (_request, response) => {
  const { rows } = await pool.query(`
    SELECT c.complaint_id AS "ID", c.title AS "Title", cat.name AS "Category",
           d.name AS "Department", student.full_name AS "Student",
           student.login_id AS "StudentID", c.priority AS "Priority",
           c.status AS "Status", staff.full_name AS "AssignedStaff",
           c.created_at AS "CreatedAt", c.resolved_at AS "ResolvedAt"
    FROM complaints c
    JOIN complaint_categories cat ON cat.id = c.category_id
    JOIN departments d ON d.id = c.department_id
    JOIN users student ON student.id = c.student_id
    LEFT JOIN users staff ON staff.id = c.assigned_staff_id
    ORDER BY c.created_at DESC
  `);
  const headers = ['ID', 'Title', 'Category', 'Department', 'Student', 'StudentID', 'Priority', 'Status', 'AssignedStaff', 'CreatedAt', 'ResolvedAt'];
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvRows.push(values.join(','));
  }
  response.setHeader('Content-Type', 'text/csv');
  response.setHeader('Content-Disposition', 'attachment; filename="campus-care-complaints.csv"');
  response.send(csvRows.join('\r\n'));
}));

app.get('/api/complaints/:id', authenticate, asyncRoute(async (request, response) => {
  const { rows } = await pool.query(`${complaintSelect} WHERE c.complaint_id = $1`, [request.params.id]);
  const complaint = rows[0];
  if (!complaint) return response.status(404).json({ error: 'Complaint not found.' });
  if (request.user.role === 'student' && complaint.studentUserId !== request.user.userId) return response.status(404).json({ error: 'Complaint not found.' });
  if (request.user.role === 'staff' && complaint.assignedStaffId !== request.user.userId) return response.status(404).json({ error: 'Complaint not found.' });
  const history = (await pool.query(
    `SELECT h.action, h.old_status AS "oldStatus", h.new_status AS "newStatus", h.remarks,
      h.created_at AS "createdAt", u.full_name AS "actorName"
     FROM complaint_history h JOIN users u ON u.id = h.user_id
     WHERE h.complaint_id = $1 ORDER BY h.created_at`, [complaint.id],
  )).rows;
  response.json({ complaint, history });
}));

app.post('/api/complaints', authenticate, allow('student'), asyncRoute(async (request, response) => {
  const parsed = z.object({
    categoryId: z.coerce.number().int().positive(),
    title: z.string().trim().min(5).max(180),
    description: z.string().trim().min(20).max(5000),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message || 'Check the complaint form.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: identityRows } = await client.query('SELECT department_id FROM users WHERE id = $1', [request.user.userId]);
    const dept = identityRows[0].department_id;
    const temporaryId = `TMP-${randomUUID()}`;
    const insert = await client.query(
      `INSERT INTO complaints (complaint_id, student_id, category_id, department_id, title, description, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [temporaryId, request.user.userId, parsed.data.categoryId, dept, parsed.data.title, parsed.data.description, parsed.data.priority],
    );
    const complaintId = makeComplaintId(Number(insert.rows[0].id));
    await client.query('UPDATE complaints SET complaint_id = $1 WHERE id = $2', [complaintId, insert.rows[0].id]);
    await client.query(
      'INSERT INTO complaint_history (complaint_id, user_id, action, new_status, remarks) VALUES ($1, $2, $3, $4, $5)',
      [insert.rows[0].id, request.user.userId, 'Created', 'Submitted', 'Complaint submitted through the student portal.'],
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       SELECT id, 'New complaint submitted', $1 FROM users WHERE role = 'admin'`,
      [`${complaintId} is ready for review.`],
    );
    await client.query('COMMIT');
    response.status(201).json({ complaintId });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.patch('/api/complaints/:id/assign', authenticate, allow('admin'), asyncRoute(async (request, response) => {
  const parsed = z.object({ staffId: z.number().int().positive() }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Select a staff member to assign.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, status FROM complaints WHERE complaint_id = $1 FOR UPDATE', [request.params.id]);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ error: 'Complaint not found.' });
    }
    const staff = await client.query("SELECT id, full_name FROM users WHERE id = $1 AND role = 'staff' AND status = 'Active'", [parsed.data.staffId]);
    if (!staff.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(400).json({ error: 'Choose an active staff account.' });
    }
    await client.query("UPDATE complaints SET assigned_staff_id = $1, status = 'Assigned', updated_at = NOW() WHERE id = $2", [parsed.data.staffId, rows[0].id]);
    await client.query(
      'INSERT INTO complaint_history (complaint_id, user_id, action, old_status, new_status, remarks) VALUES ($1, $2, $3, $4, $5, $6)',
      [rows[0].id, request.user.userId, 'Assigned', rows[0].status, 'Assigned', 'Complaint assigned by an administrator.'],
    );
    await client.query('INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)', [parsed.data.staffId, 'Complaint assigned', `${request.params.id} has been assigned to you.`]);
    const studentId = (await client.query('SELECT student_id FROM complaints WHERE id = $1', [rows[0].id])).rows[0].student_id;
    await client.query('INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)', [studentId, 'Complaint assigned', `${request.params.id} has been assigned to ${staff.rows[0].full_name}.`]);
    await client.query('COMMIT');
    response.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.patch('/api/complaints/:id/status', authenticate, allow('admin', 'staff', 'student'), asyncRoute(async (request, response) => {
  const parsed = statusSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Choose a valid status.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, student_id, status, assigned_staff_id FROM complaints WHERE complaint_id = $1 FOR UPDATE', [request.params.id]);
    const complaint = rows[0];
    if (!complaint) {
      await client.query('ROLLBACK');
      return response.status(404).json({ error: 'Complaint not found.' });
    }
    if (request.user.role === 'student') {
      if (complaint.student_id !== request.user.userId) {
        await client.query('ROLLBACK');
        return response.status(404).json({ error: 'Complaint not found.' });
      }
      if (complaint.status !== 'Resolved' || parsed.data.status !== 'Closed') {
        await client.query('ROLLBACK');
        return response.status(400).json({ error: 'Students can only close complaints that have been marked Resolved.' });
      }
    } else if (request.user.role === 'staff' && complaint.assigned_staff_id !== request.user.userId) {
      await client.query('ROLLBACK');
      return response.status(404).json({ error: 'Complaint not found.' });
    }
    const nextStatus = parsed.data.status;
    await client.query(
      `UPDATE complaints SET status = $1, updated_at = NOW(),
       resolved_at = CASE WHEN $1 = 'Resolved' THEN NOW() ELSE resolved_at END,
       closed_at = CASE WHEN $1 = 'Closed' THEN NOW() ELSE closed_at END WHERE id = $2`, [nextStatus, complaint.id],
    );
    const action = request.user.role === 'student' ? 'Closed with feedback' : 'Status changed';
    await client.query(
      'INSERT INTO complaint_history (complaint_id, user_id, action, old_status, new_status, remarks) VALUES ($1, $2, $3, $4, $5, $6)',
      [complaint.id, request.user.userId, action, complaint.status, nextStatus, parsed.data.remarks],
    );
    const targetUserId = request.user.role === 'student' ? complaint.assigned_staff_id : complaint.student_id;
    if (targetUserId) {
      const msg = request.user.role === 'student' ? `${request.params.id} was reviewed and closed with student feedback.` : `${request.params.id} is now ${nextStatus}.`;
      await client.query('INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)', [targetUserId, 'Complaint updated', msg]);
    }
    await client.query('COMMIT');
    response.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/notifications', authenticate, asyncRoute(async (request, response) => {
  const { rows } = await pool.query(
    'SELECT id, title, message, is_read AS "isRead", created_at AS "createdAt" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
    [request.user.userId],
  );
  response.json({ notifications: rows });
}));

app.get('/api/staff', authenticate, allow('admin'), asyncRoute(async (_request, response) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name AS "fullName", u.designation, d.name AS department
     FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.role = 'staff' AND u.status = 'Active' ORDER BY u.full_name`,
  );
  response.json({ staff: rows });
}));

if (process.env.NODE_ENV === 'production') {
  const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  app.use(express.static(frontendDist, { index: false }));
  app.get('/robots.txt', (_request, response) => {
    response.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${config.publicSiteUrl}/sitemap.xml\n`);
  });
  app.get('/sitemap.xml', (_request, response) => {
    response.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${config.publicSiteUrl}/</loc></url></urlset>`);
  });
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      return response.status(404).json({ error: 'API endpoint not found.' });
    }
    return response.sendFile(resolve(frontendDist, 'index.html'), (error) => error && next(error));
  });
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(config.port, () => console.log(`API listening at http://localhost:${config.port}`));