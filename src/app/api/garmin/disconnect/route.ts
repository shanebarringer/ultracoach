// Garmin Disconnect Endpoint
// Removes Garmin connection and deletes tokens
// Created: 2025-01-12
// Epic: ULT-16
import { eq, inArray } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { garmin_connections, garmin_devices, garmin_workout_syncs, workouts } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('garmin-disconnect-api')

/**
 * DELETE /api/garmin/disconnect
 * Disconnects Garmin account and removes all stored data
 */
export async function DELETE(_request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()
    if (!session || !session.user) {
      logger.warn('Unauthenticated Garmin disconnect attempt')
      return new Response('Unauthorized', { status: 401 })
    }

    logger.info('Disconnecting Garmin account', {
      userId: session.user.id,
    })

    // Get user's workouts to delete associated sync records
    const userWorkouts = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(eq(workouts.user_id, session.user.id))

    const workoutIds = userWorkouts.map(w => w.id)

    // Delete related records in proper order (cascade manually for data integrity)
    // 1. Delete workout sync records for user's workouts
    if (workoutIds.length > 0) {
      const deletedSyncs = await db
        .delete(garmin_workout_syncs)
        .where(inArray(garmin_workout_syncs.workout_id, workoutIds))
        .returning()

      logger.debug('Deleted Garmin workout syncs', {
        userId: session.user.id,
        count: deletedSyncs.length,
      })
    }

    // 2. Delete Garmin devices for user
    const deletedDevices = await db
      .delete(garmin_devices)
      .where(eq(garmin_devices.user_id, session.user.id))
      .returning()

    logger.debug('Deleted Garmin devices', {
      userId: session.user.id,
      count: deletedDevices.length,
    })

    // 3. Delete Garmin connection
    const result = await db
      .delete(garmin_connections)
      .where(eq(garmin_connections.user_id, session.user.id))
      .returning()

    if (result.length === 0) {
      logger.warn('No Garmin connection found to disconnect', {
        userId: session.user.id,
      })
      return NextResponse.json({ error: 'No Garmin connection found' }, { status: 404 })
    }

    logger.info('Garmin account disconnected successfully', {
      userId: session.user.id,
      garminUserId: result[0].garmin_user_id,
      deletedDevices: deletedDevices.length,
    })

    return NextResponse.json({
      success: true,
      message: 'Garmin account disconnected successfully',
    })
  } catch (error) {
    logger.error('Garmin disconnect error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json({ error: 'Failed to disconnect Garmin account' }, { status: 500 })
  }
}
