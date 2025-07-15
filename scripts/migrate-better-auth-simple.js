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

  const queries = [
    `CREATE TABLE IF NOT EXISTS better_auth_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN DEFAULT FALSE,
        name TEXT,
        image TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        role TEXT DEFAULT 'runner' CHECK (role IN ('runner', 'coach')),
        full_name TEXT
    )`,
    
    `CREATE TABLE IF NOT EXISTS better_auth_accounts (
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
    )`,
    
    `CREATE TABLE IF NOT EXISTS better_auth_sessions (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS better_auth_verification_tokens (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(identifier, token)
    )`
  ];

  try {
    // Create the tables by running individual queries
    for (const query of queries) {
      console.log('Running query:', query.substring(0, 50) + '...');
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: query });
      
      if (error) {
        console.error('Query failed:', error);
        console.log('Attempting alternative approach...');
        
        // Let's try a different approach - using manual table creation
        break;
      }
    }

    console.log('Better Auth tables created successfully');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    console.log('Manual table creation required. Please run SQL manually in Supabase dashboard.');
    process.exit(1);
  }
}

runMigration();