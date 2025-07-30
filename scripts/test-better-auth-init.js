#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testBetterAuthInit() {
  console.log('🔍 Testing Better Auth Initialization...\n');
  
  // Test 1: Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? '[SET - ' + process.env.BETTER_AUTH_SECRET.length + ' chars]' : 'MISSING'}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : 'MISSING'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  
  // Test 2: Try to import and initialize Better Auth
  console.log('\n🔧 Testing Better Auth Import...');
  try {
    // This will test if the better-auth module can be imported
    const { betterAuth } = require('better-auth');
    console.log('✅ better-auth module imported successfully');
    
    // Test 3: Try to create a basic Better Auth instance
    console.log('\n🔧 Testing Better Auth Instance Creation...');
    
    // We'll test with a minimal configuration
    const testAuth = betterAuth({
      secret: process.env.BETTER_AUTH_SECRET || 'test-secret',
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
      },
      emailAndPassword: {
        enabled: true,
      },
    });
    
    console.log('✅ Better Auth instance created successfully');
    console.log(`  Has handler: ${!!testAuth.handler}`);
    console.log(`  Has API: ${!!testAuth.api}`);
    
  } catch (error) {
    console.error('❌ Better Auth initialization failed:', error.message);
    console.error('  Stack:', error.stack);
  }
  
  // Test 4: Check if the issue is with the database adapter
  console.log('\n🗄️  Testing Database Connection...');
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Database connected: ${result.rows[0].current_time}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
  
  // Test 5: Check if the issue is with the drizzle adapter
  console.log('\n📊 Testing Drizzle Adapter...');
  try {
    const { drizzleAdapter } = require('better-auth/adapters/drizzle');
    console.log('✅ Drizzle adapter imported successfully');
  } catch (error) {
    console.error('❌ Drizzle adapter import failed:', error.message);
  }
}

testBetterAuthInit().catch(console.error); 