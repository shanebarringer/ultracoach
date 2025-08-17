#!/usr/bin/env node
// ESM module to test Better Auth initialization
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { customSession } from 'better-auth/plugins'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Load environment variables
config({ path: '.env.local' })

console.log('🔍 Testing Better Auth Initialization\n')

console.log('Environment check:')
console.log('- BETTER_AUTH_SECRET:', process.env.BETTER_AUTH_SECRET ? '[SET]' : 'MISSING')
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : 'MISSING')
console.log('- NODE_ENV:', process.env.NODE_ENV)
console.log()

try {
  // Create database connection
  console.log('Creating database connection...')
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing')
  }

  const sql = postgres(connectionString)
  const db = drizzle(sql)
  console.log('✓ Database connection created')

  // Create minimal schema objects (just the structure Better Auth needs)
  const userSchema = {
    $inferSelect: {},
    $inferInsert: {},
  }

  const accountSchema = {
    $inferSelect: {},
    $inferInsert: {},
  }

  const sessionSchema = {
    $inferSelect: {},
    $inferInsert: {},
  }

  const verificationSchema = {
    $inferSelect: {},
    $inferInsert: {},
  }

  console.log('Creating Better Auth instance...')

  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: userSchema,
        account: accountSchema,
        session: sessionSchema,
        verification: verificationSchema,
      },
    }),
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days
      freshAge: 60 * 60, // 1 hour
      updateAge: 60 * 60 * 24, // 24 hours
    },
    baseURL: 'http://localhost:3001/api/auth',
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        userType: {
          type: 'string',
          required: false,
          input: true,
          output: true,
        },
        fullName: {
          type: 'string',
          required: false,
          input: true,
          output: true,
        },
      },
    },
    plugins: [
      customSession(async ({ user, session }) => {
        return {
          user: {
            ...user,
            role: user.userType || 'runner',
          },
          session,
        }
      }),
    ],
  })

  console.log('✅ Better Auth initialized successfully!')

  // Test a simple API call
  console.log('\nTesting session API...')
  try {
    const testSession = await auth.api.getSession({
      headers: new Headers({
        cookie: 'test=value',
      }),
    })
    console.log('✓ Session API call successful (no active session)')
  } catch (apiError) {
    console.error('❌ Session API call failed:', apiError.message)
    throw apiError
  }
} catch (error) {
  console.error('❌ Better Auth initialization failed:')
  console.error('Error type:', error.constructor.name)
  console.error('Error message:', error.message)

  if (error.stack) {
    console.error('\nStack trace:')
    console.error(error.stack)
  }

  // Check for specific error patterns
  if (error.message.includes('hex string expected')) {
    console.error('\n🔧 This is likely a session token parsing issue.')
    console.error('Check your session table schema and existing session data.')
  }

  if (error.message.includes('relation') && error.message.includes('does not exist')) {
    console.error('\n🔧 Database table missing. Run database migrations.')
  }

  process.exit(1)
}
