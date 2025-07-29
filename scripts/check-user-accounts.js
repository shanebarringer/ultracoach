#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUserAccounts() {
  console.log('🔧 Checking all user accounts...');
  
  try {
    // Get all users with testcoach email
    const usersResult = await pool.query(`
      SELECT id, email, name, role, email_verified, created_at
      FROM better_auth_users 
      WHERE email = 'testcoach@ultracoach.dev'
      ORDER BY created_at
    `);
    
    console.log(`\n📊 Found ${usersResult.rows.length} users with email 'testcoach@ultracoach.dev':`);
    
    for (let i = 0; i < usersResult.rows.length; i++) {
      const user = usersResult.rows[i];
      console.log(`\n${i + 1}. User:`, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.email_verified,
        createdAt: user.created_at
      });
      
      // Get accounts for this user
      const accountsResult = await pool.query(`
        SELECT id, account_id, provider_id, password IS NOT NULL as has_password,
               length(password) as password_length, created_at
        FROM better_auth_accounts 
        WHERE user_id = $1
        ORDER BY created_at
      `, [user.id]);
      
      console.log(`   Accounts (${accountsResult.rows.length}):`);
      accountsResult.rows.forEach((account, j) => {
        console.log(`   ${j + 1}.`, {
          id: account.id,
          accountId: account.account_id,
          providerId: account.provider_id,
          hasPassword: account.has_password,
          passwordLength: account.password_length,
          createdAt: account.created_at
        });
      });
    }
    
    // Also check for any other test users
    console.log('\n📊 Other test users:');
    const otherUsersResult = await pool.query(`
      SELECT id, email, name, role, created_at
      FROM better_auth_users 
      WHERE email LIKE '%coach%@ultracoach.dev' OR email LIKE '%test%'
      ORDER BY created_at
    `);
    
    otherUsersResult.rows.forEach((user, i) => {
      console.log(`${i + 1}.`, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserAccounts();