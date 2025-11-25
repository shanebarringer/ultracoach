// Garmin Disconnect Endpoint
// Removes Garmin connection and deletes tokens
// Created: 2025-01-12
// Epic: ULT-16
import { eq } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { garmin_connections } from '@/lib/schema'
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

    // Delete Garmin connection from database
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
