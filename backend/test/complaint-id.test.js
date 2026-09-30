import assert from 'node:assert/strict';
import test from 'node:test';
import { makeComplaintId } from '../src/complaint-id.js';

test('formats a complaint reference with a five-digit sequence', () => {
  assert.equal(makeComplaintId(1, 2026), 'CMP-2026-00001');
  assert.equal(makeComplaintId(42, 2026), 'CMP-2026-00042');
  assert.equal(makeComplaintId(123456, 2026), 'CMP-2026-123456');
});

test('rejects invalid complaint sequence values', () => {
  assert.throws(() => makeComplaintId(0, 2026), TypeError);
  assert.throws(() => makeComplaintId(-1, 2026), TypeError);
  assert.throws(() => makeComplaintId(1.5, 2026), TypeError);
});