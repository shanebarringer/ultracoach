import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { strava_activity_syncs, strava_connections, workouts } from '@/lib/schema'
import { StravaActivity, STRAVA_ACTIVITY_TYPE_MAP } from '@/types/strava'
import { getActivityById, ensureValidToken } from '@/lib/strava'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('strava-sync-api')

const SyncRequestSchema = z.object({
  activity_id: z.number(),
  sync_as_workout: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { activity_id, sync_as_workout } = SyncRequestSchema.parse(body)

    // Get user's Strava connection
    const connection = await db
      .select()
      .from(strava_connections)
      .where(eq(strava_connections.user_id, session.user.id))
      .limit(1)

    if (connection.length === 0) {
      return NextResponse.json(
        { error: 'No Strava connection found' },
        { status: 404 }
      )
    }

    const conn = connection[0]

    // Check if activity is already synced
    const existingSync = await db
      .select()
      .from(strava_activity_syncs)
      .where(eq(strava_activity_syncs.strava_activity_id, activity_id))
      .limit(1)

    if (existingSync.length > 0) {
      return NextResponse.json(
        { error: 'Activity already synced', sync_id: existingSync[0].id },
        { status: 409 }
      )
    }

    // Ensure token is valid
    const validToken = await ensureValidToken({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      expires_at: conn.expires_at,
    })

    // Fetch detailed activity from Strava
    const activity = (await getActivityById(validToken.access_token, activity_id)) as StravaActivity

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found on Strava' },
        { status: 404 }
      )
    }

    let ultracoachWorkoutId = null

    if (sync_as_workout) {
      // Convert Strava activity to UltraCoach workout
      const workoutCategory = STRAVA_ACTIVITY_TYPE_MAP[activity.sport_type] || 'easy'
      
      // Convert meters to miles for distance
      const distanceMiles = activity.distance / 1609.34
      
      // Convert seconds to minutes for duration  
      const durationMinutes = Math.round(activity.moving_time / 60)

      // Create workout in UltraCoach
      const workout = await db
        .insert(workouts)
        .values({
          user_id: session.user.id,
          title: activity.name || `${workoutCategory} - ${new Date(activity.start_date).toLocaleDateString()}`,
          date: new Date(activity.start_date),
          actual_distance: distanceMiles.toString(),
          actual_duration: durationMinutes,
          actual_type: workoutCategory,
          category: workoutCategory,
          intensity: activity.average_heartrate ? Math.min(Math.max(Math.round(activity.average_heartrate / 20), 1), 10) : 5,
          workout_notes: `Imported from Strava: ${activity.name}\n\nDistance: ${distanceMiles.toFixed(2)} miles\nMoving Time: ${Math.floor(durationMinutes / 60)}:${String(durationMinutes % 60).padStart(2, '0')}\nElevation Gain: ${Math.round(activity.total_elevation_gain * 3.28084)} ft`,
          status: 'completed',
          elevation_gain: Math.round(activity.total_elevation_gain * 3.28084),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning({ id: workouts.id })

      ultracoachWorkoutId = workout[0].id
      
      logger.info('Created UltraCoach workout from Strava activity', {
        stravaActivityId: activity_id,
        ultracoachWorkoutId,
        workoutCategory,
        distance: distanceMiles,
        duration: durationMinutes,
      })
    }

    // Create sync record
    const sync = await db
      .insert(strava_activity_syncs)
      .values({
        connection_id: conn.id,
        strava_activity_id: activity_id,
        ultracoach_workout_id: ultracoachWorkoutId,
        activity_data: activity,
        sync_status: 'synced',
        synced_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: strava_activity_syncs.id })

    logger.info('Synced Strava activity successfully', {
      userId: session.user.id,
      stravaActivityId: activity_id,
      syncId: sync[0].id,
      createdWorkout: !!ultracoachWorkoutId,
    })

    return NextResponse.json({
      sync_id: sync[0].id,
      workout_id: ultracoachWorkoutId,
      activity: {
        id: activity.id,
        name: activity.name,
        type: activity.sport_type,
        distance: activity.distance,
        moving_time: activity.moving_time,
        start_date: activity.start_date,
      },
      synced_at: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    logger.error('Error syncing Strava activity:', error)
    return NextResponse.json(
      { error: 'Failed to sync Strava activity' },
      { status: 500 }
    )
  }
}