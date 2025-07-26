const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Starting Better Auth migration...')

    // Fetch existing users first
    const { data: existingUsers, error: fetchError } = await supabase.from('users').select('*')

    if (fetchError) {
      console.error('Failed to fetch existing users:', fetchError)
      return
    }

    console.log(`Found ${existingUsers.length} existing users to migrate`)

    // Since we can't run DDL through supabase.rpc, let's manually create the data
    // First, let's check if the tables exist by trying to query them
    const { data: betterAuthUsers, error: checkError } = await supabase
      .from('better_auth_users')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error(
        'Better Auth tables do not exist. Please run the SQL script manually in Supabase dashboard.'
      )
      console.log('Use the SQL script: better-auth-tables.sql')
      return
    }

    console.log('Better Auth tables exist, proceeding with data migration...')

    // Migrate users
    for (const user of existingUsers) {
      console.log(`Migrating user: ${user.email}`)

      // Insert user into better_auth_users
      const { error: userError } = await supabase.from('better_auth_users').upsert({
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })

      if (userError) {
        console.error(`Failed to migrate user ${user.email}:`, userError)
        continue
      }

      // Create account for password authentication
      if (user.password_hash) {
        const { error: accountError } = await supabase.from('better_auth_accounts').upsert({
          id: crypto.randomUUID(),
          account_id: user.email,
          provider_id: 'credential',
          user_id: user.id,
          password: user.password_hash,
          created_at: user.created_at,
          updated_at: user.updated_at,
        })

        if (accountError && !accountError.message.includes('duplicate key')) {
          console.error(`Failed to create account for ${user.email}:`, accountError)
        }
      }
    }

    // Get migration results
    const { data: userCount } = await supabase
      .from('better_auth_users')
      .select('id', { count: 'exact' })

    const { data: accountCount } = await supabase
      .from('better_auth_accounts')
      .select('id', { count: 'exact' })

    console.log('Migration Results:')
    console.log(`- Users migrated: ${userCount?.length || 0}`)
    console.log(`- Accounts created: ${accountCount?.length || 0}`)
    console.log(`- Original users: ${existingUsers.length}`)
    console.log('Better Auth migration completed successfully!')
  } catch (error) {
    console.error('Migration error:', error)
  }
}

runMigration()
