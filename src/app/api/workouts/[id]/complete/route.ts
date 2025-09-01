import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { workouts } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('api-workout-complete')

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workoutId } = await params
    const body = await request.json()

    // Get the workout to ensure it belongs to the user
    const [workout] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, workoutId), eq(workouts.user_id, session.user.id)))
      .limit(1)

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Update the workout status and any actual values provided
    const updateData: Record<string, unknown> = {
      status: 'completed',
      updated_at: new Date(),
    }

    // Optionally update actual values if provided
    if (body.actual_distance !== undefined) {
      updateData.actual_distance = body.actual_distance
    }
    if (body.actual_duration !== undefined) {
      updateData.actual_duration = body.actual_duration
    }
    if (body.actual_type !== undefined) {
      updateData.actual_type = body.actual_type
    }
    if (body.workout_notes !== undefined) {
      updateData.workout_notes = body.workout_notes
    }
    if (body.intensity !== undefined) {
      updateData.intensity = body.intensity
    }
    if (body.terrain !== undefined) {
      updateData.terrain = body.terrain
    }
    if (body.elevation_gain !== undefined) {
      updateData.elevation_gain = body.elevation_gain
    }

    const [updatedWorkout] = await db
      .update(workouts)
      .set(updateData)
      .where(and(eq(workouts.id, workoutId), eq(workouts.user_id, session.user.id)))
      .returning()

    logger.info('Workout marked as complete', {
      workoutId,
      userId: session.user.id,
      hasActualValues: !!(body.actual_distance || body.actual_duration),
    })

    return NextResponse.json(updatedWorkout)
  } catch (error) {
    logger.error('Error completing workout', error)
    return NextResponse.json({ error: 'Failed to complete workout' }, { status: 500 })
  }
}

// Mark workout as skipped
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workoutId } = await params

    // Update the workout status to skipped
    const [updatedWorkout] = await db
      .update(workouts)
      .set({
        status: 'skipped',
        updated_at: new Date(),
      })
      .where(and(eq(workouts.id, workoutId), eq(workouts.user_id, session.user.id)))
      .returning()

    if (!updatedWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    logger.info('Workout marked as skipped', {
      workoutId,
      userId: session.user.id,
    })

    return NextResponse.json(updatedWorkout)
  } catch (error) {
    logger.error('Error skipping workout', error)
    return NextResponse.json({ error: 'Failed to skip workout' }, { status: 500 })
  }
}
