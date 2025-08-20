import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getServerSession } from '@/utils/auth-server'
import { createLogger } from '@/lib/logger'
import { db } from '@/lib/db'
import { workouts } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { matchActivityToWorkouts, type MatchingOptions } from '@/utils/workout-matching'
import type { SyncPreferences } from '@/types/common'
import type { StravaActivity } from '@/types/strava'
import type { Workout } from '@/lib/supabase'

// Partial activity type that matches our validation schema
type PartialStravaActivity = {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  start_date: string
  trainer?: boolean
  average_heartrate?: number
  max_heartrate?: number
  total_elevation_gain?: number
  average_speed?: number
  kudos_count?: number
  achievement_count?: number
}

const logger = createLogger('StravaEnhancedSyncAPI')

// Helper function to convert database workout to format expected by matching function
function convertDbWorkoutToMatchingFormat(dbWorkout: typeof workouts.$inferSelect): Workout {
  return {
    id: dbWorkout.id,
    training_plan_id: dbWorkout.training_plan_id,
    date: dbWorkout.date.toISOString().split('T')[0],
    planned_distance: dbWorkout.planned_distance ? parseFloat(dbWorkout.planned_distance) : undefined,
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

// Helper function to convert partial activity to format expected by matching function
function toMatchableActivity(partial: PartialStravaActivity): StravaActivity {
  return {
    id: partial.id,
    name: partial.name,
    type: partial.type,
    distance: partial.distance,
    moving_time: partial.moving_time,
    start_date: partial.start_date,
    trainer: partial.trainer || false,
    total_elevation_gain: partial.total_elevation_gain || 0,
    average_heartrate: partial.average_heartrate,
    max_heartrate: partial.max_heartrate,
    average_speed: partial.average_speed || 0,
    kudos_count: partial.kudos_count || 0,
    achievement_count: partial.achievement_count || 0,
    // Add required fields with defaults for matching
    resource_state: 2,
    external_id: `external_${partial.id}`,
    upload_id: partial.id,
    athlete: { id: 0, resource_state: 1 },
    elapsed_time: partial.moving_time,
    sport_type: partial.type,
    id_str: partial.id.toString(),
    start_date_local: partial.start_date,
    timezone: 'UTC',
    utc_offset: 0,
    comment_count: 0,
    athlete_count: 1,
    photo_count: 0,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    start_latlng: [0, 0] as [number, number],
    end_latlng: [0, 0] as [number, number],
    max_speed: 0,
    has_heartrate: !!partial.average_heartrate,
    heartrate_opt_out: false,
    display_hide_heartrate_option: false,
    upload_id_str: partial.id.toString(),
    pr_count: 0,
    total_photo_count: 0,
    has_kudoed: false,
  }
}

// Validation schemas
const enhancedSyncSchema = z.object({
  activity: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    distance: z.number(),
    moving_time: z.number(),
    start_date: z.string(),
    trainer: z.boolean().optional(),
    average_heartrate: z.number().optional(),
    max_heartrate: z.number().optional(),
    total_elevation_gain: z.number().optional(),
    average_speed: z.number().optional(),
    kudos_count: z.number().optional(),
    achievement_count: z.number().optional(),
  }),
  sync_mode: z.enum(['auto_match', 'create_new', 'match_specific', 'smart_sync']),
  target_workout_id: z.string().optional(), // Required for 'match_specific'
  sync_preferences: z.object({
    update_status: z.boolean().default(true),
    update_actual_data: z.boolean().default(true),
    update_notes: z.boolean().default(true),
    preserve_planned_data: z.boolean().default(true),
    auto_categorize: z.boolean().default(true),
    calculate_intensity: z.boolean().default(true),
    detect_terrain: z.boolean().default(true),
  }).optional(),
  matching_options: z.object({
    date_tolerance: z.number().min(0).max(7).default(1),
    distance_tolerance: z.number().min(0).max(1).default(0.15),
    duration_tolerance: z.number().min(0).max(1).default(0.2),
    min_confidence: z.number().min(0).max(1).default(0.5),
  }).optional(),
})

interface SyncResult {
  activity_id: number
  workout_id?: string
  sync_mode: string
  status: 'success' | 'partial' | 'failed'
  action_taken: 'matched_existing' | 'created_new' | 'updated_existing' | 'no_action'
  match_info?: {
    confidence: number
    match_type: string
    discrepancies_count: number
  }
  changes_made: string[]
  warnings: string[]
  error_message?: string
}

/**
 * POST /api/strava/enhanced-sync
 * 
 * Enhanced Strava sync with intelligent matching and flexible sync modes
 * 
 * Sync Modes:
 * - auto_match: Automatically find and sync to best matching planned workout
 * - create_new: Always create a new workout from the activity
 * - match_specific: Sync to a specific workout ID
 * - smart_sync: Intelligent sync that decides best action based on matches
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      logger.warn('Unauthorized enhanced sync request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    logger.info('Processing enhanced sync request', {
      userId: session.user.id,
      activityId: body.activity?.id,
      syncMode: body.sync_mode,
    })

    // Validate request body
    const validation = enhancedSyncSchema.safeParse(body)
    if (!validation.success) {
      logger.warn('Invalid enhanced sync request', { errors: validation.error.issues })
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { 
      activity, 
      sync_mode, 
      target_workout_id, 
      sync_preferences, 
      matching_options 
    } = validation.data

    const syncPrefs: SyncPreferences = sync_preferences || {}
    const matchOpts: MatchingOptions = {
      dateTolerance: matching_options?.date_tolerance ?? 1,
      distanceTolerance: matching_options?.distance_tolerance ?? 0.15,
      durationTolerance: matching_options?.duration_tolerance ?? 0.2,
      minConfidence: matching_options?.min_confidence ?? 0.5,
    }

    const result: SyncResult = {
      activity_id: activity.id,
      sync_mode,
      status: 'success',
      action_taken: 'no_action',
      changes_made: [],
      warnings: [],
    }

    // Convert Strava activity data
    const actualDistance = activity.distance / 1609.34 // meters to miles
    const actualDuration = Math.round(activity.moving_time / 60) // seconds to minutes
    
    // Detect activity characteristics
    const detectedTerrain = activity.trainer ? 'treadmill' : 
                           activity.type.toLowerCase() === 'run' ? 'trail' : null
    
    const calculatedIntensity = activity.average_heartrate ? 
      Math.min(Math.max(Math.round(activity.average_heartrate / 20), 1), 10) : null

    const elevationGainFeet = activity.total_elevation_gain ? 
      Math.round(activity.total_elevation_gain * 3.28084) : null

    // Execute sync based on mode
    switch (sync_mode) {
      case 'create_new':
        await handleCreateNew()
        break
      case 'match_specific':
        await handleMatchSpecific()
        break
      case 'auto_match':
        await handleAutoMatch()
        break
      case 'smart_sync':
        await handleSmartSync()
        break
      default:
        throw new Error(`Unsupported sync mode: ${sync_mode}`)
    }

    async function handleCreateNew() {
      if (!session?.user?.id) {
        throw new Error('User session required')
      }
      
      // Always create a new workout
      const workoutData = {
        user_id: session.user.id,
        title: activity.name,
        planned_type: activity.name,
        actual_type: activity.name,
        actual_distance: actualDistance.toString(),
        actual_duration: actualDuration,
        status: 'completed' as const,
        date: new Date(activity.start_date),
        workout_notes: generateWorkoutNotes(),
        category: syncPrefs.auto_categorize !== false ? categorizeActivity() : null,
        intensity: syncPrefs.calculate_intensity !== false ? calculatedIntensity : null,
        terrain: syncPrefs.detect_terrain !== false ? detectedTerrain : null,
        elevation_gain: elevationGainFeet,
        // avg_heart_rate: activity.average_heartrate, // Not in current schema
      }

      const [newWorkout] = await db.insert(workouts).values(workoutData).returning({ id: workouts.id })
      
      result.workout_id = newWorkout.id
      result.action_taken = 'created_new'
      result.changes_made.push(`Created new workout from ${activity.name}`)
      
      logger.info('Created new workout from Strava activity', {
        activityId: activity.id,
        workoutId: newWorkout.id,
        distance: actualDistance,
        duration: actualDuration,
      })
    }

    async function handleMatchSpecific() {
      if (!target_workout_id) {
        throw new Error('target_workout_id is required for match_specific mode')
      }

      if (!session?.user?.id) {
        throw new Error('User session required')
      }

      // Verify workout exists and belongs to user
      const existingWorkout = await db
        .select()
        .from(workouts)
        .where(and(
          eq(workouts.id, target_workout_id),
          eq(workouts.user_id, session.user.id)
        ))

      if (existingWorkout.length === 0) {
        throw new Error('Target workout not found or access denied')
      }

      await updateWorkout(existingWorkout[0], { confidence: 1.0, matchType: 'manual' })
    }

    async function handleAutoMatch() {
      if (!session?.user?.id) {
        throw new Error('User session required')
      }
      
      // Find matching workouts
      const userWorkouts = await db
        .select()
        .from(workouts)
        .where(and(
          eq(workouts.user_id, session.user.id),
          eq(workouts.status, 'planned')
        ))

      if (userWorkouts.length === 0) {
        result.warnings.push('No planned workouts found, consider using create_new mode')
        return
      }

      const convertedWorkouts = userWorkouts.map(convertDbWorkoutToMatchingFormat)
      const matches = matchActivityToWorkouts(toMatchableActivity(activity), convertedWorkouts, matchOpts)
      const bestMatch = matches[0]

      if (!bestMatch || bestMatch.confidence < matchOpts.minConfidence) {
        result.warnings.push(`No suitable match found (best confidence: ${bestMatch?.confidence.toFixed(2) || 'none'})`)
        return
      }

      const originalWorkout = userWorkouts.find(w => w.id === bestMatch.workout.id)!
      await updateWorkout(originalWorkout, bestMatch)
      result.match_info = {
        confidence: bestMatch.confidence,
        match_type: bestMatch.matchType,
        discrepancies_count: bestMatch.discrepancies.length,
      }
    }

    async function handleSmartSync() {
      if (!session?.user?.id) {
        throw new Error('User session required')
      }
      
      // First try auto-matching
      const userWorkouts = await db
        .select()
        .from(workouts)
        .where(and(
          eq(workouts.user_id, session.user.id),
          eq(workouts.status, 'planned')
        ))

      if (userWorkouts.length > 0) {
        const convertedWorkouts = userWorkouts.map(convertDbWorkoutToMatchingFormat)
        const matches = matchActivityToWorkouts(toMatchableActivity(activity), convertedWorkouts, matchOpts)
        const bestMatch = matches[0]

        // If we have a high-confidence match, use it
        if (bestMatch && bestMatch.confidence >= 0.7) {
          const originalWorkout = userWorkouts.find(w => w.id === bestMatch.workout.id)!
          await updateWorkout(originalWorkout, bestMatch)
          result.match_info = {
            confidence: bestMatch.confidence,
            match_type: bestMatch.matchType,
            discrepancies_count: bestMatch.discrepancies.length,
          }
          return
        }
      }

      // Otherwise, create new workout
      await handleCreateNew()
      result.warnings.push('No high-confidence match found, created new workout')
    }

    async function updateWorkout(workout: typeof workouts.$inferSelect, match: { confidence: number; matchType: string }) {
      const updateData: Partial<typeof workouts.$inferInsert> = {}
      const changes: string[] = []

      if ((syncPrefs.update_status !== false) && workout.status !== 'completed') {
        updateData.status = 'completed'
        changes.push('status → completed')
      }

      if (syncPrefs.update_actual_data !== false) {
        updateData.actual_type = activity.name
        updateData.actual_distance = actualDistance.toString()
        updateData.actual_duration = actualDuration
        changes.push(`actual_distance → ${actualDistance.toFixed(2)} mi`)
        changes.push(`actual_duration → ${actualDuration} min`)
        changes.push(`actual_type → ${activity.name}`)

        // Note: avg_heart_rate field not in current schema
        // if (activity.average_heartrate) {
        //   updateData.avg_heart_rate = activity.average_heartrate
        //   changes.push(`avg_heart_rate → ${activity.average_heartrate} bpm`)
        // }

        if (elevationGainFeet) {
          updateData.elevation_gain = elevationGainFeet
          changes.push(`elevation_gain → ${elevationGainFeet} ft`)
        }

        if ((syncPrefs.detect_terrain !== false) && detectedTerrain) {
          updateData.terrain = detectedTerrain
          changes.push(`terrain → ${detectedTerrain}`)
        }

        if ((syncPrefs.calculate_intensity !== false) && calculatedIntensity && !workout.intensity) {
          updateData.intensity = calculatedIntensity
          changes.push(`intensity → ${calculatedIntensity}`)
        }
      }

      if (syncPrefs.update_notes !== false) {
        const stravaInfo = generateWorkoutNotes()
        if ((syncPrefs.preserve_planned_data !== false) && workout.workout_notes) {
          updateData.workout_notes = `${workout.workout_notes}

--- Strava Sync ---
${stravaInfo}`
        } else {
          updateData.workout_notes = stravaInfo
        }
        changes.push('workout_notes updated')
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(workouts).set(updateData).where(eq(workouts.id, workout.id))
        
        result.workout_id = workout.id
        result.action_taken = 'updated_existing'
        result.changes_made = changes
        
        logger.info('Updated existing workout from Strava activity', {
          activityId: activity.id,
          workoutId: workout.id,
          changesCount: changes.length,
          confidence: match.confidence,
        })
      } else {
        result.action_taken = 'no_action'
        result.warnings.push('No updates needed for this workout')
      }
    }

    function generateWorkoutNotes(): string {
      const pacePerMile = actualDuration / actualDistance
      const paceMinutes = Math.floor(pacePerMile)
      const paceSeconds = Math.round((pacePerMile - paceMinutes) * 60)
      
      return [
        `Synced from Strava: ${activity.name}`,
        `Activity ID: ${activity.id}`,
        `Distance: ${actualDistance.toFixed(2)} miles`,
        `Duration: ${Math.floor(actualDuration / 60)}:${(actualDuration % 60).toString().padStart(2, '0')}`,
        `Average Pace: ${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/mi`,
        activity.average_heartrate ? `Average HR: ${activity.average_heartrate} bpm` : null,
        elevationGainFeet ? `Elevation Gain: ${elevationGainFeet} ft` : null,
        `Date: ${new Date(activity.start_date).toLocaleDateString()}`,
        `Sync Date: ${new Date().toLocaleString()}`,
      ].filter(Boolean).join('\n')
    }

    function categorizeActivity(): string {
      const type = activity.type.toLowerCase()
      const distance = actualDistance
      const duration = actualDuration
      
      if (type === 'run') {
        if (distance >= 13) return 'long_run'
        if (duration < 30) return 'recovery'
        if (activity.average_heartrate && activity.average_heartrate > 160) return 'tempo'
        return 'easy'
      }
      
      return 'cross_training'
    }

    logger.info('Enhanced sync completed', {
      userId: session.user.id,
      activityId: activity.id,
      syncMode: sync_mode,
      actionTaken: result.action_taken,
      changesCount: result.changes_made.length,
      warningsCount: result.warnings.length,
    })

    return NextResponse.json({
      success: result.status === 'success',
      result,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    logger.error('Enhanced sync request failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    return NextResponse.json(
      { error: 'Internal server error during enhanced sync' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/strava/enhanced-sync
 * 
 * Get enhanced sync configuration
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      config: {
        sync_modes: [
          {
            name: 'auto_match',
            description: 'Automatically find and sync to best matching planned workout',
            recommended_for: 'Regular training with planned workouts',
          },
          {
            name: 'create_new',
            description: 'Always create a new workout from the activity',
            recommended_for: 'Unplanned workouts or activities',
          },
          {
            name: 'match_specific',
            description: 'Sync to a specific workout ID',
            recommended_for: 'Manual matching with full control',
            requires: 'target_workout_id',
          },
          {
            name: 'smart_sync',
            description: 'Intelligent sync that decides best action based on matches',
            recommended_for: 'Mixed training with planned and unplanned workouts',
          },
        ],
        default_preferences: {
          update_status: true,
          update_actual_data: true,
          update_notes: true,
          preserve_planned_data: true,
          auto_categorize: true,
          calculate_intensity: true,
          detect_terrain: true,
        },
        default_matching_options: {
          date_tolerance: 1,
          distance_tolerance: 0.15,
          duration_tolerance: 0.2,
          min_confidence: 0.5,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get enhanced sync config', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
