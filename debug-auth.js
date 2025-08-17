#!/usr/bin/env node

// Debug Better Auth initialization
const { execSync } = require('child_process')
const fs = require('fs')

console.log('🔍 Better Auth Debug Script\n')

// Check environment variables
console.log('1. Environment Variables:')
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const envVars = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))

  const authVars = envVars.filter(
    line =>
      line.includes('BETTER_AUTH') || line.includes('DATABASE_URL') || line.includes('SUPABASE')
  )

  authVars.forEach(line => {
    const [key] = line.split('=')
    console.log(`   ✓ ${key}: [SET]`)
  })
} catch (error) {
  console.log('   ❌ Cannot read .env.local:', error.message)
}

// Test database connection
console.log('\n2. Database Connection:')
try {
  const result = execSync('pnpm db:query "SELECT 1 as test;"', { encoding: 'utf8' })
  console.log('   ✓ Database connection working')
} catch (error) {
  console.log('   ❌ Database connection failed:', error.message)
}

// Check Better Auth tables
console.log('\n3. Better Auth Tables:')
const tables = [
  'better_auth_users',
  'better_auth_accounts',
  'better_auth_sessions',
  'better_auth_verification_tokens',
]

for (const table of tables) {
  try {
    const result = execSync(`pnpm db:query "SELECT COUNT(*) FROM ${table};"`, { encoding: 'utf8' })
    const count = result.match(/(\d+)/)?.[1] || '0'
    console.log(`   ✓ ${table}: ${count} records`)
  } catch (error) {
    console.log(`   ❌ ${table}: ${error.message}`)
  }
}

// Check test users
console.log('\n4. Test Users:')
try {
  const result = execSync(
    'pnpm db:query "SELECT email, user_type FROM better_auth_users WHERE email LIKE \'%ultracoach.dev%\' LIMIT 5;"',
    { encoding: 'utf8' }
  )
  console.log('   Test users found:')
  console.log(result)
} catch (error) {
  console.log('   ❌ Cannot fetch test users:', error.message)
}

console.log('\n5. Schema Validation:')
try {
  // Check session table structure
  const sessionSchema = execSync(
    'pnpm db:query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'better_auth_sessions\' ORDER BY ordinal_position;"',
    { encoding: 'utf8' }
  )
  console.log('   Session table schema:')
  console.log(sessionSchema)
} catch (error) {
  console.log('   ❌ Cannot check schema:', error.message)
}
