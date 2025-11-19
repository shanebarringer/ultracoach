import { addYears, format, isAfter, isBefore, isValid, parseISO } from 'date-fns'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

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

// Zod validation schemas
const BulkWorkoutSchema = z.object({
  trainingPlanId: z.string().uuid('Invalid training plan ID format'),
  date: z
    .string()
    .transform(dateStr => parseISO(dateStr))
    .refine(
      date =>
        isValid(date) &&
        !isBefore(date, new Date('2020-01-01')) &&
        !isAfter(date, addYears(new Date(), 5)),
      { message: 'Invalid date or date out of reasonable range (2020-2030)' }
    ),
  plannedType: z.string().min(1, { message: 'Planned type is required' }).max(100, { message: 'Planned type too long' }),
  plannedDistance: z
    .number()
    .min(VALIDATION_RULES.MIN_DISTANCE)
    .max(VALIDATION_RULES.MAX_DISTANCE)
    .optional()
    .nullable(),
  plannedDuration: z
    .number()
    .min(VALIDATION_RULES.MIN_DURATION)
    .max(VALIDATION_RULES.MAX_DURATION)
    .optional()
    .nullable(),
  notes: z.string().max(1000, { message: 'Notes must be 1000 characters or less' }).optional(),
  category: z.enum(VALID_CATEGORIES).optional().nullable(),
  intensity: z
    .number()
    .min(VALIDATION_RULES.MIN_INTENSITY)
    .max(VALIDATION_RULES.MAX_INTENSITY)
    .optional()
    .nullable(),
  terrain: z.enum(VALID_TERRAINS).optional().nullable(),
  elevationGain: z.number().min(0).max(VALIDATION_RULES.MAX_ELEVATION).optional().nullable(),
})

const BulkWorkoutRequestSchema = z.object({
  workouts: z
    .array(BulkWorkoutSchema)
    .min(1, { message: 'At least one workout is required' })
    .max(VALIDATION_RULES.MAX_BULK_WORKOUTS, {
      message: `Maximum ${VALIDATION_RULES.MAX_BULK_WORKOUTS} workouts allowed`,
    }),
})

// Type inference handled directly in the function

// Legacy validation functions - replaced by Zod schema validation above
// Keeping commented for reference during refactoring
/*
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
*/

// Legacy validateBulkWorkout function - replaced by Zod schema validation above
// Keeping function commented for reference during refactoring
/*
function validateBulkWorkout(
  workout: BulkWorkout,
  index: number
): { isValid: boolean; errors: string[] } {
  // This function has been replaced by BulkWorkoutSchema Zod validation
  // Old implementation removed to reduce code complexity
}
*/

// BulkWorkout type is now inferred from Zod schema above

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

    // Use Zod to validate the entire request
    const validationResult = BulkWorkoutRequestSchema.safeParse(requestBody)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten()
      logger.warn('Bulk workout validation failed', {
        coachId: sessionUser.id,
        errors: errors.formErrors,
        fieldErrors: errors.fieldErrors,
      })

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors.formErrors.concat(
            Object.entries(errors.fieldErrors).flatMap(
              ([field, msgs]) => msgs?.map(msg => `${field}: ${msg}`) || []
            )
          ),
        },
        { status: 400 }
      )
    }

    const { workouts: workoutList } = validationResult.data
    const validWorkouts = workoutList // All workouts are valid after Zod validation

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

    // Delete only conflicting workouts for the same dates (not ALL workouts)
    try {
      // Build date sets per plan (YYYY-MM-DD format for comparison)
      const datesByPlan = new Map<string, Set<string>>()
      for (const w of finalWorkoutList) {
        const dateStr = format(w.date, 'yyyy-MM-dd') // Get YYYY-MM-DD part using date-fns
        const dates = datesByPlan.get(w.trainingPlanId) || new Set<string>()
        dates.add(dateStr)
        datesByPlan.set(w.trainingPlanId, dates)
      }

      // Fetch existing workouts for affected plans
      const existing = await db
        .select({ id: workouts.id, planId: workouts.training_plan_id, date: workouts.date })
        .from(workouts)
        .where(inArray(workouts.training_plan_id, trainingPlanIds))

      // Filter to only workouts on conflicting dates
      const idsToDelete = existing
        .filter(row => {
          if (!row.planId) return false // Skip if no planId
          const rowDateStr = row.date.toISOString().split('T')[0]
          return datesByPlan.get(row.planId)?.has(rowDateStr)
        })
        .map(row => row.id)

      // Only delete if we have conflicts
      if (idsToDelete.length > 0) {
        logger.info('Deleting conflicting workouts', {
          count: idsToDelete.length,
          plans: trainingPlanIds.length,
        })
        await db.delete(workouts).where(inArray(workouts.id, idsToDelete))
      }
    } catch (deleteError) {
      logger.error('Failed to clear conflicting workouts', deleteError)
      // Continue anyway - we'll handle duplicates at insert
    }

    // Prepare workouts for insertion with required user_id and title fields
    const workoutsToInsert = finalWorkoutList.map(workoutData => {
      // Find the training plan to get the runner_id
      const trainingPlan = trainingPlansData.find(plan => plan.id === workoutData.trainingPlanId)
      if (!trainingPlan) {
        throw new Error(`Training plan not found for workout: ${workoutData.trainingPlanId}`)
      }

      // Generate a descriptive title for the workout - use Zod-parsed date
      const workoutTitle = workoutData.plannedType
        ? `${workoutData.plannedType} - ${format(workoutData.date, 'MM/dd/yyyy')}`
        : `Workout - ${format(workoutData.date, 'MM/dd/yyyy')}`

      return {
        training_plan_id: workoutData.trainingPlanId,
        user_id: trainingPlan.runner_id, // Required field
        title: workoutTitle, // Required field
        date: workoutData.date,
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

    // Send notifications to ALL affected runners
    if (insertedWorkouts && insertedWorkouts.length > 0) {
      try {
        // Group workouts by runner to send per-recipient totals
        const countByRunner = new Map<string, number>()
        for (const workout of insertedWorkouts) {
          const plan = trainingPlansData.find(p => p.id === workout.training_plan_id)
          if (plan) {
            countByRunner.set(plan.runner_id, (countByRunner.get(plan.runner_id) ?? 0) + 1)
          }
        }

        // Get coach info once
        const [coach] = await db
          .select({
            full_name: user.fullName,
          })
          .from(user)
          .where(eq(user.id, sessionUser.id))
          .limit(1)

        const coachName = coach?.full_name || 'Your coach'

        // Send individual notifications to each affected runner
        const notificationPromises: Promise<void>[] = []
        for (const [runnerId, workoutCount] of countByRunner.entries()) {
          const notificationPromise = (async () => {
            try {
              // Get runner info for logging
              const [runner] = await db
                .select({
                  id: user.id,
                  full_name: user.fullName,
                })
                .from(user)
                .where(eq(user.id, runnerId))
                .limit(1)

              if (runner) {
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
            } catch (error) {
              logger.error('Failed to send notification to runner', {
                runnerId,
                error,
              })
            }
          })()

          notificationPromises.push(notificationPromise)
        }

        // Wait for all notifications to be sent
        await Promise.all(notificationPromises)

        logger.info('Bulk workout notifications completed', {
          coachId: sessionUser.id,
          totalRunners: countByRunner.size,
          totalWorkouts: insertedWorkouts.length,
        })
      } catch (error) {
        logger.error('Failed to send notifications for new weekly plan', error)
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
