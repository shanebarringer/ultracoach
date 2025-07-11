import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch training plan with user access control
    let trainingPlanQuery = supabaseAdmin
      .from('training_plans')
      .select('*, runners:runner_id(*), coaches:coach_id(*)')
      .eq('id', id)

    if (session.user.role === 'coach') {
      trainingPlanQuery = trainingPlanQuery.eq('coach_id', session.user.id)
    } else {
      trainingPlanQuery = trainingPlanQuery.eq('runner_id', session.user.id)
    }

    const { data: trainingPlan, error: planError } = await trainingPlanQuery.single()

    if (planError || !trainingPlan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    // Fetch workouts for this training plan
    const { data: workouts, error: workoutsError } = await supabaseAdmin
      .from('workouts')
      .select('*')
      .eq('training_plan_id', id)
      .order('date', { ascending: true })

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError)
      return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
    }

    return NextResponse.json({ 
      trainingPlan, 
      workouts: workouts || [] 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}