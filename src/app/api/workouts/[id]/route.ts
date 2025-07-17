import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)
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
      console.error('Failed to fetch workout', workoutError)
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
      console.error('Failed to update workout', updateError)
      return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
    }
    // Send notification to coach when runner completes workout
    if (session.user.role === 'runner' && status === 'completed') {
      try {
        // Get coach and runner info
        const { data: coach } = await supabaseAdmin
          .from('better_auth_users')
          .select('id, full_name')
          .eq('id', workout.training_plans.coach_id)
          .single()
        const { data: runner } = await supabaseAdmin
          .from('better_auth_users')
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
      } catch (error) {
        console.error('Failed to send workout completion notification', error)
        // Don't fail the main request if notification fails
      }
    }
    return NextResponse.json({ workout: updatedWorkout })
  } catch (error) {
    console.error('API error in PATCH /workouts/[id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}