#!/usr/bin/env node

/**
 * Test Drizzle Field Mapping
 * 
 * Test if our Drizzle schema properly maps camelCase to snake_case
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { pgTable, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { eq } = require('drizzle-orm');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Recreate the schema in JavaScript
const better_auth_users = pgTable('better_auth_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  role: text('role').default('runner'),
  fullName: text('full_name'),
});

const better_auth_accounts = pgTable('better_auth_accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

const db = drizzle(pool);

async function testDrizzleMapping() {
  console.log('🔧 Testing Drizzle field mapping...');
  
  try {
    // Test querying with camelCase field names
    console.log('\n1. Testing user query...');
    const users = await db.select().from(better_auth_users)
      .where(eq(better_auth_users.email, 'testcoach@ultracoach.dev'))
      .limit(1);
    
    if (users.length > 0) {
      const user = users[0];
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,  // camelCase field
        name: user.name,
        role: user.role,
        createdAt: user.createdAt, // camelCase field
        fullName: user.fullName    // camelCase field
      });
      
      // Test querying accounts with camelCase field names
      console.log('\n2. Testing account query...');
      const accounts = await db.select().from(better_auth_accounts)
        .where(eq(better_auth_accounts.userId, user.id))  // camelCase field
        .where(eq(better_auth_accounts.providerId, 'credential')) // camelCase field
        .limit(1);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        console.log('✅ Account found:', {
          id: account.id,
          accountId: account.accountId,   // camelCase field
          providerId: account.providerId, // camelCase field
          userId: account.userId,         // camelCase field
          hasPassword: !!account.password,
          passwordLength: account.password ? account.password.length : 0,
          passwordPreview: account.password ? account.password.substring(0, 20) + '...' : 'null',
          createdAt: account.createdAt,   // camelCase field
          updatedAt: account.updatedAt    // camelCase field
        });
        
        // Test the password hash format
        if (account.password) {
          console.log('\n3. Testing password hash format...');
          console.log('✅ Password hash format check:', {
            isBcrypt: account.password.startsWith('$2b$'),
            length: account.password.length,
            hasValidBcryptStructure: /^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/.test(account.password)
          });
        }
        
      } else {
        console.log('❌ No account found with camelCase queries');
      }
      
    } else {
      console.log('❌ No user found');
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testDrizzleMapping();