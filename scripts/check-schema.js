#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    // Check column names in better_auth_accounts table
    const accountsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'better_auth_accounts'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 better_auth_accounts table schema:');
    accountsSchema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check what's actually in the accounts table
    const accountData = await pool.query(`
      SELECT id, account_id, provider_id, user_id, 
             password IS NOT NULL as has_password,
             length(password) as password_length
      FROM better_auth_accounts 
      WHERE provider_id = 'credential'
      LIMIT 3
    `);
    
    console.log('\n🔍 Sample account data:');
    accountData.rows.forEach(row => {
      console.log(`  ID: ${row.id}`);
      console.log(`  Account ID: ${row.account_id}`);
      console.log(`  Provider: ${row.provider_id}`);
      console.log(`  User ID: ${row.user_id}`);
      console.log(`  Has Password: ${row.has_password}`);
      console.log(`  Password Length: ${row.password_length}`);
      console.log('  ---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();