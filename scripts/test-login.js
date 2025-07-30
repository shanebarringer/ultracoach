#!/usr/bin/env node

const https = require('https');

async function testLogin() {
  console.log('🔍 Testing Login Process...\n');
  
  const testData = {
    email: 'testcoach@ultracoach.dev',
    password: 'password123'
  };
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'ultracoach-hawqljwys-shane-hehims-projects.vercel.app',
    port: 443,
    path: '/api/auth/sign-in/email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'UltraCoach-Debug-Script'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📊 Response Status:', res.statusCode);
        console.log('📋 Response Headers:');
        Object.keys(res.headers).forEach(key => {
          if (key.toLowerCase().includes('set-cookie') || key.toLowerCase().includes('content-type')) {
            console.log(`  ${key}: ${res.headers[key]}`);
          }
        });
        
        try {
          const jsonData = JSON.parse(data);
          console.log('📄 Response Body:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('📄 Raw Response:', data);
        }
        
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

testLogin().catch(console.error); 