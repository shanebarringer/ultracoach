#!/usr/bin/env node

/**
 * Debug Better Auth Database Query
 * 
 * Test if Better Auth can properly query the database with our schema
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');
require('dotenv').config({ path: '.env.local' });

// Import our schema
const { better_auth_users, better_auth_accounts } = require('../src/lib/schema.ts');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool);

async function testBetterAuthQuery() {
  console.log('🔧 Testing Better Auth database queries...');
  
  try {
    // Test 1: Query user with Drizzle using our schema
    console.log('\n1. Testing user query with Drizzle schema...');
    const userResult = await db.select().from(better_auth_users).where(eq(better_auth_users.email, 'testcoach@ultracoach.dev')).limit(1);
    
    if (userResult.length > 0) {
      console.log('✅ User found via Drizzle:', {
        id: userResult[0].id,
        email: userResult[0].email,
        emailVerified: userResult[0].emailVerified,
        name: userResult[0].name,
        role: userResult[0].role
      });
      
      // Test 2: Query account/password with Drizzle
      console.log('\n2. Testing account query with Drizzle schema...');
      const accountResult = await db.select().from(better_auth_accounts)
        .where(eq(better_auth_accounts.userId, userResult[0].id))
        .where(eq(better_auth_accounts.providerId, 'credential'))
        .limit(1);
      
      if (accountResult.length > 0) {
        console.log('✅ Account found via Drizzle:', {
          id: accountResult[0].id,
          accountId: accountResult[0].accountId,
          providerId: accountResult[0].providerId,
          userId: accountResult[0].userId,
          hasPassword: !!accountResult[0].password,
          passwordLength: accountResult[0].password ? accountResult[0].password.length : 0,
          passwordStart: accountResult[0].password ? accountResult[0].password.substring(0, 10) : 'null'
        });
      } else {
        console.log('❌ No account found via Drizzle');
      }
      
    } else {
      console.log('❌ No user found via Drizzle');
    }
    
    // Test 3: Raw SQL query to compare
    console.log('\n3. Testing raw SQL query for comparison...');
    const rawResult = await pool.query(`
      SELECT ba.password, ba.account_id, ba.provider_id, ba.user_id, bu.email 
      FROM better_auth_accounts ba
      JOIN better_auth_users bu ON ba.user_id = bu.id
      WHERE bu.email = $1 AND ba.provider_id = 'credential'
    `, ['testcoach@ultracoach.dev']);
    
    if (rawResult.rows.length > 0) {
      const row = rawResult.rows[0];
      console.log('✅ Account found via raw SQL:', {
        email: row.email,
        userId: row.user_id,
        accountId: row.account_id,
        providerId: row.provider_id,
        hasPassword: !!row.password,
        passwordLength: row.password ? row.password.length : 0,
        passwordStart: row.password ? row.password.substring(0, 10) : 'null'
      });
    } else {
      console.log('❌ No account found via raw SQL');
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testBetterAuthQuery();