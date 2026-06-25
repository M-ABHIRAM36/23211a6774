const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function Log(stack, level, pkg, message) {
  try {
    const authOptions = {
      hostname: '4.224.186.213',
      port: 80,
      path: '/evaluation-service/auth',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const creds = {
      email: '23211a6774@bvrit.ac.in',
      name: 'moguloju abhiram',
      rollNo: '23211a6774',
      accessCode: 'ahXjvp',
      clientID: '70ace46f-dbc8-4eab-a062-75d9a0d7a216',
      clientSecret: 'xaZpmDAMDTESDYus'
    };

    const authRes = await makeRequest(authOptions, creds);
    const token = authRes.access_token;

    const logOptions = {
      hostname: '4.224.186.213',
      port: 80,
      path: '/evaluation-service/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const logPayload = {
      stack,
      level,
      package: pkg,
      message
    };

    const logRes = await makeRequest(logOptions, logPayload);
    return logRes;
  } catch (error) {
    console.error('Log submission failed:', error.message);
  }
}

module.exports = Log;
