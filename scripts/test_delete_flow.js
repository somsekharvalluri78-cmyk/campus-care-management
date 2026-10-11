const API = 'http://localhost:4000/api';

async function testDeleteFlow() {
  console.log('--- Starting Complaint Delete & Personal Storage Integration Tests ---');

  // 1. Log in as Student STU-2026-001
  const studentRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'STU-2026-001', password: 'CampusDemo2026!' })
  });
  const studentData = await studentRes.json();
  if (!studentRes.ok) throw new Error('Student login failed: ' + JSON.stringify(studentData));
  const studentToken = studentData.token;
  console.log('✓ Student logged in:', studentData.user.fullName);

  // 2. Log in as Admin ADM-001
  const adminRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ADM-001', password: 'CampusDemo2026!' })
  });
  const adminData = await adminRes.json();
  if (!adminRes.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminData));
  const adminToken = adminData.token;
  console.log('✓ Admin logged in:', adminData.user.fullName);

  // 3. Create a test complaint as student
  const createRes = await fetch(`${API}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      categoryId: 1,
      title: 'Accidental Temporary Test Complaint',
      description: 'Submitted by mistake for testing temporary and permanent deletion functionality.',
      priority: 'High'
    })
  });
  const createdData = await createRes.json();
  if (!createRes.ok) throw new Error('Complaint creation failed: ' + JSON.stringify(createdData));
  const testId = createdData.complaintId;
  console.log('✓ Created test complaint:', testId);

  // 4. Verify complaint is active on desk
  const studentActiveRes = await fetch(`${API}/complaints`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const studentActive = await studentActiveRes.json();
  const existsInActive = studentActive.complaints.some(c => c.complaintId === testId);
  console.log('✓ Complaint visible on student active desk:', existsInActive);
  if (!existsInActive) throw new Error('Complaint not found on active desk');

  // 5. Verify admin sees complaint before delete
  const adminBeforeRes = await fetch(`${API}/complaints`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminBefore = await adminBeforeRes.json();
  const adminSawBefore = adminBefore.complaints.some(c => c.complaintId === testId);
  console.log('✓ Complaint visible to Admin before delete:', adminSawBefore);
  if (!adminSawBefore) throw new Error('Admin should see active complaint');

  // 6. Student performs Temporary Delete / Retract
  console.log('--- Testing Soft Delete / Retract ---');
  const retractRes = await fetch(`${API}/complaints/${testId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const retractData = await retractRes.json();
  if (!retractRes.ok) throw new Error('Retract failed: ' + JSON.stringify(retractData));
  console.log('✓ Complaint successfully retracted:', retractData.message);

  // 7. Verify complaint is NO LONGER visible on student active desk
  const studentAfterRetract = await (await fetch(`${API}/complaints`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  const existsInStudentActiveAfter = studentAfterRetract.complaints.some(c => c.complaintId === testId);
  console.log('✓ Complaint removed from student active desk:', !existsInStudentActiveAfter);
  if (existsInStudentActiveAfter) throw new Error('Retracted complaint still visible on active desk');

  // 8. CRITICAL: Verify Admin CANNOT see the retracted complaint at all
  const adminAfterRetract = await (await fetch(`${API}/complaints`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  })).json();
  const existsInAdmin = adminAfterRetract.complaints.some(c => c.complaintId === testId);
  console.log('✓ Retracted complaint is INVISIBLE to Admin:', !existsInAdmin);
  if (existsInAdmin) throw new Error('Admin must NEVER see retracted complaints!');

  // 9. Verify complaint IS visible in Student Personal Storage (scope=all)
  const studentVault = await (await fetch(`${API}/complaints?scope=all`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  const inVault = studentVault.complaints.find(c => c.complaintId === testId);
  console.log('✓ Retracted complaint is SAFE in Personal Storage Vault:', !!inVault, '(isDeleted =', inVault?.isDeleted, ')');
  if (!inVault || !inVault.isDeleted) throw new Error('Complaint must be in personal vault with isDeleted = true');

  // 10. Test Restore back to active desk
  console.log('--- Testing Restore to Desk ---');
  const restoreRes = await fetch(`${API}/complaints/${testId}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const restoreData = await restoreRes.json();
  if (!restoreRes.ok) throw new Error('Restore failed: ' + JSON.stringify(restoreData));
  console.log('✓ Complaint restored:', restoreData.message);

  const studentAfterRestore = await (await fetch(`${API}/complaints`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  const existsAfterRestore = studentAfterRestore.complaints.some(c => c.complaintId === testId);
  console.log('✓ Complaint reappeared on active desk:', existsAfterRestore);
  if (!existsAfterRestore) throw new Error('Complaint did not reappear on desk after restore');

  // 11. Test Permanent Delete
  console.log('--- Testing Permanent Delete ---');
  const permDeleteRes = await fetch(`${API}/complaints/${testId}/permanent`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const permDeleteData = await permDeleteRes.json();
  if (!permDeleteRes.ok) throw new Error('Permanent delete failed: ' + JSON.stringify(permDeleteData));
  console.log('✓ Permanently deleted from database:', permDeleteData.message);

  // 12. Verify complaint is 100% gone from vault and everywhere
  const studentVaultFinal = await (await fetch(`${API}/complaints?scope=all`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  const stillInVault = studentVaultFinal.complaints.some(c => c.complaintId === testId);
  console.log('✓ Complaint completely erased from database (not in vault):', !stillInVault);
  if (stillInVault) throw new Error('Permanently deleted complaint still exists in database!');

  const checkGet = await fetch(`${API}/complaints/${testId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('✓ Direct lookup returns 404 Not Found:', checkGet.status === 404);
  if (checkGet.status !== 404) throw new Error('Expected 404 for deleted complaint');

  console.log('\n ALL 12 INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!');
}

testDeleteFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
