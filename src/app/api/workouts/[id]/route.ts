import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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

    // Verify the user has access to this workout
    const { data: workout, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .select('*, training_plans!inner(*)')
      .eq('id', workoutId)
      .single()

    if (workoutError || !workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Check if user has access to this workout
    const hasAccess = session.user.role === 'coach' 
      ? workout.training_plans.coach_id === session.user.id
      : workout.training_plans.runner_id === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Prepare update data based on user role
    const updateData: Record<string, string | number | boolean | null> = {}

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
      console.error('Error updating workout:', updateError)
      return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
    }

    return NextResponse.json({ workout: updatedWorkout })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}