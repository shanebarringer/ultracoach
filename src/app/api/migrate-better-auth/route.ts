import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Starting Better Auth migration...');

    // Create better_auth_users table
    const { error: usersError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS better_auth_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          email_verified BOOLEAN DEFAULT FALSE,
          name TEXT,
          image TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          role TEXT DEFAULT 'runner' CHECK (role IN ('runner', 'coach')),
          full_name TEXT
        );
      `
    });

    if (usersError) {
      console.error('Failed to create better_auth_users table:', usersError);
      return NextResponse.json({ error: 'Failed to create users table', details: usersError }, { status: 500 });
    }

    // Create better_auth_accounts table
    const { error: accountsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS better_auth_accounts (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          provider_id TEXT NOT NULL,
          user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
          access_token TEXT,
          refresh_token TEXT,
          id_token TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          password TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(provider_id, account_id)
        );
      `
    });

    if (accountsError) {
      console.error('Failed to create better_auth_accounts table:', accountsError);
      return NextResponse.json({ error: 'Failed to create accounts table', details: accountsError }, { status: 500 });
    }

    // Create better_auth_sessions table
    const { error: sessionsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS better_auth_sessions (
          id TEXT PRIMARY KEY,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          token TEXT NOT NULL UNIQUE,
          user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (sessionsError) {
      console.error('Failed to create better_auth_sessions table:', sessionsError);
      return NextResponse.json({ error: 'Failed to create sessions table', details: sessionsError }, { status: 500 });
    }

    // Create better_auth_verification_tokens table
    const { error: tokensError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS better_auth_verification_tokens (
          id TEXT PRIMARY KEY,
          identifier TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(identifier, token)
        );
      `
    });

    if (tokensError) {
      console.error('Failed to create better_auth_verification_tokens table:', tokensError);
      return NextResponse.json({ error: 'Failed to create verification tokens table', details: tokensError }, { status: 500 });
    }

    // Create indexes
    const { error: indexesError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_better_auth_users_email ON better_auth_users(email);
        CREATE INDEX IF NOT EXISTS idx_better_auth_accounts_user_id ON better_auth_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_user_id ON better_auth_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_token ON better_auth_sessions(token);
        CREATE INDEX IF NOT EXISTS idx_better_auth_verification_tokens_identifier ON better_auth_verification_tokens(identifier);
      `
    });

    if (indexesError) {
      console.log('Index creation failed (might already exist):', indexesError);
    }

    // Migrate existing users
    const { data: existingUsers, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*');

    if (fetchError) {
      console.error('Failed to fetch existing users:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing users', details: fetchError }, { status: 500 });
    }

    console.log(`Found ${existingUsers.length} existing users to migrate`);

    // Migrate users
    for (const user of existingUsers) {
      console.log(`Migrating user: ${user.email}`);
      
      // Insert user into better_auth_users
      const { error: userError } = await supabaseAdmin
        .from('better_auth_users')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          full_name: user.full_name,
          created_at: user.created_at,
          updated_at: user.updated_at
        });

      if (userError) {
        console.error(`Failed to migrate user ${user.email}:`, userError);
        continue;
      }

      // Create account for password authentication
      if (user.password_hash) {
        const { error: accountError } = await supabaseAdmin
          .from('better_auth_accounts')
          .upsert({
            id: crypto.randomUUID(),
            account_id: user.email,
            provider_id: 'credential',
            user_id: user.id,
            password: user.password_hash,
            created_at: user.created_at,
            updated_at: user.updated_at
          });

        if (accountError && !accountError.message.includes('duplicate key')) {
          console.error(`Failed to create account for ${user.email}:`, accountError);
        }
      }
    }

    // Get migration results
    const { data: userCount } = await supabaseAdmin
      .from('better_auth_users')
      .select('id', { count: 'exact' });

    const { data: accountCount } = await supabaseAdmin
      .from('better_auth_accounts')
      .select('id', { count: 'exact' });

    return NextResponse.json({
      success: true,
      message: 'Better Auth migration completed successfully',
      results: {
        users_migrated: userCount?.length || 0,
        accounts_created: accountCount?.length || 0,
        original_users: existingUsers.length
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}