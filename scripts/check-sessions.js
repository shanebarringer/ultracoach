#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSessions() {
  try {
    console.log('🔍 Checking better_auth_sessions table...\n');
    
    // Check table schema
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'better_auth_sessions'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Session table schema:');
    schema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check for any sessions
    const sessionCount = await pool.query(`
      SELECT COUNT(*) as count FROM better_auth_sessions
    `);
    
    console.log(`\n📊 Total sessions: ${sessionCount.rows[0].count}`);
    
    if (sessionCount.rows[0].count > 0) {
      // Check for potentially corrupted sessions
      const sessions = await pool.query(`
        SELECT id, token, user_id, expires_at, created_at, updated_at
        FROM better_auth_sessions
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      console.log('\n🔍 Recent sessions:');
      sessions.rows.forEach((session, index) => {
        console.log(`\n  Session ${index + 1}:`);
        console.log(`    ID: ${session.id}`);
        console.log(`    Token: ${session.token ? session.token.substring(0, 20) + '...' : 'NULL'}`);
        console.log(`    User ID: ${session.user_id}`);
        console.log(`    Expires: ${session.expires_at}`);
        console.log(`    Created: ${session.created_at}`);
        console.log(`    Updated: ${session.updated_at}`);
        
        // Check for potential issues
        if (!session.token) {
          console.log('    ⚠️  WARNING: Token is NULL!');
        }
        if (session.token && session.token.length < 10) {
          console.log('    ⚠️  WARNING: Token seems too short!');
        }
        if (session.expires_at && new Date(session.expires_at) < new Date()) {
          console.log('    ⚠️  WARNING: Session is expired!');
        }
      });
    }
    
    // Check for any sessions with NULL tokens (this would cause the hex string error)
    const nullTokens = await pool.query(`
      SELECT COUNT(*) as count FROM better_auth_sessions WHERE token IS NULL
    `);
    
    if (nullTokens.rows[0].count > 0) {
      console.log(`\n❌ CRITICAL: Found ${nullTokens.rows[0].count} sessions with NULL tokens!`);
      console.log('This will cause "hex string expected" errors.');
    } else {
      console.log('\n✅ No sessions with NULL tokens found.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessions(); 