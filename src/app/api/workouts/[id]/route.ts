import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'workouts-id-api' })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: workoutId } = await params
    const {
      actualType,
      actualDistance,
      actualDuration,
      workoutNotes,
      injuryNotes,
      status,
      coachFeedback
    } = await request.json()
    // Fetch the workout and related plan
    const { data: workout, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .select('*, training_plans:training_plan_id(*)')
      .eq('id', workoutId)
      .single()
    if (workoutError || !workout) {
      logger.error('Failed to fetch workout')
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }
    // Prepare update data
    const updateData: Partial<{
      actual_type: string
      actual_distance: number
      actual_duration: number
      workout_notes: string
      injury_notes: string
      status: string
      coach_feedback: string
    }> = {}
    if (session.user.role === 'runner') {
      // Runners can update their workout logs
      updateData.actual_type = actualType
      updateData.actual_distance = actualDistance
      updateData.actual_duration = actualDuration
      updateData.workout_notes = workoutNotes
      updateData.injury_notes = injuryNotes
      updateData.status = status
    } else {
      // Coaches can update feedback and modify planned workouts
      if (coachFeedback !== undefined) {
        updateData.coach_feedback = coachFeedback
      }
      if (actualType !== undefined) updateData.actual_type = actualType
      if (actualDistance !== undefined) updateData.actual_distance = actualDistance
      if (actualDuration !== undefined) updateData.actual_duration = actualDuration
      if (workoutNotes !== undefined) updateData.workout_notes = workoutNotes
      if (injuryNotes !== undefined) updateData.injury_notes = injuryNotes
      if (status !== undefined) updateData.status = status
    }
    // Update the workout
    const { data: updatedWorkout, error: updateError } = await supabaseAdmin
      .from('workouts')
      .update(updateData)
      .eq('id', workoutId)
      .select()
      .single()
    if (updateError) {
      logger.error('Failed to update workout')
      return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
    }
    // Send notification to coach when runner completes workout
    if (session.user.role === 'runner' && status === 'completed') {
      try {
        // Get coach and runner info
        const { data: coach } = await supabaseAdmin
          .from('users')
          .select('id, full_name')
          .eq('id', workout.training_plans.coach_id)
          .single()
        const { data: runner } = await supabaseAdmin
          .from('users')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
        if (coach && runner) {
          const workoutType = actualType || workout.planned_type
          const distance = actualDistance ? ` (${actualDistance} miles)` : ''
          await supabaseAdmin
            .from('notifications')
            .insert([{
              user_id: coach.id,
              title: 'Workout Completed',
              message: `${runner.full_name} completed their ${workoutType}${distance} workout.`,
              type: 'workout',
              category: 'workout',
              data: {
                action: 'view_workouts',
                workoutId: workoutId,
                runnerId: session.user.id,
                runnerName: runner.full_name,
                workoutType,
                actualDistance,
                actualDuration
              }
            }])
        }
      } catch {
        logger.error('Failed to send workout completion notification')
        // Don't fail the main request if notification fails
      }
    }
    return NextResponse.json({ workout: updatedWorkout })
  } catch {
    logger.error('API error in PATCH /workouts/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}