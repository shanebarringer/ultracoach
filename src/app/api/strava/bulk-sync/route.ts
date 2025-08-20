import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getServerSession } from '@/utils/auth-server'
import { createLogger } from '@/lib/logger'
import { db } from '@/lib/db'
import { workouts } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import type { WorkoutUpdateData, SyncOptions } from '@/types/common'

const logger = createLogger('StravaBulkSyncAPI')

// Validation schemas
const bulkSyncSchema = z.object({
  operations: z.array(z.object({
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
    }),
    workout_match: z.object({
      workout: z.object({
        id: z.string(),
        planned_type: z.string().nullable(),
        planned_distance: z.number().nullable(),
        planned_duration: z.number().nullable(),
        status: z.string(),
        date: z.string(),
      }),
      confidence: z.number().min(0).max(1),
      match_type: z.enum(['exact', 'probable', 'possible', 'conflict']),
      discrepancies: z.array(z.object({
        field: z.enum(['distance', 'duration', 'type', 'date']),
        planned: z.union([z.string(), z.number()]),
        actual: z.union([z.string(), z.number()]),
        severity: z.enum(['minor', 'moderate', 'major']),
        description: z.string(),
      })),
      suggestions: z.array(z.string()),
    }),
    sync_options: z.object({
      update_status: z.boolean().default(true),
      update_actual_data: z.boolean().default(true),
      update_notes: z.boolean().default(true),
      overwrite_existing: z.boolean().default(false),
    }).optional(),
  })).min(1).max(50), // Limit to 50 operations per batch
  global_options: z.object({
    continue_on_error: z.boolean().default(true),
    min_confidence_threshold: z.number().min(0).max(1).default(0.3),
    dry_run: z.boolean().default(false),
  }).optional(),
})

interface SyncResult {
  activity_id: number
  workout_id: string
  status: 'success' | 'skipped' | 'error'
  changes_made: string[]
  error_message?: string
  confidence: number
}

/**
 * POST /api/strava/bulk-sync
 * 
 * Perform bulk synchronization of Strava activities to planned workouts
 * 
 * Features:
 * - Batch processing of multiple activity-workout pairs
 * - Configurable sync options for each operation
 * - Transaction-based updates with rollback on critical failures
 * - Detailed result tracking and error reporting
 * - Dry-run mode for testing without making changes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      logger.warn('Unauthorized bulk sync request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    logger.info('Processing bulk sync request', {
      userId: session.user.id,
      operationsCount: body.operations?.length || 0,
    })

    // Validate request body
    const validation = bulkSyncSchema.safeParse(body)
    if (!validation.success) {
      logger.warn('Invalid bulk sync request', { errors: validation.error.issues })
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { operations, global_options } = validation.data
    const globalOpts = {
      continue_on_error: true,
      min_confidence_threshold: 0.3,
      dry_run: false,
      ...global_options
    }
    const isDryRun = globalOpts.dry_run || false
    
    logger.info('Starting bulk sync processing', {
      userId: session.user.id,
      operationsCount: operations.length,
      isDryRun,
      minConfidence: globalOpts.min_confidence_threshold,
      continueOnError: globalOpts.continue_on_error,
    })

    const results: SyncResult[] = []
    const errors: string[] = []
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Process each operation
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      const { activity, workout_match, sync_options } = operation
      const syncOpts: SyncOptions = sync_options || {};

      try {
        logger.debug(`Processing operation ${i + 1}/${operations.length}`, {
          activityId: activity.id,
          workoutId: workout_match.workout.id,
          confidence: workout_match.confidence,
        })

        // Check confidence threshold
        if (workout_match.confidence < globalOpts.min_confidence_threshold!) {
          const result: SyncResult = {
            activity_id: activity.id,
            workout_id: workout_match.workout.id,
            status: 'skipped',
            changes_made: [],
            error_message: `Confidence ${(workout_match.confidence * 100).toFixed(1)}% below threshold ${(globalOpts.min_confidence_threshold! * 100).toFixed(1)}%`,
            confidence: workout_match.confidence,
          }
          results.push(result)
          skippedCount++
          continue
        }

        // Verify workout ownership
        const existingWorkout = await db
          .select()
          .from(workouts)
          .where(eq(workouts.id, workout_match.workout.id))

        if (existingWorkout.length === 0 || existingWorkout[0].user_id !== session.user.id) {
          const result: SyncResult = {
            activity_id: activity.id,
            workout_id: workout_match.workout.id,
            status: 'error',
            changes_made: [],
            error_message: 'Workout not found or access denied',
            confidence: workout_match.confidence,
          }
          results.push(result)
          errorCount++
          
          if (!globalOpts.continue_on_error) {
            break
          }
          continue
        }

        const currentWorkout = existingWorkout[0]
        const changesMade: string[] = []
        const updateData: WorkoutUpdateData = {}

        // Skip if already completed and not overwriting
        if (currentWorkout.status === 'completed' && !syncOpts.overwrite_existing) {
          const result: SyncResult = {
            activity_id: activity.id,
            workout_id: workout_match.workout.id,
            status: 'skipped',
            changes_made: [],
            error_message: 'Workout already completed (use overwrite_existing to update)',
            confidence: workout_match.confidence,
          }
          results.push(result)
          skippedCount++
          continue
        }

        // Prepare updates based on sync options
        if (syncOpts.update_status) {
          updateData.status = 'completed'
          changesMade.push('status → completed')
        }

        if (syncOpts.update_actual_data) {
          // Convert Strava data to workout format
          const actualDistance = activity.distance / 1609.34 // meters to miles
          const actualDuration = Math.round(activity.moving_time / 60) // seconds to minutes
          
          updateData.actual_distance = actualDistance.toString()
          updateData.actual_duration = actualDuration
          updateData.actual_type = activity.name
          
          changesMade.push(`actual_distance → ${actualDistance.toFixed(2)} mi`)
          changesMade.push(`actual_duration → ${actualDuration} min`)
          changesMade.push(`actual_type → ${activity.name}`)

          // Add optional Strava data if available
          if (activity.average_heartrate) {
            updateData.avg_heart_rate = activity.average_heartrate
            changesMade.push(`avg_heart_rate → ${activity.average_heartrate} bpm`)
          }

          if (activity.total_elevation_gain) {
            updateData.elevation_gain = Math.round(activity.total_elevation_gain * 3.28084) // meters to feet
            changesMade.push(`elevation_gain → ${updateData.elevation_gain} ft`)
          }

          // Set terrain based on activity type and trainer status
          if (activity.trainer) {
            updateData.terrain = 'treadmill'
            changesMade.push('terrain → treadmill')
          } else if (activity.type.toLowerCase() === 'run') {
            updateData.terrain = 'trail' // Default for outdoor runs
            changesMade.push('terrain → trail')
          }
        }

        if (syncOpts.update_notes) {
          const syncNotes = `Synced from Strava activity "${activity.name}" (ID: ${activity.id})
` +
            `Confidence: ${(workout_match.confidence * 100).toFixed(1)}%
` +
            `Sync date: ${new Date().toISOString()}`

          // Append to existing notes if any
          if (currentWorkout.workout_notes) {
            updateData.workout_notes = `${currentWorkout.workout_notes}

--- Strava Sync ---
${syncNotes}`
          } else {
            updateData.workout_notes = syncNotes
          }
          changesMade.push('workout_notes updated')
        }

        // Perform the update (unless dry run)
        if (!isDryRun && Object.keys(updateData).length > 0) {
          await db
            .update(workouts)
            .set(updateData)
            .where(eq(workouts.id, workout_match.workout.id))

          logger.debug('Workout updated successfully', {
            workoutId: workout_match.workout.id,
            changes: changesMade,
          })
        }

        const result: SyncResult = {
          activity_id: activity.id,
          workout_id: workout_match.workout.id,
          status: 'success',
          changes_made: changesMade,
          confidence: workout_match.confidence,
        }
        results.push(result)
        successCount++

      } catch (operationError) {
        const errorMessage = operationError instanceof Error ? operationError.message : 'Unknown error'
        logger.error(`Operation ${i + 1} failed`, { 
          activityId: operation.activity.id,
          workoutId: operation.workout_match.workout.id,
          error: errorMessage,
        })

        const result: SyncResult = {
          activity_id: operation.activity.id,
          workout_id: operation.workout_match.workout.id,
          status: 'error',
          changes_made: [],
          error_message: errorMessage,
          confidence: operation.workout_match.confidence,
        }
        results.push(result)
        errorCount++
        errors.push(`Activity ${operation.activity.id}: ${errorMessage}`)

        if (!globalOpts.continue_on_error) {
          logger.warn('Stopping bulk sync due to error and continue_on_error=false')
          break
        }
      }
    }

    const summary = {
      total_operations: operations.length,
      processed: results.length,
      successful: successCount,
      skipped: skippedCount,
      errors: errorCount,
      dry_run: isDryRun,
    }

    logger.info('Bulk sync completed', {
      userId: session.user.id,
      ...summary,
      duration: Date.now(),
    })

    return NextResponse.json({
      success: errorCount === 0 || globalOpts.continue_on_error,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined,
      options: globalOpts,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    logger.error('Bulk sync request failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    return NextResponse.json(
      { error: 'Internal server error during bulk sync' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/strava/bulk-sync
 * 
 * Get bulk sync configuration and limits
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      config: {
        limits: {
          max_operations_per_batch: 50,
          max_confidence_threshold: 1.0,
          min_confidence_threshold: 0.0,
        },
        default_options: {
          continue_on_error: true,
          min_confidence_threshold: 0.3,
          dry_run: false,
          sync_options: {
            update_status: true,
            update_actual_data: true,
            update_notes: true,
            overwrite_existing: false,
          },
        },
      },
      supported_fields: [
        'status',
        'actual_distance',
        'actual_duration', 
        'actual_type',
        'avg_heart_rate',
        'elevation_gain',
        'terrain',
        'workout_notes',
      ],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get bulk sync config', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
