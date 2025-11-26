import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { workouts } from '@/lib/schema'
import type { Workout } from '@/lib/supabase'
import type { BulkMatchSummary, SingleMatchSummary } from '@/types/common'
import type { StravaActivity } from '@/types/strava'
import { getServerSession } from '@/utils/auth-server'
import {
  type MatchingOptions,
  type WorkoutMatch,
  batchMatchActivities,
  matchActivityToWorkouts,
} from '@/utils/workout-matching'

// Partial activity type that matches our validation schema
type PartialStravaActivity = {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  start_date: string
  trainer?: boolean
}

// Helper function to convert partial activity to full StravaActivity format
function convertPartialToFullActivity(partial: PartialStravaActivity): StravaActivity {
  return {
    ...partial,
    trainer: partial.trainer ?? false,
    resource_state: 2,
    external_id: `external_${partial.id}`,
    upload_id: partial.id,
    athlete: { id: 0, resource_state: 1 },
    elapsed_time: partial.moving_time,
    total_elevation_gain: 0,
    sport_type: partial.type,
    workout_type: undefined,
    id_str: partial.id.toString(),
    start_date_local: partial.start_date,
    timezone: 'UTC',
    utc_offset: 0,
    location_city: undefined,
    location_state: undefined,
    location_country: undefined,
    achievement_count: 0,
    kudos_count: 0,
    comment_count: 0,
    athlete_count: 1,
    photo_count: 0,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    gear_id: undefined,
    start_latlng: [0, 0] as [number, number],
    end_latlng: [0, 0] as [number, number],
    average_speed: 0,
    max_speed: 0,
    average_cadence: undefined,
    average_watts: undefined,
    weighted_average_watts: undefined,
    kilojoules: undefined,
    device_watts: undefined,
    has_heartrate: false,
    average_heartrate: undefined,
    max_heartrate: undefined,
    heartrate_opt_out: false,
    display_hide_heartrate_option: false,
    elev_high: undefined,
    elev_low: undefined,
    upload_id_str: partial.id.toString(),
    pr_count: 0,
    total_photo_count: 0,
    has_kudoed: false,
    suffer_score: undefined,
  }
}

// Helper function to convert database workout to format expected by matching function
function convertDbWorkoutToMatchingFormat(dbWorkout: typeof workouts.$inferSelect): Workout {
  return {
    id: dbWorkout.id,
    training_plan_id: dbWorkout.training_plan_id,
    date: dbWorkout.date.toISOString().split('T')[0],
    planned_distance: dbWorkout.planned_distance
      ? parseFloat(dbWorkout.planned_distance)
      : undefined,
    planned_duration: dbWorkout.planned_duration ?? undefined,
    planned_type: dbWorkout.planned_type || '',
    category: dbWorkout.category ?? undefined,
    intensity: dbWorkout.intensity ?? undefined,
    terrain: dbWorkout.terrain ?? undefined,
    elevation_gain: dbWorkout.elevation_gain ?? undefined,
    actual_distance: dbWorkout.actual_distance ? parseFloat(dbWorkout.actual_distance) : undefined,
    actual_duration: dbWorkout.actual_duration ?? undefined,
    actual_type: dbWorkout.actual_type ?? undefined,
    injury_notes: dbWorkout.injury_notes ?? undefined,
    workout_notes: dbWorkout.workout_notes ?? undefined,
    coach_feedback: dbWorkout.coach_feedback ?? undefined,
    status: dbWorkout.status,
    created_at: dbWorkout.created_at?.toISOString() || '',
    updated_at: dbWorkout.updated_at?.toISOString() || '',
  } as Workout
}

const logger = createLogger('StravaMatchAPI')

// Validation schemas
const matchSingleSchema = z.object({
  activity: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    distance: z.number(),
    moving_time: z.number(),
    start_date: z.string(),
    trainer: z.boolean().optional(),
  }),
  options: z
    .object({
      dateTolerance: z.number().min(0).max(7).optional().default(1),
      distanceTolerance: z.number().min(0).max(1).optional().default(0.15),
      durationTolerance: z.number().min(0).max(1).optional().default(0.2),
      minConfidence: z.number().min(0).max(1).optional().default(0.3),
    })
    .optional(),
})

const matchBulkSchema = z.object({
  activities: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        type: z.string(),
        distance: z.number(),
        moving_time: z.number(),
        start_date: z.string(),
        trainer: z.boolean().optional(),
      })
    )
    .min(1)
    .max(100), // Limit to 100 activities per batch
  options: z
    .object({
      dateTolerance: z.number().min(0).max(7).optional().default(1),
      distanceTolerance: z.number().min(0).max(1).optional().default(0.15),
      durationTolerance: z.number().min(0).max(1).optional().default(0.2),
      minConfidence: z.number().min(0).max(1).optional().default(0.3),
    })
    .optional(),
})

/**
 * POST /api/strava/match
 *
 * Match Strava activities against planned workouts with intelligent algorithms
 *
 * Supports both single activity and bulk matching operations:
 * - Single: Match one activity against all planned workouts
 * - Bulk: Match multiple activities against all planned workouts
 *
 * Returns detailed match results with confidence scores and discrepancies
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      logger.warn('Unauthorized match request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const isBulk = Array.isArray(body.activities)

    logger.info(`Processing ${isBulk ? 'bulk' : 'single'} match request`, {
      userId: session.user.id,
      activitiesCount: isBulk ? body.activities.length : 1,
    })

    // Validate request body
    let validatedData: {
      activity?: PartialStravaActivity
      activities?: PartialStravaActivity[]
      options?: MatchingOptions
    }

    if (isBulk) {
      const validation = matchBulkSchema.safeParse(body)
      if (!validation.success) {
        logger.warn('Invalid bulk match request', { errors: validation.error.issues })
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.issues,
          },
          { status: 400 }
        )
      }
      validatedData = validation.data
    } else {
      const validation = matchSingleSchema.safeParse(body)
      if (!validation.success) {
        logger.warn('Invalid single match request', { errors: validation.error.issues })
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.issues,
          },
          { status: 400 }
        )
      }
      validatedData = validation.data
    }

    // Fetch user's workouts
    const userWorkouts = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.user_id, session.user.id), eq(workouts.status, 'planned')))

    if (userWorkouts.length === 0) {
      logger.info('No planned workouts found for user', { userId: session.user.id })
      return NextResponse.json({
        matches: isBulk ? {} : [],
        summary: {
          total: {
            activities: isBulk ? validatedData.activities!.length : 1,
            workouts: 0,
            matches: 0,
          },
          by_confidence: { exact: 0, probable: 0, possible: 0, conflicts: 0 },
          unmatched_workouts: 0,
          suggestions: ['No planned workouts found to match against'],
        },
      })
    }

    const options: MatchingOptions = {
      dateTolerance: validatedData.options?.dateTolerance ?? 1,
      distanceTolerance: validatedData.options?.distanceTolerance ?? 0.15,
      durationTolerance: validatedData.options?.durationTolerance ?? 0.2,
      minConfidence: validatedData.options?.minConfidence ?? 0.3,
    }
    let matches: Map<number, WorkoutMatch[]> | WorkoutMatch[]
    let summary: BulkMatchSummary | SingleMatchSummary

    if (isBulk) {
      // Bulk matching
      logger.debug(
        `Matching ${validatedData.activities!.length} activities against ${userWorkouts.length} workouts`
      )

      // Convert partial activities to full StravaActivity format for matching
      const convertedActivities = validatedData.activities!.map(convertPartialToFullActivity)
      const convertedWorkouts = userWorkouts.map(convertDbWorkoutToMatchingFormat)

      matches = batchMatchActivities(convertedActivities, convertedWorkouts, options)

      // Convert Map to object for JSON serialization
      const matchesObject: Record<number, WorkoutMatch[]> = {}
      matches.forEach((value, key) => {
        matchesObject[key] = value
      })

      // Generate comprehensive summary
      const { generateMatchingSummary } = await import('@/utils/workout-matching')
      summary = generateMatchingSummary(convertedActivities, convertedWorkouts, matches)

      logger.info('Bulk matching completed', {
        userId: session.user.id,
        totalMatches: Array.from(matches.values()).flat().length,
        exactMatches: summary.by_confidence.exact,
        probableMatches: summary.by_confidence.probable,
        possibleMatches: summary.by_confidence.possible,
        conflicts: summary.by_confidence.conflicts,
      })

      return NextResponse.json({
        matches: matchesObject,
        summary,
        options: options,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Single activity matching
      logger.debug(`Matching single activity against ${userWorkouts.length} workouts`)

      // Convert partial activity to full StravaActivity format for matching
      const convertedActivity = convertPartialToFullActivity(validatedData.activity!)
      const convertedWorkouts = userWorkouts.map(convertDbWorkoutToMatchingFormat)

      matches = matchActivityToWorkouts(convertedActivity, convertedWorkouts, options)

      // Generate simple summary for single activity
      const bestMatch = matches[0]
      summary = {
        total: { activities: 1, workouts: userWorkouts.length, matches: matches.length },
        best_match: bestMatch
          ? {
              confidence: bestMatch.confidence,
              match_type: bestMatch.matchType,
              workout_id: bestMatch.workout.id,
              discrepancies_count: bestMatch.discrepancies.length,
            }
          : null,
        suggestions:
          matches.length > 0 ? matches[0].suggestions : ['No matches found for this activity'],
      }

      logger.info('Single matching completed', {
        userId: session.user.id,
        activityId: validatedData.activity!.id,
        matchesFound: matches.length,
        bestConfidence: bestMatch?.confidence || 0,
      })

      return NextResponse.json({
        matches,
        summary,
        options: options,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    logger.error('Match request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json({ error: 'Internal server error during matching' }, { status: 500 })
  }
}

/**
 * GET /api/strava/match
 *
 * Get matching configuration and statistics
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return matching configuration and user stats
    const userWorkouts = await db
      .select()
      .from(workouts)
      .where(eq(workouts.user_id, session.user.id))

    const plannedCount = userWorkouts.filter(w => w.status === 'planned').length
    const completedCount = userWorkouts.filter(w => w.status === 'completed').length

    return NextResponse.json({
      config: {
        default_options: {
          dateTolerance: 1,
          distanceTolerance: 0.15,
          durationTolerance: 0.2,
          minConfidence: 0.3,
        },
        limits: {
          max_bulk_activities: 100,
          max_date_tolerance: 7,
          max_distance_tolerance: 1.0,
          max_duration_tolerance: 1.0,
        },
      },
      user_stats: {
        total_workouts: userWorkouts.length,
        planned_workouts: plannedCount,
        completed_workouts: completedCount,
        available_for_matching: plannedCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get match config', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
