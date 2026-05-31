const http = require('http');

const request = (path, method, data, token) => {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(dataString);
    }
    req.end();
  });
};

(async () => {
  try {
    console.log('Logging in as Faculty...');
    const facultyLogin = await request('/api/t/td/auth/login', 'POST', {
      email: 'f1@testdomain.ac.in',
      password: 'WwQzML#^r%E@iV'
    });
    console.log('Faculty Login:', facultyLogin.data.success);
    const facultyToken = facultyLogin.data.token;
    
    if (!facultyToken) {
        console.log('Failed to login', facultyLogin);
        return;
    }

    console.log('Fetching Faculty Tests...');
    const facultyTests = await request('/api/t/td/attendance/faculty/tests', 'GET', null, facultyToken);
    console.log('Faculty Tests:', facultyTests.data);

    console.log('\nLogging in as Student...');
    const studentLogin = await request('/api/t/td/auth/login', 'POST', {
      email: 's1@testdomain.ac.in',
      password: 'Hm5vPg7PZ%jam^'
    });
    console.log('Student Login:', studentLogin.data.success);
    const studentToken = studentLogin.data.token;

    console.log('Fetching Student Attendance Summary...');
    const studentSummary = await request('/api/t/td/attendance/student/summary', 'GET', null, studentToken);
    console.log('Student Summary:', studentSummary.data);
    
  } catch (err) {
    console.error(err);
  }
})();
