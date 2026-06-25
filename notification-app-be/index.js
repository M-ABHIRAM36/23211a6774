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

async function run() {
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

    const getOptions = {
      hostname: '4.224.186.213',
      port: 80,
      path: '/evaluation-service/notifications',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const getRes = await makeRequest(getOptions);
    const notifications = getRes.notifications || [];

    const weights = {
      'Placement': 3,
      'Result': 2,
      'Event': 1
    };

    notifications.sort((a, b) => {
      const weightA = weights[a.Type] || 0;
      const weightB = weights[b.Type] || 0;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      const timeA = new Date(a.Timestamp.replace(' ', 'T')).getTime();
      const timeB = new Date(b.Timestamp.replace(' ', 'T')).getTime();
      return timeB - timeA;
    });

    const topTen = notifications.slice(0, 10);
    console.log(JSON.stringify(topTen, null, 2));

  } catch (error) {
    console.error('Execution failed:', error.message);
  }
}

run();
