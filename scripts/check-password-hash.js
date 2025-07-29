#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPasswordHash() {
  try {
    const result = await pool.query(`
      SELECT ba.password, bu.email, bu.id
      FROM better_auth_accounts ba
      JOIN better_auth_users bu ON ba.user_id = bu.id
      WHERE bu.email = 'coach1@ultracoach.dev' AND ba.provider_id = 'credential'
    `);
    
    if (result.rows.length > 0) {
      const { password, email, id } = result.rows[0];
      console.log('✅ Found user:', email);
      console.log('✅ User ID:', id);
      console.log('✅ Password hash exists:', !!password);
      console.log('✅ Password hash length:', password ? password.length : 'null');
      console.log('✅ Password hash starts with $2b$:', password ? password.startsWith('$2b$') : 'false');
      console.log('✅ First 20 chars:', password ? password.substring(0, 20) : 'null');
    } else {
      console.log('❌ No password found for user');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPasswordHash();