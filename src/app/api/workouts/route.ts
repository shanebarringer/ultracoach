import { endOfDay, isValid, parseISO } from 'date-fns'
import { SQL, and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'

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
    if (sessionUser.userType === 'coach') {
      const relationships = await db
        .select({ runner_id: coach_runners.runner_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.coach_id, sessionUser.id), eq(coach_runners.status, 'active')))
      authorizedUserIds = relationships.map(rel => rel.runner_id)
      logger.debug('Coach authorized runner IDs', {
        coachId: sessionUser.id,
        authorizedRunnersCount: authorizedUserIds.length,
      })
    } else {
      const relationships = await db
        .select({ coach_id: coach_runners.coach_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.runner_id, sessionUser.id), eq(coach_runners.status, 'active')))
      authorizedUserIds = relationships.map(rel => rel.coach_id)
      logger.debug('Runner authorized coach IDs', {
        runnerId: sessionUser.id,
        authorizedCoachesCount: authorizedUserIds.length,
      })
    }

    // Allow runners to see workouts even if they don't have active relationships yet
    // This handles the case where workouts exist but relationships might not be set up properly
    if (authorizedUserIds.length === 0 && sessionUser.userType === 'runner') {
      logger.info(
        'No active relationships found for runner, but allowing access to their own workouts',
        {
          userId: sessionUser.id,
          role: sessionUser.userType,
        }
      )
      // Don't return empty - continue to allow runner to see their workouts
    } else if (authorizedUserIds.length === 0 && sessionUser.userType === 'coach') {
      logger.info('No active relationships found for coach', {
        userId: sessionUser.id,
        role: sessionUser.userType,
      })
      return NextResponse.json({ workouts: [] })
    }

    // Build the base query with optional training plan join and runner name
    const baseQuery = db
      .select({
        id: workouts.id,
        user_id: workouts.user_id, // Add user_id field for filtering
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
        category: workouts.category,
        intensity: workouts.intensity,
        terrain: workouts.terrain,
        elevation_gain: workouts.elevation_gain,
        created_at: workouts.created_at,
        updated_at: workouts.updated_at,
        // Include training plan info for authorization (may be null)
        coach_id: training_plans.coach_id,
        plan_runner_id: training_plans.runner_id,
        // Include runner name for coach view
        runner_name: user.fullName,
        runner_email: user.email,
      })
      .from(workouts)
      .leftJoin(training_plans, eq(workouts.training_plan_id, training_plans.id))
      .leftJoin(user, eq(workouts.user_id, user.id))

    // Apply role-based and relationship-based filtering
    // Handle workouts with and without training plans
    const conditions: SQL[] = []

    if (sessionUser.userType === 'coach') {
      // Check runnerId authorization first
      if (runnerId && !authorizedUserIds.includes(runnerId)) {
        logger.warn('Coach attempted to access unauthorized runner workouts', {
          coachId: sessionUser.id,
          requestedRunnerId: runnerId,
          authorizedRunnersCount: authorizedUserIds.length,
        })
        return NextResponse.json({ error: 'Forbidden: unauthorized runnerId' }, { status: 403 })
      }

      // Coach can see workouts where:
      // 1. They own the training plan AND the runner is in their authorized relationships
      // 2. OR standalone workouts for authorized runners only
      // Build coach-access branches explicitly to avoid accidental broadening
      const coachBranches: SQL[] = []

      if (runnerId) {
        // runnerId authorization already verified above
        coachBranches.push(
          and(
            eq(training_plans.coach_id, sessionUser.id),
            eq(training_plans.runner_id, runnerId)
          ) as SQL
        )
        coachBranches.push(
          and(isNull(workouts.training_plan_id), eq(workouts.user_id, runnerId)) as SQL
        )
      } else if (authorizedUserIds.length > 0) {
        coachBranches.push(
          and(
            eq(training_plans.coach_id, sessionUser.id),
            inArray(training_plans.runner_id, authorizedUserIds)
          ) as SQL
        )
        coachBranches.push(
          and(
            isNull(workouts.training_plan_id),
            inArray(workouts.user_id, authorizedUserIds)
          ) as SQL
        )
      }

      // If no branches matched (no authorized runners), deny at the condition level
      const coachAccessCondition =
        coachBranches.length > 0 ? (or(...coachBranches) as SQL) : (sql`false` as SQL)

      conditions.push(coachAccessCondition)
    } else {
      // Runner can see workouts where:
      // 1. They are the runner in a training plan (from any coach - simplified for now)
      // 2. OR the workout has no training plan (standalone workouts)
      let runnerAccessCondition: SQL

      if (authorizedUserIds.length > 0) {
        // Has active relationships - use normal authorization
        runnerAccessCondition = or(
          // Has training plan and runner is the user and coach is authorized
          and(
            eq(training_plans.runner_id, sessionUser.id),
            inArray(training_plans.coach_id, authorizedUserIds) as SQL
          ),
          // OR workout has no training plan (standalone) owned by the runner
          and(isNull(workouts.training_plan_id), eq(workouts.user_id, sessionUser.id))
        ) as SQL
      } else {
        // No active relationships - allow runner to see workouts assigned to them in training plans
        runnerAccessCondition = or(
          // Has training plan and runner is the user (any coach for now)
          eq(training_plans.runner_id, sessionUser.id),
          // OR workout has no training plan (standalone) owned by the runner
          and(isNull(workouts.training_plan_id), eq(workouts.user_id, sessionUser.id))
        ) as SQL
      }

      conditions.push(runnerAccessCondition)
    }

    // Apply date filtering with validation using date-fns and UTC normalization
    if (startDate) {
      const sd = parseISO(startDate)
      if (isValid(sd)) {
        sd.setUTCHours(0, 0, 0, 0)
        conditions.push(gte(workouts.date, sd))
      }
    }
    if (endDate) {
      const ed = parseISO(endDate)
      if (isValid(ed)) {
        const localEnd = endOfDay(ed)
        conditions.push(lte(workouts.date, localEnd))
      }
    }

    // Execute query with conditions
    const query = baseQuery.where(conditions.length ? and(...conditions) : sql`false`)

    const results = await query.orderBy(desc(workouts.date), desc(workouts.created_at))

    logger.debug('Raw query results:', { count: results.length })

    // Remove the extra fields we only needed for authorization and handle PII
    const cleanedWorkouts = results.map(
      ({
        coach_id: _coach_id,
        plan_runner_id: _plan_runner_id,
        runner_email,
        runner_name,
        ...workout
      }) => (sessionUser.userType === 'coach' ? { ...workout, runner_name, runner_email } : workout)
    )

    logger.debug('Successfully fetched workouts', {
      count: cleanedWorkouts.length,
      sessionUser: sessionUser.id,
      sessionRole: sessionUser.userType,
      requestedRunnerId: runnerId,
      authorizedUsersCount: authorizedUserIds.length,
    })
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

    if (sessionUser.userType !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create workouts' }, { status: 403 })
    }

    const {
      trainingPlanId,
      date,
      plannedType,
      plannedDistance,
      plannedDuration,
      notes,
      category,
      intensity,
      terrain,
      elevationGain,
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

    // Parse numeric values properly to preserve 0 values
    const parsedIntensity =
      intensity === undefined || intensity === null || intensity === '' ? null : Number(intensity)

    const parsedElevationGain =
      elevationGain === undefined || elevationGain === null || elevationGain === ''
        ? null
        : Number(elevationGain)

    // Create the workout
    const workoutDate = new Date(date)
    const workoutTitle = plannedType
      ? `${plannedType} - ${workoutDate.toLocaleDateString()}`
      : `Workout - ${workoutDate.toLocaleDateString()}`

    const [workout] = await db
      .insert(workouts)
      .values({
        training_plan_id: trainingPlanId,
        user_id: plan.runner_id, // Required field
        title: workoutTitle, // Required field
        date: workoutDate,
        planned_type: plannedType,
        planned_distance: plannedDistance?.toString(),
        planned_duration:
          plannedDuration != null && Number.isFinite(Number(plannedDuration))
            ? Number(plannedDuration)
            : null,
        workout_notes: notes,
        status: 'planned',
        // Enhanced workout fields
        category: category ?? null,
        intensity: parsedIntensity,
        terrain: terrain ?? null,
        elevation_gain: parsedElevationGain,
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
        // TODO: Implement proper notification system
        // For now, skip notifications to avoid schema issues
        logger.debug('Workout created successfully', {
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
