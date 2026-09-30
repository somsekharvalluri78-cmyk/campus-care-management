export function makeComplaintId(sequenceId, year = new Date().getFullYear()) {
  if (!Number.isSafeInteger(sequenceId) || sequenceId < 1) {
    throw new TypeError('Complaint sequence ID must be a positive safe integer.');
  }
  return `CMP-${year}-${String(sequenceId).padStart(5, '0')}`;
}