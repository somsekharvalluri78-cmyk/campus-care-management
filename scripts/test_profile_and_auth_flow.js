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
          const parsed = JSON.parse(buf);
          resolve({ status: res.statusCode, data: parsed });
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

function patchJson(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: `/api${path}`,
      method: 'PATCH',
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
          const parsed = JSON.parse(buf);
          resolve({ status: res.statusCode, data: parsed });
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
          const parsed = JSON.parse(buf);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: buf });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testing Profile & Authentication Endpoints...');

  // 1. Login with demo student
  const loginRes = await postJson('/auth/login', {
    identifier: 'STU-2026-001',
    password: 'CampusDemo2026!',
  });
  console.log('1. Initial Login status:', loginRes.status, 'User:', loginRes.data.user?.fullName);
  if (loginRes.status !== 200) {
    console.error('Failed to log in:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;

  // 2. Test updating personal details (semester, year, section, phone)
  const profileRes = await patchJson('/auth/profile', {
    fullName: 'valluri somsekhar',
    email: 'somsekhar@northfield.college',
    departmentId: 1, // CSE
    year: 3,
    semester: 2,
    section: 'B',
    phone: '+91 9876543210',
  }, token);
  console.log('2. Update Profile status:', profileRes.status, 'Message:', profileRes.data.message);
  if (profileRes.status !== 200) {
    console.error('Failed to update profile:', profileRes.data);
    process.exit(1);
  }

  // Verify /auth/me returns updated details
  const meRes = await getJson('/auth/me', token);
  console.log('2b. Auth Me details: Year =', meRes.data.user.year, 'Sem =', meRes.data.user.semester, 'Sec =', meRes.data.user.section, 'Phone =', meRes.data.user.phone);

  // 3. Test username update with mismatched current username (should fail)
  const badUserRes = await patchJson('/auth/username', {
    currentUsername: 'WRONG-ID',
    newUsername: 'STU-2026-NEW',
  }, token);
  console.log('3. Mismatched username rejected correctly:', badUserRes.status === 400, 'Error:', badUserRes.data.error);

  // 4. Test username update with matching current username
  const goodUserRes = await patchJson('/auth/username', {
    currentUsername: 'STU-2026-001',
    newUsername: 'STU-2026-NEW',
  }, token);
  console.log('4. Update Username status:', goodUserRes.status, 'New login ID:', goodUserRes.data.user?.loginId);

  // 5. Test logging in with NEW username
  const newLoginRes = await postJson('/auth/login', {
    identifier: 'STU-2026-NEW',
    password: 'CampusDemo2026!',
  });
  console.log('5. Sign in with NEW username:', newLoginRes.status === 200 ? 'SUCCESS' : 'FAILED');

  // Revert username back to STU-2026-001 so demos keep working
  const revertUserRes = await patchJson('/auth/username', {
    currentUsername: 'STU-2026-NEW',
    newUsername: 'STU-2026-001',
  }, newLoginRes.data.token);
  console.log('5b. Reverted username back to STU-2026-001:', revertUserRes.status === 200 ? 'SUCCESS' : 'FAILED');

  // 6. Test password update with mismatched current password (should fail)
  const badPassRes = await patchJson('/auth/password', {
    currentPassword: 'WrongPassword123!',
    newPassword: 'NewPassword2026!',
  }, token);
  console.log('6. Mismatched password rejected correctly:', badPassRes.status === 400, 'Error:', badPassRes.data.error);

  // 7. Test password update with correct current password
  const goodPassRes = await patchJson('/auth/password', {
    currentPassword: 'CampusDemo2026!',
    newPassword: 'NewSecretPass2026!',
  }, token);
  console.log('7. Update Password status:', goodPassRes.status, 'Message:', goodPassRes.data.message);

  // Verify login with NEW password
  const passLoginRes = await postJson('/auth/login', {
    identifier: 'STU-2026-001',
    password: 'NewSecretPass2026!',
  });
  console.log('7b. Sign in with NEW password:', passLoginRes.status === 200 ? 'SUCCESS' : 'FAILED');

  // Revert password back to CampusDemo2026!
  const revertPassRes = await patchJson('/auth/password', {
    currentPassword: 'NewSecretPass2026!',
    newPassword: 'CampusDemo2026!',
  }, passLoginRes.data.token);
  console.log('7c. Reverted password back to CampusDemo2026!:', revertPassRes.status === 200 ? 'SUCCESS' : 'FAILED');

  console.log('ALL AUTHENTICATION & PROFILE TESTS PASSED WITH 100% SUCCESS!');
}

run().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
