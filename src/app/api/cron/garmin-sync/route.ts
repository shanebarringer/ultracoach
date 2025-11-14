// Garmin Automatic Sync Cron Job
// Runs daily to sync upcoming workouts for all connected users
// Created: 2025-01-12
// Epic: ULT-16

import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { garmin_connections, workouts } from '@/lib/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'
import { GarminAPIClient, isTokenExpired } from '@/lib/garmin-client'
import { convertWorkoutToGarmin, validateGarminWorkout } from '@/utils/garmin-workout-converter'
import { addDays, startOfDay } from 'date-fns'

const logger = createLogger('garmin-cron-sync')

/**
 * GET /api/cron/garmin-sync
 * Automatic daily sync of upcoming workouts
 *
 * Note: Protected by Vercel cron secret
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron job not properly configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', {
        hasAuth: !!authHeader,
      })
      return new Response('Unauthorized', { status: 401 })
    }

    logger.info('Starting automatic Garmin sync cron job')

    const startTime = Date.now()

    // Get all active Garmin connections
    const connections = await db
      .select()
      .from(garmin_connections)
      .where(eq(garmin_connections.sync_status, 'active'))

    logger.info('Active Garmin connections found', {
      count: connections.length,
    })

    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active connections to sync',
        processed: 0,
      })
    }

    // Define sync window: next 7 days
    const today = startOfDay(new Date())
    const syncEnd = addDays(today, 7)

    let totalSynced = 0
    let totalFailed = 0
    const userResults: Record<string, { synced: number; failed: number }> = {}

    // Process each connection
    for (const conn of connections) {
      try {
        // Skip if token is expired
        if (isTokenExpired(new Date(conn.token_expires_at))) {
          logger.warn('Skipping expired token', {
            userId: conn.user_id,
          })

          // Update connection status
          await db
            .update(garmin_connections)
            .set({
              sync_status: 'expired',
              updated_at: new Date(),
            })
            .where(eq(garmin_connections.id, conn.id))

          continue
        }

        // Decrypt access token
        const accessToken = Buffer.from(conn.access_token, 'base64').toString('utf-8')
        const garminClient = new GarminAPIClient(accessToken)

        // Fetch upcoming workouts for this user
        const upcomingWorkouts = await db
          .select()
          .from(workouts)
          .where(
            and(
              eq(workouts.user_id, conn.user_id),
              gte(workouts.date, today),
              lte(workouts.date, syncEnd)
            )
          )

        logger.debug('Workouts found for user', {
          userId: conn.user_id,
          count: upcomingWorkouts.length,
        })

        let userSynced = 0
        let userFailed = 0

        // Sync each workout
        for (const workout of upcomingWorkouts) {
          try {
            const garminWorkout = convertWorkoutToGarmin(workout)
            const validation = validateGarminWorkout(garminWorkout)

            if (!validation.valid) {
              throw new Error(`Invalid workout: ${validation.errors.join(', ')}`)
            }

            // Create or update workout in Garmin
            await garminClient.createWorkout(garminWorkout)

            userSynced++
            totalSynced++
          } catch (workoutError) {
            logger.error('Failed to sync individual workout', {
              userId: conn.user_id,
              workoutId: workout.id,
              error: workoutError instanceof Error ? workoutError.message : 'Unknown',
            })

            userFailed++
            totalFailed++
          }
        }

        // Update connection last_sync_at
        await db
          .update(garmin_connections)
          .set({
            last_sync_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(garmin_connections.id, conn.id))

        userResults[conn.user_id] = { synced: userSynced, failed: userFailed }

        logger.debug('User sync completed', {
          userId: conn.user_id,
          synced: userSynced,
          failed: userFailed,
        })
      } catch (userError) {
        logger.error('Failed to process user', {
          userId: conn.user_id,
          error: userError instanceof Error ? userError.message : 'Unknown',
        })

        userResults[conn.user_id] = { synced: 0, failed: 0 }
      }
    }

    const duration = Date.now() - startTime

    logger.info('Automatic Garmin sync completed', {
      duration: `${duration}ms`,
      users: connections.length,
      totalSynced,
      totalFailed,
    })

    return NextResponse.json({
      success: true,
      processed: connections.length,
      synced: totalSynced,
      failed: totalFailed,
      duration,
      userResults,
    })
  } catch (error) {
    logger.error('Cron sync error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete automatic sync',
      },
      { status: 500 }
    )
  }
}
