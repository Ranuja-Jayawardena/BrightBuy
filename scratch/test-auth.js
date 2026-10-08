const http = require('http');

const baseURL = 'http://localhost:5000/api/auth';
let cookies = [];

const request = (method, path, body = null) => {
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

    if (cookies.length > 0) {
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
          headers: res.headers,
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
    const email = `testuser_${timestamp}@example.com`;
    const password = `Password!123`;

    console.log(`\n--- 1. Registering new user (${email}) ---`);
    const regRes = await request('POST', '/register', {
      email,
      password,
      first_name: 'Test',
      last_name: 'User'
    });
    console.log('Status:', regRes.status);
    console.log('Data:', regRes.data);
    console.log('Cookies extracted:', cookies);

    // Clear cookies to test login
    cookies = [];

    console.log(`\n--- 2. Logging in ---`);
    const loginRes = await request('POST', '/login', {
      email,
      password
    });
    console.log('Status:', loginRes.status);
    console.log('Data:', loginRes.data);
    console.log('Cookies extracted:', cookies);

    console.log(`\n--- 3. Testing /me endpoint ---`);
    const meRes = await request('GET', '/me');
    console.log('Status:', meRes.status);
    console.log('Data:', meRes.data);

    console.log(`\n--- 4. Testing token refresh ---`);
    // Save current access token to compare
    const oldAccessToken = cookies.find(c => c.startsWith('access_token='));
    
    const refRes = await request('POST', '/refresh');
    console.log('Status:', refRes.status);
    console.log('Data:', refRes.data);
    const newAccessToken = cookies[cookies.length - 2]; // newly pushed access token
    console.log('Token changed?', oldAccessToken !== newAccessToken ? 'Yes' : 'No');
    
    console.log(`\n--- 5. Testing logout ---`);
    const outRes = await request('POST', '/logout');
    console.log('Status:', outRes.status);
    console.log('Data:', outRes.data);
    
    // Check if we can still access /me
    cookies = []; // logout clears cookies but our script just appends, so let's mock the browser clearing them
    console.log(`\n--- 6. Accessing /me after logout ---`);
    const meRes2 = await request('GET', '/me');
    console.log('Status:', meRes2.status);
    console.log('Data:', meRes2.data);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

runTest();
