import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { workouts } from '@/lib/schema'
import type { WorkoutUpdateData } from '@/types/common'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('StravaMergeAPI')

// Validation schemas
const mergeOperationSchema = z.object({
  workout_id: z.string(),
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
  merge_strategy: z.enum(['prefer_planned', 'prefer_actual', 'manual', 'smart_merge']),
  field_preferences: z
    .object({
      distance: z.enum(['planned', 'actual', 'average', 'max']).optional(),
      duration: z.enum(['planned', 'actual', 'average', 'max']).optional(),
      type: z.enum(['planned', 'actual', 'combined']).optional(),
      intensity: z.enum(['planned', 'calculated', 'manual']).optional(),
      notes: z.enum(['planned', 'actual', 'append', 'prepend']).optional(),
      terrain: z.enum(['planned', 'detected', 'manual']).optional(),
    })
    .optional(),
  custom_values: z
    .object({
      intensity: z.number().min(1).max(10).optional(),
      terrain: z.enum(['road', 'trail', 'track', 'treadmill']).optional(),
      category: z
        .enum([
          'easy',
          'tempo',
          'interval',
          'long_run',
          'race_simulation',
          'recovery',
          'strength',
          'cross_training',
          'rest',
        ])
        .optional(),
      notes: z.string().max(2000).optional(),
    })
    .optional(),
  preserve_history: z.boolean().default(true),
})

interface MergeResult {
  workout_id: string
  activity_id: number
  status: 'success' | 'conflict' | 'error'
  changes_made: Record<string, { from: unknown; to: unknown; strategy: string }>
  conflicts: Array<{
    field: string
    planned_value: unknown
    actual_value: unknown
    resolution: string
  }>
  error_message?: string
  backup_created?: boolean
}

/**
 * POST /api/strava/merge
 *
 * Intelligently merge Strava activity data with planned workout data
 *
 * Features:
 * - Multiple merge strategies (prefer planned, prefer actual, smart merge, manual)
 * - Field-level control over merge behavior
 * - Conflict detection and resolution
 * - History preservation with backup creation
 * - Smart data transformation (units, formats, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      logger.warn('Unauthorized merge request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    logger.info('Processing merge request', {
      userId: session.user.id,
      workoutId: body.workout_id,
      activityId: body.activity?.id,
      strategy: body.merge_strategy,
    })

    // Validate request body
    const validation = mergeOperationSchema.safeParse(body)
    if (!validation.success) {
      logger.warn('Invalid merge request', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const {
      workout_id,
      activity,
      merge_strategy,
      field_preferences,
      custom_values,
      preserve_history,
    } = validation.data

    // Fetch existing workout
    const existingWorkout = await db.select().from(workouts).where(eq(workouts.id, workout_id))

    if (existingWorkout.length === 0 || existingWorkout[0].user_id !== session.user.id) {
      logger.warn('Workout not found or access denied', {
        workoutId: workout_id,
        userId: session.user.id,
      })
      return NextResponse.json(
        {
          error: 'Workout not found or access denied',
        },
        { status: 404 }
      )
    }

    const currentWorkout = existingWorkout[0]
    const result: MergeResult = {
      workout_id,
      activity_id: activity.id,
      status: 'success',
      changes_made: {},
      conflicts: [],
    }

    // Create backup if requested
    let backupData: Record<string, unknown> | null = null
    if (preserve_history) {
      backupData = {
        ...currentWorkout,
        backup_timestamp: new Date().toISOString(),
        backup_reason: `Pre-merge backup before Strava activity ${activity.id} merge`,
      }
      result.backup_created = true
    }

    // Prepare merged data
    const mergedData: WorkoutUpdateData = {}
    const fieldPrefs = field_preferences || {}
    const customVals = custom_values || {}

    // Helper function to detect conflicts
    const detectConflict = (
      field: string,
      plannedValue: unknown,
      actualValue: unknown
    ): boolean => {
      if (plannedValue == null && actualValue == null) return false
      if (plannedValue == null || actualValue == null) return false

      // For numbers, consider values within 10% as non-conflicting
      if (typeof plannedValue === 'number' && typeof actualValue === 'number') {
        const tolerance = Math.abs(plannedValue * 0.1)
        return Math.abs(plannedValue - actualValue) > tolerance
      }

      // For strings, exact match required
      return plannedValue !== actualValue
    }

    // Helper function to apply merge strategy
    const applyMergeStrategy = (
      field: string,
      plannedValue: number | string | null | undefined,
      actualValue: number | string | null | undefined,
      preference?: string
    ): { value: number | string | null | undefined; strategy: string } => {
      const pref = preference || merge_strategy

      switch (pref) {
        case 'prefer_planned':
          return { value: plannedValue || actualValue, strategy: 'prefer_planned' }
        case 'prefer_actual':
          return { value: actualValue || plannedValue, strategy: 'prefer_actual' }
        case 'smart_merge':
          // Smart merge logic based on field type
          if (field === 'distance' || field === 'duration') {
            // For metrics, prefer actual if planned is missing or very different
            if (!plannedValue) return { value: actualValue, strategy: 'smart_merge (no_planned)' }
            if (!actualValue) return { value: plannedValue, strategy: 'smart_merge (no_actual)' }

            // Ensure both values are numbers for comparison
            const plannedNum =
              typeof plannedValue === 'string' ? parseFloat(plannedValue) : (plannedValue as number)
            const actualNum = actualValue as number
            const diff = Math.abs((actualNum - plannedNum) / plannedNum)
            if (diff > 0.2) {
              // More than 20% difference
              return { value: actualValue, strategy: 'smart_merge (significant_diff)' }
            }
            return { value: plannedValue, strategy: 'smart_merge (close_match)' }
          }
          // For other fields, prefer actual
          return { value: actualValue || plannedValue, strategy: 'smart_merge (default)' }
        case 'manual':
          return {
            value: customVals[field as keyof typeof customVals] || plannedValue,
            strategy: 'manual',
          }
        default:
          return { value: plannedValue, strategy: 'fallback' }
      }
    }

    // Process distance
    const plannedDistance = currentWorkout.planned_distance
      ? parseFloat(currentWorkout.planned_distance)
      : null
    const actualDistance = activity.distance / 1609.34 // Convert meters to miles

    if (detectConflict('distance', plannedDistance, actualDistance)) {
      result.conflicts.push({
        field: 'distance',
        planned_value: plannedDistance,
        actual_value: actualDistance,
        resolution: fieldPrefs.distance || merge_strategy,
      })
    }

    const distanceResult = applyMergeStrategy(
      'distance',
      plannedDistance,
      actualDistance,
      fieldPrefs.distance
    )
    if (distanceResult.value !== currentWorkout.actual_distance) {
      mergedData.actual_distance = distanceResult.value?.toString() || '0'
      result.changes_made.actual_distance = {
        from: currentWorkout.actual_distance,
        to: distanceResult.value,
        strategy: distanceResult.strategy,
      }
    }

    // Process duration
    const plannedDuration = currentWorkout.planned_duration
    const actualDuration = Math.round(activity.moving_time / 60) // Convert seconds to minutes

    if (detectConflict('duration', plannedDuration, actualDuration)) {
      result.conflicts.push({
        field: 'duration',
        planned_value: plannedDuration,
        actual_value: actualDuration,
        resolution: fieldPrefs.duration || merge_strategy,
      })
    }

    const durationResult = applyMergeStrategy(
      'duration',
      plannedDuration,
      actualDuration,
      fieldPrefs.duration
    )
    if (durationResult.value !== currentWorkout.actual_duration) {
      mergedData.actual_duration = durationResult.value as number
      result.changes_made.actual_duration = {
        from: currentWorkout.actual_duration,
        to: durationResult.value,
        strategy: durationResult.strategy,
      }
    }

    // Process type
    const plannedType = currentWorkout.planned_type
    const actualType = activity.name

    if (fieldPrefs.type === 'combined' && plannedType && actualType) {
      mergedData.actual_type = `${plannedType} (${actualType})`
      result.changes_made.actual_type = {
        from: currentWorkout.actual_type,
        to: mergedData.actual_type,
        strategy: 'combined',
      }
    } else {
      const typeResult = applyMergeStrategy('type', plannedType, actualType, fieldPrefs.type)
      if (typeResult.value !== currentWorkout.actual_type) {
        mergedData.actual_type = typeResult.value as string
        result.changes_made.actual_type = {
          from: currentWorkout.actual_type,
          to: typeResult.value,
          strategy: typeResult.strategy,
        }
      }
    }

    // Note: Heart rate data not stored in current schema
    // Could be added to workout_notes for future reference

    // Process elevation
    if (activity.total_elevation_gain) {
      const elevationFeet = Math.round(activity.total_elevation_gain * 3.28084)
      mergedData.elevation_gain = elevationFeet
      result.changes_made.elevation_gain = {
        from: currentWorkout.elevation_gain,
        to: elevationFeet,
        strategy: 'strava_data',
      }
    }

    // Process terrain
    let detectedTerrain: string | null = null
    if (activity.trainer) {
      detectedTerrain = 'treadmill'
    } else if (activity.type.toLowerCase() === 'run') {
      detectedTerrain = 'trail' // Default assumption for outdoor runs
    }

    if (detectedTerrain) {
      const terrainResult = applyMergeStrategy(
        'terrain',
        currentWorkout.terrain,
        detectedTerrain,
        fieldPrefs.terrain
      )
      if (terrainResult.value !== currentWorkout.terrain) {
        mergedData.terrain = terrainResult.value as string
        result.changes_made.terrain = {
          from: currentWorkout.terrain,
          to: terrainResult.value,
          strategy: terrainResult.strategy,
        }
      }
    }

    // Process notes
    const stravaInfo =
      `Strava Activity: ${activity.name} (ID: ${activity.id})\n` +
      `Distance: ${actualDistance.toFixed(2)} mi, Duration: ${actualDuration} min\n` +
      `Date: ${new Date(activity.start_date).toLocaleDateString()}`

    let mergedNotes = currentWorkout.workout_notes || ''

    switch (fieldPrefs.notes) {
      case 'actual':
        mergedNotes = stravaInfo
        break
      case 'append':
        mergedNotes = mergedNotes
          ? `${mergedNotes}\n\n--- Strava Data ---\n${stravaInfo}`
          : stravaInfo
        break
      case 'prepend':
        mergedNotes = mergedNotes
          ? `--- Strava Data ---\n${stravaInfo}\n\n${mergedNotes}`
          : stravaInfo
        break
      case 'planned':
      default:
        if (!mergedNotes) {
          mergedNotes = stravaInfo
        }
        break
    }

    if (mergedNotes !== currentWorkout.workout_notes) {
      mergedData.workout_notes = mergedNotes
      result.changes_made.workout_notes = {
        from:
          currentWorkout.workout_notes?.substring(0, 100) +
          (currentWorkout.workout_notes && currentWorkout.workout_notes.length > 100 ? '...' : ''),
        to: 'Updated with Strava information',
        strategy: fieldPrefs.notes || 'append',
      }
    }

    // Apply custom values
    if (customVals.intensity && customVals.intensity !== currentWorkout.intensity) {
      mergedData.intensity = customVals.intensity
      result.changes_made.intensity = {
        from: currentWorkout.intensity,
        to: customVals.intensity,
        strategy: 'manual',
      }
    }

    if (customVals.category && customVals.category !== currentWorkout.category) {
      mergedData.category = customVals.category
      result.changes_made.category = {
        from: currentWorkout.category,
        to: customVals.category,
        strategy: 'manual',
      }
    }

    // Mark as completed
    if (currentWorkout.status !== 'completed') {
      mergedData.status = 'completed'
      result.changes_made.status = {
        from: currentWorkout.status,
        to: 'completed',
        strategy: 'auto',
      }
    }

    // Save backup if preserving history
    if (preserve_history && backupData) {
      mergedData.mergeHistory = JSON.stringify({
        backup: backupData,
        merge_timestamp: new Date().toISOString(),
        merge_strategy,
        activity_id: activity.id,
        conflicts_count: result.conflicts.length,
      })
    }

    // Apply updates to database
    if (Object.keys(mergedData).length > 0) {
      await db.update(workouts).set(mergedData).where(eq(workouts.id, workout_id))

      logger.info('Workout merge completed', {
        workoutId: workout_id,
        activityId: activity.id,
        changesCount: Object.keys(result.changes_made).length,
        conflictsCount: result.conflicts.length,
        strategy: merge_strategy,
      })
    } else {
      logger.info('No changes needed for workout merge', {
        workoutId: workout_id,
        activityId: activity.id,
      })
    }

    // Determine final status
    if (result.conflicts.length > 0) {
      result.status = 'conflict'
    } else {
      result.status = 'success'
    }

    return NextResponse.json({
      success: true,
      result,
      summary: {
        changes_count: Object.keys(result.changes_made).length,
        conflicts_count: result.conflicts.length,
        strategy_used: merge_strategy,
        backup_created: preserve_history,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Merge request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json({ error: 'Internal server error during merge' }, { status: 500 })
  }
}

/**
 * GET /api/strava/merge
 *
 * Get merge configuration and supported strategies
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      config: {
        supported_strategies: [
          {
            name: 'prefer_planned',
            description: 'Keep planned values, use actual only when planned is missing',
          },
          {
            name: 'prefer_actual',
            description: 'Use actual Strava data, fallback to planned values',
          },
          {
            name: 'smart_merge',
            description: 'Intelligent merging based on field type and value differences',
          },
          {
            name: 'manual',
            description: 'Use custom values specified in the request',
          },
        ],
        field_options: {
          distance: ['planned', 'actual', 'average', 'max'],
          duration: ['planned', 'actual', 'average', 'max'],
          type: ['planned', 'actual', 'combined'],
          intensity: ['planned', 'calculated', 'manual'],
          notes: ['planned', 'actual', 'append', 'prepend'],
          terrain: ['planned', 'detected', 'manual'],
        },
        supported_fields: [
          'status',
          'actual_distance',
          'actual_duration',
          'actual_type',
          'avg_heart_rate',
          'elevation_gain',
          'terrain',
          'intensity',
          'category',
          'workout_notes',
        ],
        defaults: {
          merge_strategy: 'smart_merge',
          preserve_history: true,
          field_preferences: {
            distance: 'actual',
            duration: 'actual',
            type: 'combined',
            notes: 'append',
          },
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get merge config', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
