import { NextRequest, NextResponse } from 'next/server'

import { adminOperations, secureMiddleware } from '@/lib/db-context-enhanced'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api-training-plans')

export async function GET(request: NextRequest) {
  try {
    // Use secure middleware with RLS instead of admin client
    const auth = await secureMiddleware(request)
    
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // RLS policies automatically filter based on user context
    if (auth.user.role === 'coach') {
      const { data, error } = await auth.supabase
        .from('training_plans')
        .select('*, runners:runner_id(*)')
        .order('created_at', { ascending: false })
      
      if (error) {
        logger.error('Failed to fetch training plans for coach', error)
        return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
      }
      return NextResponse.json({ trainingPlans: data || [] })
    } else {
      const { data, error } = await auth.supabase
        .from('training_plans')
        .select('*, coaches:coach_id(*)')
        .order('created_at', { ascending: false })
      
      if (error) {
        logger.error('Failed to fetch training plans for runner', error)
        return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
      }
      return NextResponse.json({ trainingPlans: data || [] })
    }
  } catch (error) {
    logger.error('Internal server error in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use secure middleware with RLS instead of admin client
    const auth = await secureMiddleware(request)
    
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (auth.user.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create training plans' }, { status: 403 })
    }

    const { title, description, runnerEmail, targetRaceDate, targetRaceDistance } =
      await request.json()
    
    if (!title || !runnerEmail) {
      return NextResponse.json({ error: 'Title and runner email are required' }, { status: 400 })
    }

    // Find the runner by email using controlled admin operation
    // This minimizes service role usage while allowing necessary functionality
    const runner = await adminOperations.findUserByEmail(runnerEmail, 'runner')

    if (!runner) {
      return NextResponse.json({ error: 'Runner not found with that email' }, { status: 404 })
    }

    // Create the training plan - RLS policies will ensure only coaches can create plans
    const { data: trainingPlan, error: planError } = await auth.supabase
      .from('training_plans')
      .insert([
        {
          title,
          description,
          coach_id: auth.user.id,
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
