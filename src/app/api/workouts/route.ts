import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const runnerId = searchParams.get('runnerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch workouts based on user role
    let query = supabaseAdmin
      .from('workouts')
      .select('*, training_plans!inner(*)')

    if (session.user.role === 'coach') {
      query = query.eq('training_plans.coach_id', session.user.id)
      
      // If specific runner requested, filter by runner
      if (runnerId) {
        query = query.eq('training_plans.runner_id', runnerId)
      }
    } else {
      query = query.eq('training_plans.runner_id', session.user.id)
    }

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: workouts, error } = await query.order('date', { ascending: false })

    if (error) {
      console.error('Error fetching workouts:', error)
      return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
    }

    return NextResponse.json({ workouts: workouts || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      trainingPlanId, 
      date, 
      plannedType, 
      plannedDistance, 
      plannedDuration, 
      notes 
    } = await request.json()

    if (!trainingPlanId || !date || !plannedType) {
      return NextResponse.json({ 
        error: 'Training plan ID, date, and workout type are required' 
      }, { status: 400 })
    }

    // Verify the coach owns this training plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('training_plans')
      .select('*')
      .eq('id', trainingPlanId)
      .eq('coach_id', session.user.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    // Create the workout
    const { data: workout, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .insert([
        {
          training_plan_id: trainingPlanId,
          date,
          planned_type: plannedType,
          planned_distance: plannedDistance,
          planned_duration: plannedDuration,
          workout_notes: notes,
          status: 'planned'
        },
      ])
      .select()
      .single()

    if (workoutError) {
      console.error('Error creating workout:', workoutError)
      return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
    }

    return NextResponse.json({ workout }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}