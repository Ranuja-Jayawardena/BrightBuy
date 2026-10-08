const http = require('http');

let cookies = [];

const request = (method, path, body = null, useCookies = true) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/auth${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (useCookies && cookies.length > 0) {
      options.headers['Cookie'] = cookies.join('; ');
    }

    if (body) {
      const bodyData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(options, (res) => {
      let data = '';

      if (res.headers['set-cookie']) {
        res.headers['set-cookie'].forEach(c => {
          cookies.push(c.split(';')[0]);
        });
      }

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTest = async () => {
  try {
    const timestamp = Date.now();
    const customerEmail = `customer_${timestamp}@example.com`;
    const password = `Password!123`;

    console.log(`\n--- 1. Testing Unauthenticated Access ---`);
    const noAuthRes = await request('GET', '/test-auth', null, false);
    console.log('Status:', noAuthRes.status);
    console.log('Data:', noAuthRes.data);

    console.log(`\n--- 2. Registering Customer ---`);
    const regRes = await request('POST', '/register', {
      email: customerEmail,
      password,
      first_name: 'Test',
      last_name: 'Customer'
    });
    console.log('Status:', regRes.status);
    
    console.log(`\n--- 3. Testing Authenticated Access (/test-auth) ---`);
    const authRes = await request('GET', '/test-auth');
    console.log('Status:', authRes.status);
    console.log('User Payload:', authRes.data.user);

    console.log(`\n--- 4. Testing Admin Role Guard as Customer (/test-admin) ---`);
    const adminRes = await request('GET', '/test-admin');
    console.log('Status:', adminRes.status);
    console.log('Data:', adminRes.data);

    // Need to test an admin user. We'll register an employee directly in the DB using db config
    process.env.DB_PORT = 5433;
    const db = require('../backend/src/config/db');
    
    const adminEmail = `admin_${timestamp}@example.com`;
    const passwordUtil = require('../backend/src/utils/password');
    const hash = await passwordUtil.hashPassword(password);
    
    const userRes = await db.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin') RETURNING user_id",
      [adminEmail, hash]
    );
    const adminId = userRes.rows[0].user_id;
    await db.query(
      "INSERT INTO employees (user_id, first_name, last_name) VALUES ($1, 'Admin', 'User')",
      [adminId]
    );

    console.log(`\n--- 5. Logging in as Admin ---`);
    cookies = []; // clear cookies
    const loginRes = await request('POST', '/login', {
      email: adminEmail,
      password
    });
    console.log('Status:', loginRes.status);

    console.log(`\n--- 6. Testing Admin Role Guard as Admin (/test-admin) ---`);
    const adminSuccessRes = await request('GET', '/test-admin');
    console.log('Status:', adminSuccessRes.status);
    console.log('Data:', adminSuccessRes.data);
    
    console.log(`\n--- 7. Testing Authenticated Access as Admin (/test-auth) ---`);
    const adminAuthRes = await request('GET', '/test-auth');
    console.log('Status:', adminAuthRes.status);
    console.log('User Payload:', adminAuthRes.data.user);

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

runTest();
