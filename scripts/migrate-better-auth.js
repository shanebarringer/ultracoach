const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Starting Better Auth migration...');

  // Better Auth tables SQL
  const migrationSQL = `
    -- Create users table compatible with Better Auth
    CREATE TABLE IF NOT EXISTS better_auth_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN DEFAULT FALSE,
        name TEXT,
        image TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        -- Additional fields for UltraCoach
        role TEXT DEFAULT 'runner' CHECK (role IN ('runner', 'coach')),
        full_name TEXT
    );

    -- Create accounts table for Better Auth
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

    -- Create sessions table for Better Auth
    CREATE TABLE IF NOT EXISTS better_auth_sessions (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create verification tokens table
    CREATE TABLE IF NOT EXISTS better_auth_verification_tokens (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(identifier, token)
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_better_auth_users_email ON better_auth_users(email);
    CREATE INDEX IF NOT EXISTS idx_better_auth_accounts_user_id ON better_auth_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_user_id ON better_auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_token ON better_auth_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_better_auth_verification_tokens_identifier ON better_auth_verification_tokens(identifier);
  `;

  try {
    // Run the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Better Auth tables created successfully');

    // Now migrate existing users
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('*');

    if (fetchError) {
      console.error('Failed to fetch existing users:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${existingUsers.length} existing users to migrate`);

    // Migrate users one by one
    for (const user of existingUsers) {
      console.log(`Migrating user: ${user.email}`);
      
      // Insert user into better_auth_users
      const { error: userError } = await supabase
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
        const { error: accountError } = await supabase
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

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Add exec_sql function if it doesn't exist
async function createExecSqlFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
    if (error && !error.message.includes('already exists')) {
      console.log('Creating exec_sql function...');
      // If the function doesn't exist, we'll need to create it a different way
      // For now, let's run the migration differently
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

runMigration();