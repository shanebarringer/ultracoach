// EXAMPLE: Properly integrated RLS approach for training-plans API
// This shows how to use both application-level AND database-level security
import { NextRequest, NextResponse } from 'next/server'

import { createUserSupabaseClient, setContextFromSession } from '@/lib/db-context'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api-training-plans-rls')

export async function GET(request: NextRequest) {
  try {
    // Set database user context from Better Auth session (for RLS)
    const userId = await setContextFromSession(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create user-aware Supabase client (uses RLS policies automatically)
    const supabase = await createUserSupabaseClient(userId, request.headers)

    // RLS policies will automatically filter results based on user context
    const { data, error } = await supabase
      .from('training_plans')
      .select('*, runners:runner_id(*), coaches:coach_id(*)')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch training plans', error)
      return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
    }

    return NextResponse.json({ trainingPlans: data || [] })
  } catch (error) {
    logger.error('Internal server error in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Set database user context from Better Auth session
    const userId = await setContextFromSession(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, runnerEmail, targetRaceDate, targetRaceDistance } =
      await request.json()

    if (!title || !runnerEmail) {
      return NextResponse.json({ error: 'Title and runner email are required' }, { status: 400 })
    }

    // Create user-aware Supabase client
    const supabase = await createUserSupabaseClient(userId, request.headers)

    // Find the runner by email (application-level check)
    const { data: runner, error: runnerError } = await supabase
      .from('better_auth_users')
      .select('*')
      .eq('email', runnerEmail)
      .eq('role', 'runner')
      .single()

    if (runnerError || !runner) {
      return NextResponse.json({ error: 'Runner not found with that email' }, { status: 404 })
    }

    // RLS policies will automatically ensure user can only create plans they're authorized for
    const { data: trainingPlan, error: planError } = await supabase
      .from('training_plans')
      .insert([
        {
          title,
          description,
          coach_id: userId, // Current user (verified by RLS)
          runner_id: runner.id,
          target_race_date: targetRaceDate || null,
          target_race_distance: targetRaceDistance || null,
        },
      ])
      .select()
      .single()

    if (planError) {
      logger.error('Failed to create training plan', planError)
      return NextResponse.json({ error: 'Failed to create training plan' }, { status: 500 })
    }

    return NextResponse.json({ trainingPlan }, { status: 201 })
  } catch (error) {
    logger.error('Internal server error in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/*
SECURITY BENEFITS OF THIS APPROACH:
1. Defense in depth: Both application-level checks AND RLS policies
2. Automatic user context: RLS policies work correctly
3. Reduced code: No manual permission checks needed for basic CRUD
4. Consistent security: All database operations respect user context
5. Future-proof: New tables automatically get RLS protection

MIGRATION STRATEGY:
1. Update one API route at a time
2. Test thoroughly with different user roles
3. Verify RLS policies work as expected
4. Remove redundant manual permission checks gradually
*/
