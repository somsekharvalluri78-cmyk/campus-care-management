import http from 'node:http';

function postJson(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: `/api${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (d) => { buf += d; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode, data: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: `/api${path}`,
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (d) => { buf += d; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode, data: buf });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testFullComplaintFlow() {
  console.log('Testing New Comprehensive Complaint Submission & Retrieval Flow...');

  // 1. Login
  const loginRes = await postJson('/auth/login', {
    identifier: 'STU-2026-001',
    password: 'CampusDemo2026!',
  });
  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('1. Student Logged in:', loginRes.data.user.fullName);

  // 2. Submit Emergency Complaint with all 15+ sequence fields
  const emergencyPayload = {
    categoryId: 1,
    title: 'Severe Sparking Hazard in Robotics Lab 305',
    description: 'Electrical control panel is smoking and sparking continuously during high load experiments in Robotics Lab 305 on the 3rd floor.',
    priority: 'Critical',
    collegeName: 'Northfield Institute of Technology & Advanced Sciences',
    campusName: 'Northfield Tech Valley Campus',
    complaintDate: '2026-10-12',
    complaintTime: '01:55:10 AM',
    blockName: 'Dr. APJ Abdul Kalam Innovation Block',
    floorNumber: '3rd Floor',
    roomNumber: 'Robotics Lab 305',
    daysFacingProblem: '3 days since Thursday evening',
    problemAppearance: 'Sparks emit violently from breaker box accompanied by smoke smell when equipment starts',
    suggestions: 'Replace circuit breaker unit and inspect main transformer feed immediately',
    membersAffected: 'Entire robotics batch (approx 45 students) and faculty staff',
    emergencyType: 'Fire Engine',
    collegeRegisterNo: 'REG-2026-78901',
  };

  const createRes = await postJson('/complaints', emergencyPayload, token);
  console.log('2. Complaint Creation status:', createRes.status, 'ID:', createRes.data?.complaintId);
  if (createRes.status !== 201) {
    console.error('Failed to create complaint:', createRes.data);
    process.exit(1);
  }
  const complaintId = createRes.data.complaintId;

  // 3. Retrieve complaint and verify all 15+ fields
  const detailRes = await getJson(`/complaints/${complaintId}`, token);
  console.log('3. Fetch detail status:', detailRes.status);
  const c = detailRes.data?.complaint;

  const checks = [
    ['Emergency Type', c.emergencyType === 'Fire Engine'],
    ['College Name', c.collegeName === emergencyPayload.collegeName],
    ['Campus Name', c.campusName === emergencyPayload.campusName],
    ['Complaint Date', c.complaintDate === emergencyPayload.complaintDate],
    ['Complaint Time', c.complaintTime === emergencyPayload.complaintTime],
    ['Block Name', c.blockName === emergencyPayload.blockName],
    ['Floor Number', c.floorNumber === emergencyPayload.floorNumber],
    ['Room Number', c.roomNumber === emergencyPayload.roomNumber],
    ['Days Facing', c.daysFacingProblem === emergencyPayload.daysFacingProblem],
    ['Problem Appearance', c.problemAppearance === emergencyPayload.problemAppearance],
    ['Suggestions', c.suggestions === emergencyPayload.suggestions],
    ['Members Affected', c.membersAffected === emergencyPayload.membersAffected],
    ['College Register No', c.collegeRegisterNo === emergencyPayload.collegeRegisterNo],
    ['Priority Escalated to Critical', c.priority === 'Critical'],
  ];

  let allPassed = true;
  for (const [name, passed] of checks) {
    console.log(` - ${name}: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    console.error('Some field verifications failed!');
    process.exit(1);
  }

  console.log('ALL COMPREHENSIVE COMPLAINT FIELDS VERIFIED WITH 100% ACCURACY!');
}

testFullComplaintFlow().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
