#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function clearSessions() {
  console.log('🧹 Clearing all Better Auth sessions...\n');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Count existing sessions
    const countResult = await pool.query('SELECT COUNT(*) as count FROM better_auth_sessions');
    const sessionCount = countResult.rows[0].count;
    
    console.log(`📊 Found ${sessionCount} existing sessions`);
    
    if (sessionCount > 0) {
      // Clear all sessions
      await pool.query('DELETE FROM better_auth_sessions');
      console.log('✅ All sessions cleared successfully');
    } else {
      console.log('ℹ️  No sessions to clear');
    }
    
    // Also clear verification tokens
    const tokenCountResult = await pool.query('SELECT COUNT(*) as count FROM better_auth_verification_tokens');
    const tokenCount = tokenCountResult.rows[0].count;
    
    if (tokenCount > 0) {
      await pool.query('DELETE FROM better_auth_verification_tokens');
      console.log(`✅ Cleared ${tokenCount} verification tokens`);
    }
    
    await pool.end();
    console.log('\n🎯 Sessions cleared. Try logging in again.');
    
  } catch (error) {
    console.error('❌ Error clearing sessions:', error.message);
  }
}

clearSessions(); 