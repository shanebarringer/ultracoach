// Garmin Manual Sync Endpoint
// Syncs UltraCoach workouts to Garmin Connect calendar
// Created: 2025-01-12
// Epic: ULT-16
import { and, eq, inArray } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { decrypt, isEncrypted } from '@/lib/crypto'
import { db } from '@/lib/database'
import { GarminAPIClient, isTokenExpired } from '@/lib/garmin-client'
import { createLogger } from '@/lib/logger'
import { garmin_connections, garmin_workout_syncs, workouts } from '@/lib/schema'
import type { SyncResult, SyncWorkoutsRequest, SyncWorkoutsResponse } from '@/types/garmin'
import { getServerSession } from '@/utils/auth-server'
import { convertWorkoutToGarmin, validateGarminWorkout } from '@/utils/garmin-workout-converter'

const logger = createLogger('garmin-sync-api')

/**
 * POST /api/garmin/sync
 * Manually sync workouts to Garmin calendar
 *
 * Body: {
 *   workout_ids: string[]  // Array of workout IDs to sync
 *   sync_mode: 'manual' | 'automatic'
 * }
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()
    if (!session || !session.user) {
      logger.warn('Unauthenticated sync attempt')
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse request body
    const body: SyncWorkoutsRequest = await request.json()
    const { workout_ids, sync_mode = 'manual' } = body

    if (!workout_ids || !Array.isArray(workout_ids) || workout_ids.length === 0) {
      return NextResponse.json({ error: 'workout_ids array is required' }, { status: 400 })
    }

    logger.info('Starting workout sync', {
      userId: session.user.id,
      workoutCount: workout_ids.length,
      syncMode: sync_mode,
    })

    // Get Garmin connection
    const connection = await db
      .select()
      .from(garmin_connections)
      .where(eq(garmin_connections.user_id, session.user.id))
      .limit(1)

    if (connection.length === 0) {
      logger.warn('No Garmin connection found', { userId: session.user.id })
      return NextResponse.json(
        { error: 'No Garmin connection found. Please connect your Garmin account first.' },
        { status: 404 }
      )
    }

    const conn = connection[0]

    // Check if token is expired
    if (isTokenExpired(new Date(conn.token_expires_at))) {
      logger.warn('Garmin token expired', { userId: session.user.id })
      return NextResponse.json(
        { error: 'Garmin token expired. Please reconnect your account.' },
        { status: 401 }
      )
    }

    // Decrypt access token (supports both encrypted and legacy base64 format)
    const accessToken = isEncrypted(conn.access_token)
      ? decrypt(conn.access_token)
      : Buffer.from(conn.access_token, 'base64').toString('utf-8')

    // Create Garmin API client
    const garminClient = new GarminAPIClient(accessToken)

    // Fetch workouts to sync
    const workoutsToSync = await db
      .select()
      .from(workouts)
      .where(and(inArray(workouts.id, workout_ids), eq(workouts.user_id, session.user.id)))

    if (workoutsToSync.length === 0) {
      return NextResponse.json({ error: 'No workouts found with provided IDs' }, { status: 404 })
    }

    logger.debug('Workouts fetched for sync', {
      requested: workout_ids.length,
      found: workoutsToSync.length,
    })

    // Sync each workout
    const results: SyncResult[] = []
    let syncedCount = 0
    let failedCount = 0

    for (const workout of workoutsToSync) {
      try {
        // Convert to Garmin format
        const garminWorkout = convertWorkoutToGarmin(workout)

        // Validate conversion
        const validation = validateGarminWorkout(garminWorkout)
        if (!validation.valid) {
          throw new Error(`Invalid workout: ${validation.errors.join(', ')}`)
        }

        // Check if already synced
        const existingSync = await db
          .select()
          .from(garmin_workout_syncs)
          .where(
            and(
              eq(garmin_workout_syncs.workout_id, workout.id),
              eq(garmin_workout_syncs.sync_direction, 'to_garmin')
            )
          )
          .limit(1)

        let garminWorkoutId: number

        if (existingSync.length > 0 && existingSync[0].garmin_workout_id) {
          // Update existing workout
          garminWorkoutId = parseInt(existingSync[0].garmin_workout_id)
          await garminClient.updateWorkout(garminWorkoutId, garminWorkout)

          // Update sync record
          await db
            .update(garmin_workout_syncs)
            .set({
              sync_status: 'synced',
              synced_at: new Date(),
              sync_error: null,
              updated_at: new Date(),
            })
            .where(eq(garmin_workout_syncs.id, existingSync[0].id))

          logger.debug('Workout updated in Garmin', {
            workoutId: workout.id,
            garminWorkoutId,
          })
        } else {
          // Create new workout
          const createResult = await garminClient.createWorkout(garminWorkout)
          garminWorkoutId = createResult.workoutId

          // Create sync record
          await db.insert(garmin_workout_syncs).values({
            workout_id: workout.id,
            garmin_workout_id: garminWorkoutId.toString(),
            sync_direction: 'to_garmin',
            sync_status: 'synced',
            synced_at: new Date(),
          })

          logger.debug('Workout created in Garmin', {
            workoutId: workout.id,
            garminWorkoutId,
          })
        }

        results.push({
          workout_id: workout.id,
          garmin_workout_id: garminWorkoutId,
          status: 'synced',
        })

        syncedCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        logger.error('Workout sync failed', {
          workoutId: workout.id,
          error: errorMessage,
        })

        // Create/update sync record with error
        const existingSync = await db
          .select()
          .from(garmin_workout_syncs)
          .where(
            and(
              eq(garmin_workout_syncs.workout_id, workout.id),
              eq(garmin_workout_syncs.sync_direction, 'to_garmin')
            )
          )
          .limit(1)

        if (existingSync.length > 0) {
          await db
            .update(garmin_workout_syncs)
            .set({
              sync_status: 'failed',
              sync_error: errorMessage,
              updated_at: new Date(),
            })
            .where(eq(garmin_workout_syncs.id, existingSync[0].id))
        } else {
          await db.insert(garmin_workout_syncs).values({
            workout_id: workout.id,
            sync_direction: 'to_garmin',
            sync_status: 'failed',
            sync_error: errorMessage,
          })
        }

        results.push({
          workout_id: workout.id,
          status: 'failed',
          error: errorMessage,
        })

        failedCount++
      }
    }

    // Update last_sync_at on connection
    await db
      .update(garmin_connections)
      .set({
        last_sync_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(garmin_connections.user_id, session.user.id))

    logger.info('Workout sync completed', {
      userId: session.user.id,
      total: workoutsToSync.length,
      synced: syncedCount,
      failed: failedCount,
    })

    const response: SyncWorkoutsResponse = {
      success: failedCount === 0,
      synced: syncedCount,
      failed: failedCount,
      results,
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Sync endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json({ error: 'Failed to sync workouts to Garmin' }, { status: 500 })
  }
}
