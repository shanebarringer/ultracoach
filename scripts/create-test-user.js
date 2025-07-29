#!/usr/bin/env node

/**
 * Create Test User for Production
 * 
 * Creates a test user in the Better Auth tables for production testing
 */

const bcrypt = require('bcrypt')
const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function createTestUser() {
  console.log('🔧 Creating test user for production...')
  
  try {
    // Hash the password using bcrypt (Better Auth's default)
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Fixed user ID for testing
    const userId = '9f789919-9824-4733-a726-0bafbba146b3'
    const email = 'testcoach@ultracoach.dev'
    const fullName = 'Alex Ridge'
    const role = 'coach'
    
    // Check if user already exists in Better Auth tables
    const existingUser = await pool.query(
      'SELECT * FROM better_auth_users WHERE email = $1',
      [email]
    )
    
    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists in Better Auth tables')
      console.log('User details:', existingUser.rows[0])
      
      // Update password with proper bcrypt hash format
      console.log('🔄 Updating password with proper bcrypt hash format...')
      
      // Check if password exists
      const passwordCheck = await pool.query(
        'SELECT * FROM better_auth_accounts WHERE user_id = $1 AND provider_id = $2',
        [existingUser.rows[0].id, 'credential']
      )
      
      if (passwordCheck.rows.length === 0) {
        console.log('❌ No password found, creating password entry...')
        await pool.query(`
          INSERT INTO better_auth_accounts (
            id, account_id, provider_id, user_id,
            password, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, 'credential', $2,
            $3, NOW(), NOW()
          )
        `, [email, existingUser.rows[0].id, hashedPassword])
        console.log('✅ Created password entry')
      } else {
        console.log('✅ Password entry exists, updating with proper bcrypt hash...')
        // Update password to ensure it's correct
        await pool.query(
          'UPDATE better_auth_accounts SET password = $1, updated_at = NOW() WHERE user_id = $2 AND provider_id = $3',
          [hashedPassword, existingUser.rows[0].id, 'credential']
        )
        console.log('✅ Updated password with bcrypt hash')
      }
      
      // Also update email_verified to true
      await pool.query(
        'UPDATE better_auth_users SET email_verified = true, updated_at = NOW() WHERE id = $1',
        [existingUser.rows[0].id]
      )
      console.log('✅ Set email as verified')
      
      console.log('\n🎯 Test credentials:')
      console.log(`Email: ${email}`)
      console.log(`Password: ${password}`)
      console.log(`Role: ${role}`)
      
      return
    }
    
    // Create user in Better Auth tables
    const result = await pool.query(`
      INSERT INTO better_auth_users (
        id, email, name, email_verified, created_at, updated_at, role, full_name
      ) VALUES (
        $1, $2, $3, true, NOW(), NOW(), $4, $5
      ) RETURNING *
    `, [userId, email, fullName, role, fullName])
    
    console.log('✅ Created user in better_auth_users:', result.rows[0])
    
    // Create password entry
    await pool.query(`
      INSERT INTO better_auth_accounts (
        id, account_id, provider_id, user_id,
        password, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'credential', $2,
        $3, NOW(), NOW()
      )
    `, [email, userId, hashedPassword])
    
    console.log('✅ Created password entry in better_auth_accounts')
    
    console.log('\n🎯 Test credentials:')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log(`Role: ${role}`)
    
  } catch (error) {
    console.error('❌ Error creating test user:', error)
    
    // Try to check what tables exist and their schemas
    try {
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%auth%'
        ORDER BY table_name
      `)
      console.log('\n🔍 Available auth tables:', tables.rows.map(r => r.table_name))
      
      // Check schema of accounts table
      const accountsSchema = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'better_auth_accounts'
        ORDER BY ordinal_position
      `)
      console.log('\n🔍 better_auth_accounts columns:', accountsSchema.rows)
      
    } catch (tableError) {
      console.error('Could not check tables:', tableError.message)
    }
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  createTestUser()
}