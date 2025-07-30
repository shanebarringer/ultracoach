#!/usr/bin/env node

const https = require('https');

async function testSessionVerification() {
  console.log('🔍 Testing Session Verification...\n');
  
  // Test 1: Try to get session without any cookies
  console.log('📋 Test 1: Get session without cookies');
  await makeRequest('/api/auth/session', {});
  
  // Test 2: Try with a malformed session cookie
  console.log('\n📋 Test 2: Get session with malformed cookie');
  await makeRequest('/api/auth/session', {
    'Cookie': 'better-auth.session_token=invalid-token'
  });
  
  // Test 3: Try with a properly formatted but invalid session cookie
  console.log('\n📋 Test 3: Get session with invalid but properly formatted cookie');
  await makeRequest('/api/auth/session', {
    'Cookie': 'better-auth.session_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  });
}

async function makeRequest(path, headers = {}) {
  const options = {
    hostname: 'ultracoach-hawqljwys-shane-hehims-projects.vercel.app',
    port: 443,
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'UltraCoach-Debug-Script',
      ...headers
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Headers: ${JSON.stringify(res.headers, null, 2)}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`  Response: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (e) {
          console.log(`  Raw Response: ${data}`);
        }
        
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    
    req.on('error', (error) => {
      console.error(`  Error: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

testSessionVerification().catch(console.error); 