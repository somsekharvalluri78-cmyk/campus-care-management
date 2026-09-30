import assert from 'node:assert/strict';
import test from 'node:test';
import { studentRegistrationSchema } from '../src/registration.js';

const validStudent = {
  studentId: 'STU-2040-001',
  fullName: 'Sam Student',
  email: 'SAM.STUDENT@CAMPUS.TEST',
  password: 'CampusPass2040',
  departmentId: 1,
  year: 2,
  section: 'B',
};

test('accepts valid registration, normalizes ID/email, and never accepts a requested role', () => {
  const parsed = studentRegistrationSchema.parse({ ...validStudent, studentId: 'stu-2040-001', role: 'admin' });
  assert.equal(parsed.email, 'sam.student@campus.test');
  assert.equal(parsed.studentId, 'STU-2040-001');
  assert.equal('role' in parsed, false);
});

test('rejects invalid email, weak password, and malformed student ID', () => {
  assert.equal(studentRegistrationSchema.safeParse({ ...validStudent, email: 'not-an-email' }).success, false);
  assert.equal(studentRegistrationSchema.safeParse({ ...validStudent, password: 'weak' }).success, false);
  assert.equal(studentRegistrationSchema.safeParse({ ...validStudent, studentId: 'bad id' }).success, false);
});

test('rejects missing academic fields and out-of-range year', () => {
  assert.equal(studentRegistrationSchema.safeParse({ ...validStudent, year: 0 }).success, false);
  const { departmentId: _departmentId, ...withoutDepartment } = validStudent;
  assert.equal(studentRegistrationSchema.safeParse(withoutDepartment).success, false);
});