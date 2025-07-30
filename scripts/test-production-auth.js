#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testProductionAuth() {
  console.log('🔍 Testing Better Auth Configuration...\n');
  
  // Test 1: Environment Variables
  console.log('📋 Environment Variables:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? '[SET - ' + process.env.BETTER_AUTH_SECRET.length + ' chars]' : 'MISSING'}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : 'MISSING'}`);
  console.log(`  VERCEL_URL: ${process.env.VERCEL_URL || 'NOT_SET'}`);
  console.log(`  BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL || 'NOT_SET'}`);
  
  // Test 2: Database Connection
  console.log('\n🗄️  Testing Database Connection...');
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`  ✅ Database connected: ${result.rows[0].current_time}`);
    
    // Test 3: Check if Better Auth tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'better_auth_%'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Better Auth Tables:');
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    // Test 4: Check session table structure
    const sessionColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'better_auth_sessions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Session Table Structure:');
    sessionColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Test 5: Check for any existing sessions
    const sessionCount = await pool.query('SELECT COUNT(*) as count FROM better_auth_sessions');
    console.log(`\n📊 Existing sessions: ${sessionCount.rows[0].count}`);
    
    await pool.end();
    
  } catch (error) {
    console.error(`  ❌ Database error: ${error.message}`);
  }
  
  // Test 6: Better Auth Secret Validation
  console.log('\n🔐 Better Auth Secret Validation:');
  if (process.env.BETTER_AUTH_SECRET) {
    const secret = process.env.BETTER_AUTH_SECRET;
    
    // Check if it's a valid hex string
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (hexRegex.test(secret)) {
      console.log('  ✅ Secret is valid hex string');
    } else {
      console.log('  ❌ Secret is NOT a valid hex string - this could cause the error!');
    }
    
    if (secret.length >= 32) {
      console.log('  ✅ Secret length is sufficient');
    } else {
      console.log('  ❌ Secret is too short (should be at least 32 characters)');
    }
    
    // Check for common weak secrets
    const weakSecrets = ['your-secret-key', 'secret', 'password', 'development-secret'];
    if (weakSecrets.includes(secret)) {
      console.log('  ❌ Secret is a weak/default value');
    } else {
      console.log('  ✅ Secret is not a weak value');
    }
  } else {
    console.log('  ❌ BETTER_AUTH_SECRET is missing!');
  }
  
  console.log('\n🎯 Recommendations:');
  console.log('1. Ensure BETTER_AUTH_SECRET is set in your Vercel environment variables');
  console.log('2. Make sure the secret is a valid hex string (32+ characters)');
  console.log('3. Verify DATABASE_URL points to the correct production database');
  console.log('4. Check that all Better Auth tables exist in the database');
}

testProductionAuth(); 