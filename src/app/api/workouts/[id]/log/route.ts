import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { workouts } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('api-workout-log')

interface WorkoutLogData {
  actual_distance?: number
  actual_duration?: number
  actual_type?: string
  workout_notes?: string
  injury_notes?: string
  intensity?: number
  terrain?: string
  elevation_gain?: number
  // Performance metrics
  average_pace?: number
  average_heart_rate?: number
  max_heart_rate?: number
  calories?: number
  // Weather conditions
  temperature?: number
  weather_conditions?: string
  wind_speed?: number
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workoutId } = await params

    let body: WorkoutLogData
    try {
      body = (await request.json()) as WorkoutLogData
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Get the workout to ensure it belongs to the user
    const [workout] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, workoutId), eq(workouts.user_id, session.user.id)))
      .limit(1)

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Build update data object with all provided fields
    const updateData: Record<string, unknown> = {
      status: 'completed',
      updated_at: new Date(),
    }

    // Helper to check if a value was actually provided (not null or undefined)
    const isProvided = (v: unknown) => v !== undefined && v !== null

    // Add all provided fields to update
    const allowedFields = [
      'actual_distance',
      'actual_duration',
      'actual_type',
      'workout_notes',
      'injury_notes',
      'intensity',
      'terrain',
      'elevation_gain',
    ] as const

    for (const field of allowedFields) {
      const value = body[field]
      if (isProvided(value)) {
        updateData[field] = value
      }
    }

    // Store additional metrics in workout_notes as JSON if they're provided
    const additionalMetrics: Record<string, unknown> = {}
    const metricFields = [
      'average_pace',
      'average_heart_rate',
      'max_heart_rate',
      'calories',
      'temperature',
      'weather_conditions',
      'wind_speed',
    ] as const

    // Check if any valid fields were provided
    const hasAllowedField = allowedFields.some(k => isProvided(body[k]))
    const hasMetricField = metricFields.some(k => isProvided(body[k]))
    if (!hasAllowedField && !hasMetricField) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
    }

    for (const field of metricFields) {
      const value = body[field]
      if (isProvided(value)) {
        additionalMetrics[field] = value
      }
    }

    // If we have additional metrics, append them to workout_notes as structured data
    if (Object.keys(additionalMetrics).length > 0) {
      let existingNotes =
        (updateData.workout_notes as string | undefined) || workout.workout_notes || ''
      // Remove any existing metrics block to avoid accumulation on repeated updates
      existingNotes = existingNotes.replace(/\n?\n?\[METRICS\][\s\S]*?\[\/METRICS\]/g, '').trim()
      const metricsJson = JSON.stringify(additionalMetrics)
      updateData.workout_notes = existingNotes
        ? `${existingNotes}\n\n[METRICS]${metricsJson}[/METRICS]`
        : `[METRICS]${metricsJson}[/METRICS]`
    }

    const [updatedWorkout] = await db
      .update(workouts)
      .set(updateData)
      .where(and(eq(workouts.id, workoutId), eq(workouts.user_id, session.user.id)))
      .returning()

    logger.info('Workout details logged', {
      workoutId,
      userId: session.user.id,
      fieldsUpdated: Object.keys(updateData).length - 2, // minus status and updated_at
      hasMetrics: Object.keys(additionalMetrics).length > 0,
    })

    return NextResponse.json(updatedWorkout)
  } catch (error) {
    logger.error('Error logging workout details', error)
    return NextResponse.json({ error: 'Failed to log workout details' }, { status: 500 })
  }
}

// Get workout details including parsed metrics
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workoutId } = await params

    const [workout] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, workoutId), eq(workouts.user_id, session.user.id)))
      .limit(1)

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Parse metrics from workout_notes if present
    let metrics = {}
    if (workout.workout_notes) {
      const metricsMatch = workout.workout_notes.match(/\[METRICS\]([\s\S]*?)\[\/METRICS\]/)
      if (metricsMatch) {
        try {
          metrics = JSON.parse(metricsMatch[1])
        } catch {
          logger.warn('Failed to parse workout metrics', { workoutId })
        }
      }
    }

    return NextResponse.json({
      ...workout,
      metrics,
    })
  } catch (error) {
    logger.error('Error fetching workout details', error)
    return NextResponse.json({ error: 'Failed to fetch workout details' }, { status: 500 })
  }
}
