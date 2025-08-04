import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { secureMiddleware } from '@/lib/db-context-enhanced'
import { createLogger } from '@/lib/logger'
import { coach_runners } from '@/lib/schema'

const logger = createLogger('api-training-plans')

export async function GET(request: NextRequest) {
  try {
    // Use secure middleware with RLS instead of admin client
    const auth = await secureMiddleware(request)

    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // First, get active relationships for the user
    let activeRelationships: Array<{ coach_id: string; runner_id: string }> = []

    if (auth.user.role === 'coach') {
      const relationships = await db
        .select({ coach_id: coach_runners.coach_id, runner_id: coach_runners.runner_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.coach_id, auth.user.id), eq(coach_runners.status, 'active')))
      activeRelationships = relationships
    } else {
      const relationships = await db
        .select({ coach_id: coach_runners.coach_id, runner_id: coach_runners.runner_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.runner_id, auth.user.id), eq(coach_runners.status, 'active')))
      activeRelationships = relationships
    }

    // If no active relationships, return empty array
    if (activeRelationships.length === 0) {
      return NextResponse.json({ trainingPlans: [] })
    }

    // Fetch training plans based on active relationships
    if (auth.user.role === 'coach') {
      // For coaches: get training plans for connected runners
      const runnerIds = activeRelationships.map(rel => rel.runner_id)
      const { data, error } = await auth.supabase
        .from('training_plans')
        .select('*, runners:runner_id(*)')
        .in('runner_id', runnerIds)
        .eq('coach_id', auth.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Failed to fetch training plans for coach', error)
        return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
      }
      return NextResponse.json({ trainingPlans: data || [] })
    } else {
      // For runners: get training plans from connected coaches
      const coachIds = activeRelationships.map(rel => rel.coach_id)
      const { data, error } = await auth.supabase
        .from('training_plans')
        .select('*, coaches:coach_id(*)')
        .in('coach_id', coachIds)
        .eq('runner_id', auth.user.id)
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

    const { title, description, runnerId, targetRaceDate, targetRaceDistance } =
      await request.json()

    if (!title || !runnerId) {
      return NextResponse.json({ error: 'Title and runner ID are required' }, { status: 400 })
    }

    // Verify the coach has an active relationship with this runner
    const activeRelationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.coach_id, auth.user.id),
          eq(coach_runners.runner_id, runnerId),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (activeRelationship.length === 0) {
      return NextResponse.json(
        {
          error:
            'You can only create training plans for runners you have an active relationship with',
        },
        { status: 403 }
      )
    }

    // Create the training plan - RLS policies will ensure only coaches can create plans
    const { data: trainingPlan, error: planError } = await auth.supabase
      .from('training_plans')
      .insert([
        {
          title,
          description,
          coach_id: auth.user.id,
          runner_id: runnerId,
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
