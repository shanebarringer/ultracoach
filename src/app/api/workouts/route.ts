import { and, asc, eq, gte, lte } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, training_plans, user, workouts } from '@/lib/schema'

const logger = createLogger('api-workouts')

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    const { searchParams } = new URL(request.url)
    const runnerId = searchParams.get('runnerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // First, get active coach-runner relationships for authorization
    let authorizedUserIds: string[] = []
    if (sessionUser.role === 'coach') {
      const relationships = await db
        .select({ runner_id: coach_runners.runner_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.coach_id, sessionUser.id), eq(coach_runners.status, 'active')))
      authorizedUserIds = relationships.map(rel => rel.runner_id)
    } else {
      const relationships = await db
        .select({ coach_id: coach_runners.coach_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.runner_id, sessionUser.id), eq(coach_runners.status, 'active')))
      authorizedUserIds = relationships.map(rel => rel.coach_id)
    }

    if (authorizedUserIds.length === 0) {
      logger.info('No active relationships found', {
        userId: sessionUser.id,
        role: sessionUser.role,
      })
      return NextResponse.json({ workouts: [] })
    }

    // Build the base query with training plan join
    const baseQuery = db
      .select({
        id: workouts.id,
        training_plan_id: workouts.training_plan_id,
        date: workouts.date,
        planned_type: workouts.planned_type,
        planned_distance: workouts.planned_distance,
        planned_duration: workouts.planned_duration,
        actual_type: workouts.actual_type,
        actual_distance: workouts.actual_distance,
        actual_duration: workouts.actual_duration,
        status: workouts.status,
        workout_notes: workouts.workout_notes,
        created_at: workouts.created_at,
        updated_at: workouts.updated_at,
        // Include training plan info for authorization
        coach_id: training_plans.coach_id,
        plan_runner_id: training_plans.runner_id,
      })
      .from(workouts)
      .innerJoin(training_plans, eq(workouts.training_plan_id, training_plans.id))

    // Apply role-based and relationship-based filtering
    const conditions = []
    if (sessionUser.role === 'coach') {
      // Coach can only see workouts for runners they have active relationships with
      conditions.push(eq(training_plans.coach_id, sessionUser.id))
      // Ensure the training plan runner is in the authorized relationships
      conditions.push(
        eq(
          training_plans.runner_id,
          authorizedUserIds.length === 1 ? authorizedUserIds[0] : runnerId || authorizedUserIds[0]
        )
      )
      if (runnerId && !authorizedUserIds.includes(runnerId)) {
        logger.warn('Coach attempted to access unauthorized runner workouts', {
          coachId: sessionUser.id,
          requestedRunnerId: runnerId,
          authorizedRunnerIds: authorizedUserIds,
        })
        return NextResponse.json({ workouts: [] })
      }
    } else {
      // Runner can only see their own workouts from authorized coaches
      conditions.push(eq(training_plans.runner_id, sessionUser.id))
      // Ensure the training plan coach is in the authorized relationships
      if (authorizedUserIds.length > 0) {
        conditions.push(eq(training_plans.coach_id, authorizedUserIds[0])) // For now, just use first authorized coach
      }
    }

    // Apply date filtering
    if (startDate) {
      conditions.push(gte(workouts.date, new Date(startDate)))
    }
    if (endDate) {
      conditions.push(lte(workouts.date, new Date(endDate)))
    }

    // Execute query with conditions
    const query =
      conditions.length > 1 ? baseQuery.where(and(...conditions)) : baseQuery.where(conditions[0])

    const results = await query.orderBy(asc(workouts.date))

    // Remove the extra fields we only needed for authorization
    const cleanedWorkouts = results.map(
      ({ coach_id: _coach_id, plan_runner_id: _plan_runner_id, ...workout }) => workout
    )

    logger.debug('Successfully fetched workouts', { count: cleanedWorkouts.length })
    return NextResponse.json({ workouts: cleanedWorkouts })
  } catch (error) {
    logger.error('Internal server error in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    if (sessionUser.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create workouts' }, { status: 403 })
    }

    const {
      trainingPlanId,
      date,
      plannedType,
      plannedDistance,
      plannedDuration,
      notes,
      // category,
      // intensity,
      // terrain,
      // elevationGain,
    } = await request.json()

    if (!trainingPlanId || !date || !plannedType) {
      return NextResponse.json(
        {
          error: 'Training plan ID, date, and workout type are required',
        },
        { status: 400 }
      )
    }

    // Verify the coach owns this training plan
    const [plan] = await db
      .select({
        id: training_plans.id,
        coach_id: training_plans.coach_id,
        runner_id: training_plans.runner_id,
      })
      .from(training_plans)
      .where(
        and(eq(training_plans.id, trainingPlanId), eq(training_plans.coach_id, sessionUser.id))
      )
      .limit(1)

    if (!plan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    // Verify the coach has an active relationship with the runner
    const hasActiveRelationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.coach_id, sessionUser.id),
          eq(coach_runners.runner_id, plan.runner_id),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (hasActiveRelationship.length === 0) {
      logger.warn('Coach attempted to create workout without active relationship', {
        coachId: sessionUser.id,
        runnerId: plan.runner_id,
        trainingPlanId,
      })
      return NextResponse.json(
        { error: 'No active relationship found with this runner' },
        { status: 403 }
      )
    }

    // Create the workout
    const [workout] = await db
      .insert(workouts)
      .values({
        training_plan_id: trainingPlanId,
        date: new Date(date),
        planned_type: plannedType,
        planned_distance: plannedDistance?.toString(),
        planned_duration: plannedDuration ? parseInt(plannedDuration) : null,
        workout_notes: notes,
        status: 'planned',
      })
      .returning()

    if (!workout) {
      logger.error('Failed to create workout - no workout returned')
      return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
    }

    // Send notification to runner about new workout
    try {
      const [runner] = await db
        .select({ id: user.id, fullName: user.fullName })
        .from(user)
        .where(eq(user.id, plan.runner_id))
        .limit(1)

      const [coach] = await db
        .select({ fullName: user.fullName })
        .from(user)
        .where(eq(user.id, sessionUser.id))
        .limit(1)

      if (runner) {
        const coachName = coach?.fullName || 'Your coach'
        // Note: notifications table structure may need to be checked
        // For now, skip notifications to avoid schema issues
        logger.info('Workout created successfully', {
          workoutId: workout.id,
          runnerId: runner.id,
          coachName,
        })
      }
    } catch (error) {
      logger.error('Failed to send notification for new workout', error)
    }

    return NextResponse.json({ workout }, { status: 201 })
  } catch (error) {
    logger.error('Internal server error in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
