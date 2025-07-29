#!/usr/bin/env node

/**
 * Simulate Better Auth Query Pattern
 * 
 * Replicate exactly what Better Auth would do to find a user and password
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { pgTable, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { eq, and } = require('drizzle-orm');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Recreate Better Auth schema exactly
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

async function simulateBetterAuthLogin() {
  const email = 'testcoach@ultracoach.dev';
  const testPassword = 'password123';
  
  console.log('🔧 Simulating Better Auth login process...');
  console.log('Email:', email);
  
  try {
    // Step 1: Find user by email (what Better Auth does first)
    console.log('\n1. Finding user by email...');
    const users = await db.select()
      .from(better_auth_users)
      .where(eq(better_auth_users.email, email))
      .limit(1);
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified
    });
    
    // Step 2: Find credential account (what Better Auth does for password login)
    console.log('\n2. Finding credential account...');
    const accounts = await db.select()
      .from(better_auth_accounts)
      .where(and(
        eq(better_auth_accounts.userId, user.id),
        eq(better_auth_accounts.providerId, 'credential')
      ))
      .limit(1);
      
    if (accounts.length === 0) {
      console.log('❌ No credential account found');
      return;
    }
    
    const account = accounts[0];
    console.log('✅ Credential account found:', {
      id: account.id,
      accountId: account.accountId,
      providerId: account.providerId,
      userId: account.userId,
      hasPassword: !!account.password,
      passwordLength: account.password ? account.password.length : 0
    });
    
    // Step 3: Check password format
    if (!account.password) {
      console.log('❌ Password is null/undefined');
      return;
    }
    
    console.log('\n3. Checking password hash...');
    console.log('✅ Password hash details:', {
      type: typeof account.password,
      length: account.password.length,
      isBcrypt: account.password.startsWith('$2b$'),
      preview: account.password.substring(0, 20) + '...',
      isValidBcryptFormat: /^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/.test(account.password)
    });
    
    // Step 4: Test password verification (simulate what Better Auth does)
    console.log('\n4. Testing password verification...');
    const bcrypt = require('bcrypt');
    
    try {
      const isValid = await bcrypt.compare(testPassword, account.password);
      console.log('✅ Password verification result:', isValid);
      
      if (isValid) {
        console.log('🎉 Login should succeed!');
      } else {
        console.log('❌ Password mismatch');
      }
      
    } catch (bcryptError) {
      console.log('❌ bcrypt error:', bcryptError.message);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

simulateBetterAuthLogin();