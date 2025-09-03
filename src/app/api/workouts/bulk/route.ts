import { addYears, isAfter, isBefore, isValid, parseISO } from 'date-fns'
import { and, eq, inArray } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, notifications, training_plans, user, workouts } from '@/lib/schema'

const logger = createLogger('api-workouts-bulk')

// Validation constants
const VALIDATION_RULES = {
  MAX_BULK_WORKOUTS: 500, // Prevent abuse
  MIN_INTENSITY: 1,
  MAX_INTENSITY: 10,
  MIN_DISTANCE: 0.1, // km
  MAX_DISTANCE: 500, // km (reasonable for ultras)
  MIN_DURATION: 1, // minutes
  MAX_DURATION: 1440, // 24 hours in minutes
  MIN_ELEVATION: 0, // meters
  MAX_ELEVATION: 10000, // meters (reasonable for ultras)
  MAX_DATE_FUTURE: 365, // days in future
  MAX_DATE_PAST: 30, // days in past
} as const

// Valid enum values for runtime validation
const VALID_CATEGORIES = [
  'easy',
  'tempo',
  'interval',
  'long_run',
  'race_simulation',
  'recovery',
  'strength',
  'cross_training',
  'rest',
] as const

const VALID_TERRAINS = ['road', 'trail', 'track', 'treadmill'] as const

// Validation helper functions
function validateDate(dateString: string): { isValid: boolean; error?: string; date?: Date } {
  if (!dateString || typeof dateString !== 'string') {
    return { isValid: false, error: 'Date is required and must be a string' }
  }

  // Parse ISO 8601 date format
  const parsedDate = parseISO(dateString)

  if (!isValid(parsedDate)) {
    return { isValid: false, error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' }
  }

  const now = new Date()
  const maxFutureDate = addYears(now, 1) // Max 1 year in future
  const minPastDate = new Date(now.getTime() - VALIDATION_RULES.MAX_DATE_PAST * 24 * 60 * 60 * 1000)

  if (isAfter(parsedDate, maxFutureDate)) {
    return { isValid: false, error: 'Date cannot be more than 1 year in the future' }
  }

  if (isBefore(parsedDate, minPastDate)) {
    return {
      isValid: false,
      error: `Date cannot be more than ${VALIDATION_RULES.MAX_DATE_PAST} days in the past`,
    }
  }

  return { isValid: true, date: parsedDate }
}

function validateNumericRange(
  value: number | null | undefined,
  min: number,
  max: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { isValid: true } // Allow null/undefined for optional fields
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a valid number` }
  }

  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` }
  }

  return { isValid: true }
}

function validateEnum<T extends readonly string[]>(
  value: string | null | undefined,
  validValues: T,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { isValid: true } // Allow null/undefined for optional fields
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} must be a string` }
  }

  if (!validValues.includes(value as T[number])) {
    return { isValid: false, error: `${fieldName} must be one of: ${validValues.join(', ')}` }
  }

  return { isValid: true }
}

function validateUUID(value: string, fieldName: string): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} is required` }
  }

  // Simple UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    return { isValid: false, error: `${fieldName} must be a valid UUID` }
  }

  return { isValid: true }
}

function validateBulkWorkout(
  workout: BulkWorkout,
  index: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate training plan ID
  const trainingPlanValidation = validateUUID(workout.trainingPlanId, 'trainingPlanId')
  if (!trainingPlanValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${trainingPlanValidation.error}`)
  }

  // Validate date
  const dateValidation = validateDate(workout.date)
  if (!dateValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${dateValidation.error}`)
  }

  // Validate planned type (required)
  if (
    !workout.plannedType ||
    typeof workout.plannedType !== 'string' ||
    workout.plannedType.trim().length === 0
  ) {
    errors.push(`Workout ${index + 1}: plannedType is required`)
  } else if (workout.plannedType.length > 100) {
    errors.push(`Workout ${index + 1}: plannedType must be 100 characters or less`)
  }

  // Validate numeric fields
  const distanceValidation = validateNumericRange(
    workout.plannedDistance,
    VALIDATION_RULES.MIN_DISTANCE,
    VALIDATION_RULES.MAX_DISTANCE,
    'plannedDistance'
  )
  if (!distanceValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${distanceValidation.error}`)
  }

  const durationValidation = validateNumericRange(
    workout.plannedDuration,
    VALIDATION_RULES.MIN_DURATION,
    VALIDATION_RULES.MAX_DURATION,
    'plannedDuration'
  )
  if (!durationValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${durationValidation.error}`)
  }

  const intensityValidation = validateNumericRange(
    workout.intensity,
    VALIDATION_RULES.MIN_INTENSITY,
    VALIDATION_RULES.MAX_INTENSITY,
    'intensity'
  )
  if (!intensityValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${intensityValidation.error}`)
  }

  const elevationValidation = validateNumericRange(
    workout.elevationGain,
    VALIDATION_RULES.MIN_ELEVATION,
    VALIDATION_RULES.MAX_ELEVATION,
    'elevationGain'
  )
  if (!elevationValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${elevationValidation.error}`)
  }

  // Validate enum fields
  const categoryValidation = validateEnum(workout.category, VALID_CATEGORIES, 'category')
  if (!categoryValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${categoryValidation.error}`)
  }

  const terrainValidation = validateEnum(workout.terrain, VALID_TERRAINS, 'terrain')
  if (!terrainValidation.isValid) {
    errors.push(`Workout ${index + 1}: ${terrainValidation.error}`)
  }

  // Validate notes length
  if (workout.notes && typeof workout.notes === 'string' && workout.notes.length > 1000) {
    errors.push(`Workout ${index + 1}: notes must be 1000 characters or less`)
  }

  return { isValid: errors.length === 0, errors }
}

interface BulkWorkout {
  trainingPlanId: string
  date: string
  plannedType: string
  plannedDistance?: number | null
  plannedDuration?: number | null
  notes?: string
  category?:
    | 'easy'
    | 'tempo'
    | 'interval'
    | 'long_run'
    | 'race_simulation'
    | 'recovery'
    | 'strength'
    | 'cross_training'
    | 'rest'
    | null
  intensity?: number | null
  terrain?: 'road' | 'trail' | 'track' | 'treadmill' | null
  elevationGain?: number | null
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
      return NextResponse.json({ error: 'Only coaches can create bulk workouts' }, { status: 403 })
    }

    const requestBody = await request.json()
    const { workouts: workoutList }: { workouts: BulkWorkout[] } = requestBody

    // Basic array validation
    if (!workoutList || !Array.isArray(workoutList) || workoutList.length === 0) {
      return NextResponse.json({ error: 'No workouts provided' }, { status: 400 })
    }

    // Check maximum bulk limit to prevent abuse
    if (workoutList.length > VALIDATION_RULES.MAX_BULK_WORKOUTS) {
      return NextResponse.json(
        {
          error: `Too many workouts. Maximum allowed is ${VALIDATION_RULES.MAX_BULK_WORKOUTS}, received ${workoutList.length}`,
        },
        { status: 400 }
      )
    }

    // Validate each workout
    const allErrors: string[] = []
    const validWorkouts: BulkWorkout[] = []

    for (let i = 0; i < workoutList.length; i++) {
      const workout = workoutList[i]
      const validation = validateBulkWorkout(workout, i)

      if (!validation.isValid) {
        allErrors.push(...validation.errors)
      } else {
        validWorkouts.push(workout)
      }
    }

    // If there are validation errors, return them all
    if (allErrors.length > 0) {
      logger.warn('Bulk workout validation failed', {
        coachId: sessionUser.id,
        totalWorkouts: workoutList.length,
        validWorkouts: validWorkouts.length,
        errorCount: allErrors.length,
        errors: allErrors.slice(0, 10), // Log first 10 errors only
      })

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: allErrors,
          summary: `${allErrors.length} validation error(s) found in ${workoutList.length} workout(s)`,
        },
        { status: 400 }
      )
    }

    // Continue with validated workouts
    const finalWorkoutList = validWorkouts

    // Verify all training plans belong to this coach
    const trainingPlanIds = [...new Set(finalWorkoutList.map(w => w.trainingPlanId))]

    const trainingPlansData = await db
      .select({
        id: training_plans.id,
        coach_id: training_plans.coach_id,
        runner_id: training_plans.runner_id,
      })
      .from(training_plans)
      .where(inArray(training_plans.id, trainingPlanIds))

    if (trainingPlansData.length !== trainingPlanIds.length) {
      logger.warn('Some training plans not found', {
        requestedIds: trainingPlanIds,
        foundIds: trainingPlansData.map(p => p.id),
      })
      return NextResponse.json({ error: 'Some training plans not found' }, { status: 404 })
    }

    // Check if all plans belong to this coach
    const unauthorizedPlans = trainingPlansData.filter(plan => plan.coach_id !== sessionUser.id)
    if (unauthorizedPlans.length > 0) {
      logger.warn('Unauthorized bulk workout creation attempt', {
        coachId: sessionUser.id,
        unauthorizedPlanIds: unauthorizedPlans.map(p => p.id),
      })
      return NextResponse.json({ error: 'Unauthorized training plan access' }, { status: 403 })
    }

    // Verify active coach-runner relationships for all affected runners
    const runnerIds = [...new Set(trainingPlansData.map(p => p.runner_id))]
    const activeRelationships = await db
      .select({ runner_id: coach_runners.runner_id })
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.coach_id, sessionUser.id),
          inArray(coach_runners.runner_id, runnerIds),
          eq(coach_runners.status, 'active')
        )
      )

    const authorizedRunnerIds = new Set(activeRelationships.map(rel => rel.runner_id))
    const unauthorizedRunners = runnerIds.filter(id => !authorizedRunnerIds.has(id))

    if (unauthorizedRunners.length > 0) {
      logger.warn('Bulk workout creation attempted without active relationships', {
        coachId: sessionUser.id,
        unauthorizedRunnerIds: unauthorizedRunners,
      })
      return NextResponse.json(
        { error: 'No active relationships found with some runners' },
        { status: 403 }
      )
    }

    // Delete existing workouts for the same dates to avoid duplicates
    // const datesToClear = [...new Set(workoutList.map(w => w.date))]

    for (const planId of trainingPlanIds) {
      try {
        await db.delete(workouts).where(eq(workouts.training_plan_id, planId))
        // Note: Need to handle date filtering separately due to inArray with dates
      } catch (deleteError) {
        logger.error('Failed to clear existing workouts', deleteError)
        // Continue anyway - we'll handle duplicates at insert
      }
    }

    // Prepare workouts for insertion with required user_id and title fields
    const workoutsToInsert = finalWorkoutList.map(workoutData => {
      // Find the training plan to get the runner_id
      const trainingPlan = trainingPlansData.find(plan => plan.id === workoutData.trainingPlanId)
      if (!trainingPlan) {
        throw new Error(`Training plan not found for workout: ${workoutData.trainingPlanId}`)
      }

      // Generate a descriptive title for the workout - use validated date
      const dateValidation = validateDate(workoutData.date)
      const workoutDate = dateValidation.date || new Date(workoutData.date) // Fallback (should never hit)
      const workoutTitle = workoutData.plannedType
        ? `${workoutData.plannedType} - ${workoutDate.toLocaleDateString()}`
        : `Workout - ${workoutDate.toLocaleDateString()}`

      return {
        training_plan_id: workoutData.trainingPlanId,
        user_id: trainingPlan.runner_id, // Required field
        title: workoutTitle, // Required field
        date: workoutDate,
        planned_type: workoutData.plannedType,
        planned_distance: workoutData.plannedDistance?.toString() || null,
        planned_duration: workoutData.plannedDuration || null,
        workout_notes: workoutData.notes || null,
        status: 'planned' as const,
        // Enhanced workout fields
        category: workoutData.category || null,
        intensity: workoutData.intensity || null,
        terrain: workoutData.terrain || null,
        elevation_gain: workoutData.elevationGain || null,
        created_at: new Date(),
        updated_at: new Date(),
      }
    })

    // Bulk insert workouts
    const insertedWorkouts = await db.insert(workouts).values(workoutsToInsert).returning()

    if (!insertedWorkouts || insertedWorkouts.length === 0) {
      logger.error('Failed to create workouts - no workouts returned')
      return NextResponse.json({ error: 'Failed to create workouts' }, { status: 500 })
    }

    // Send notification to runner about new weekly plan
    if (insertedWorkouts && insertedWorkouts.length > 0) {
      try {
        // Get runner info from the training plan
        const firstPlan = trainingPlansData.find(
          plan => plan.id === finalWorkoutList[0].trainingPlanId
        )
        if (firstPlan) {
          const [runner] = await db
            .select({
              id: user.id,
              full_name: user.fullName,
            })
            .from(user)
            .where(eq(user.id, firstPlan.runner_id))
            .limit(1)

          if (runner) {
            // Get coach info
            const [coach] = await db
              .select({
                full_name: user.fullName,
              })
              .from(user)
              .where(eq(user.id, sessionUser.id))
              .limit(1)

            const coachName = coach?.full_name || 'Your coach'
            const workoutCount = insertedWorkouts.length

            await db.insert(notifications).values({
              user_id: runner.id,
              title: '⛰️ New Weekly Expedition Plan',
              message: `${coachName} has architected ${workoutCount} new summit ascents for your training expedition.`,
              type: 'workout',
              read: false,
              created_at: new Date(),
            })

            logger.info('Bulk workout notification sent', {
              coachId: sessionUser.id,
              runnerId: runner.id,
              workoutCount,
            })
          }
        }
      } catch (error) {
        logger.error('Failed to send notification for new weekly plan', error)
        // Don't fail the main request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      created: insertedWorkouts?.length || 0,
      workouts: insertedWorkouts,
    })
  } catch (error) {
    logger.error('API error in POST /workouts/bulk', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
