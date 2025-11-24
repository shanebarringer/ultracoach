// Garmin Activity Import Endpoint
// Imports completed Garmin activity to UltraCoach workout
// Created: 2025-01-12
// Epic: ULT-16
import { addDays, parseISO, subDays } from 'date-fns'
import { and, eq, gte, lte } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { GarminAPIClient, isTokenExpired } from '@/lib/garmin-client'
import { createLogger } from '@/lib/logger'
import { garmin_connections, garmin_workout_syncs, workouts } from '@/lib/schema'
import type { ImportActivityRequest, ImportActivityResponse } from '@/types/garmin'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('garmin-import-api')

/**
 * POST /api/garmin/import
 * Import Garmin activity to UltraCoach workout
 *
 * Body: {
 *   activity_id: number
 *   workout_id?: string  // Optional: specify exact workout to update
 * }
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()
    if (!session || !session.user) {
      logger.warn('Unauthenticated import attempt')
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse request body
    const body: ImportActivityRequest = await request.json()
    const { activity_id, workout_id } = body

    if (!activity_id) {
      return NextResponse.json({ error: 'activity_id is required' }, { status: 400 })
    }

    logger.info('Importing Garmin activity', {
      userId: session.user.id,
      activityId: activity_id,
      explicitWorkoutId: workout_id,
    })

    // Get Garmin connection
    const connection = await db
      .select()
      .from(garmin_connections)
      .where(eq(garmin_connections.user_id, session.user.id))
      .limit(1)

    if (connection.length === 0) {
      return NextResponse.json({ error: 'No Garmin connection found' }, { status: 404 })
    }

    const conn = connection[0]

    // Check token expiration
    if (isTokenExpired(new Date(conn.token_expires_at))) {
      return NextResponse.json(
        { error: 'Garmin token expired. Please reconnect.' },
        { status: 401 }
      )
    }

    // Decrypt access token
    const accessToken = Buffer.from(conn.access_token, 'base64').toString('utf-8')

    // Fetch activity details from Garmin
    const garminClient = new GarminAPIClient(accessToken)
    const activity = await garminClient.getActivity(activity_id)

    logger.debug('Activity details fetched', {
      activityId: activity_id,
      name: activity.activityName,
      distance: activity.distance,
      duration: activity.duration,
    })

    // Find matching workout
    let targetWorkout
    if (workout_id) {
      // Use explicitly specified workout
      const result = await db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, workout_id), eq(workouts.user_id, session.user.id)))
        .limit(1)

      targetWorkout = result[0]
    } else {
      // Auto-match based on activity date/type
      const activityDate = parseISO(activity.startTimeLocal)
      const searchStart = subDays(activityDate, 1)
      const searchEnd = addDays(activityDate, 1)

      const candidateWorkouts = await db
        .select()
        .from(workouts)
        .where(
          and(
            eq(workouts.user_id, session.user.id),
            gte(workouts.date, searchStart),
            lte(workouts.date, searchEnd)
          )
        )

      // Simple matching: closest by date
      if (candidateWorkouts.length > 0) {
        targetWorkout = candidateWorkouts.reduce((closest, current) => {
          const closestDiff = Math.abs(new Date(closest.date).getTime() - activityDate.getTime())
          const currentDiff = Math.abs(new Date(current.date).getTime() - activityDate.getTime())
          return currentDiff < closestDiff ? current : closest
        })

        logger.debug('Auto-matched workout', {
          activityId: activity_id,
          workoutId: targetWorkout.id,
          dateDiff:
            Math.abs(new Date(targetWorkout.date).getTime() - activityDate.getTime()) / 1000 / 60, // minutes
        })
      }
    }

    if (!targetWorkout) {
      logger.warn('No matching workout found', {
        activityId: activity_id,
        explicitWorkoutId: workout_id,
      })

      return NextResponse.json(
        {
          error: 'No matching workout found',
          suggestion: 'Try specifying a workout_id explicitly',
        },
        { status: 404 }
      )
    }

    // Update workout with activity data
    const distanceMiles = activity.distance / 1609.34 // meters to miles
    await db
      .update(workouts)
      .set({
        actual_distance: distanceMiles.toFixed(2),
        actual_duration: activity.duration,
        status: 'completed',
        updated_at: new Date(),
      })
      .where(eq(workouts.id, targetWorkout.id))

    // Create/update sync record
    const existingSync = await db
      .select()
      .from(garmin_workout_syncs)
      .where(
        and(
          eq(garmin_workout_syncs.workout_id, targetWorkout.id),
          eq(garmin_workout_syncs.sync_direction, 'from_garmin')
        )
      )
      .limit(1)

    if (existingSync.length > 0) {
      await db
        .update(garmin_workout_syncs)
        .set({
          garmin_activity_id: activity_id,
          sync_status: 'synced',
          synced_at: new Date(),
          sync_error: null,
          updated_at: new Date(),
        })
        .where(eq(garmin_workout_syncs.id, existingSync[0].id))
    } else {
      await db.insert(garmin_workout_syncs).values({
        workout_id: targetWorkout.id,
        garmin_activity_id: activity_id,
        sync_direction: 'from_garmin',
        sync_status: 'synced',
        synced_at: new Date(),
      })
    }

    logger.info('Activity imported successfully', {
      userId: session.user.id,
      activityId: activity_id,
      workoutId: targetWorkout.id,
      distanceMiles: distanceMiles.toFixed(2),
      durationSeconds: activity.duration,
    })

    const response: ImportActivityResponse = {
      success: true,
      workout_id: targetWorkout.id,
      activity_id,
      matched: !workout_id, // true if auto-matched
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Activity import error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json({ error: 'Failed to import Garmin activity' }, { status: 500 })
  }
}
