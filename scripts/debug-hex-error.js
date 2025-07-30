#!/usr/bin/env node

const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

async function debugHexError() {
  console.log('🔍 Debugging Hex String Error...\n');
  
  // Test 1: Check the secret format
  console.log('📋 Secret Analysis:');
  const secret = process.env.BETTER_AUTH_SECRET;
  
  if (!secret) {
    console.log('❌ BETTER_AUTH_SECRET is missing!');
    return;
  }
  
  console.log(`  Length: ${secret.length} characters`);
  console.log(`  Raw value: "${secret}"`);
  
  // Check for extra characters
  const trimmed = secret.trim();
  console.log(`  Trimmed length: ${trimmed.length} characters`);
  
  if (trimmed.length !== secret.length) {
    console.log('⚠️  Secret has leading/trailing whitespace!');
  }
  
  // Check if it's valid hex
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (hexRegex.test(trimmed)) {
    console.log('✅ Secret is valid hex string');
  } else {
    console.log('❌ Secret contains non-hex characters');
    console.log('  Invalid characters:', trimmed.replace(/[0-9a-fA-F]/g, ''));
  }
  
  // Test 2: Try to use the secret for crypto operations
  console.log('\n🔐 Crypto Test:');
  try {
    const testData = 'test-data-for-verification';
    const cipher = crypto.createCipher('aes256', trimmed);
    const encrypted = cipher.update(testData, 'utf8', 'hex') + cipher.final('hex');
    
    const decipher = crypto.createDecipher('aes256', trimmed);
    const decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    
    if (decrypted === testData) {
      console.log('✅ Secret works for crypto operations');
    } else {
      console.log('❌ Secret failed crypto verification');
    }
  } catch (error) {
    console.log('❌ Crypto test failed:', error.message);
  }
  
  // Test 3: Generate a proper secret for comparison
  console.log('\n🔄 Generate New Secret:');
  const newSecret = crypto.randomBytes(32).toString('hex');
  console.log(`  New secret: ${newSecret}`);
  console.log(`  Length: ${newSecret.length} characters`);
  
  // Test 4: Environment variable analysis
  console.log('\n🌍 Environment Analysis:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : 'MISSING'}`);
  
  // Test 5: Recommendations
  console.log('\n🎯 Recommendations:');
  if (trimmed.length !== 64) {
    console.log('1. ❌ Secret should be exactly 64 characters');
    console.log('2. 🔧 Update Vercel environment variable with the new secret above');
  } else if (!hexRegex.test(trimmed)) {
    console.log('1. ❌ Secret contains invalid characters');
    console.log('2. 🔧 Use only hexadecimal characters (0-9, a-f)');
  } else {
    console.log('1. ✅ Secret format looks correct');
    console.log('2. 🔍 The issue might be elsewhere');
  }
  
  console.log('3. 🧹 Clear any existing sessions');
  console.log('4. 🔄 Redeploy after updating the secret');
}

debugHexError(); 