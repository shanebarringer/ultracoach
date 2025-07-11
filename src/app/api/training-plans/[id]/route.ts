import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'training-plan-id-api' })

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
      logger.error('Failed to fetch workouts for training plan')
      return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
    }
    return NextResponse.json({ 
      trainingPlan, 
      workouts: workouts || [] 
    })
  } catch (error) {
    logger.error('Internal server error in GET', { error: error instanceof Error ? error.message : error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    // Fetch the plan to check permissions
    const { data: plan, error: planError } = await supabaseAdmin
      .from('training_plans')
      .select('*')
      .eq('id', id)
      .single()
    if (planError || !plan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }
    const hasAccess = session.user.role === 'coach'
      ? plan.coach_id === session.user.id
      : plan.runner_id === session.user.id
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    // Delete the plan
    const { error: deleteError } = await supabaseAdmin
      .from('training_plans')
      .delete()
      .eq('id', id)
    if (deleteError) {
      logger.error('Failed to delete training plan')
      return NextResponse.json({ error: 'Failed to delete training plan' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Training plan deleted successfully' }, { status: 200 })
  } catch (error) {
    logger.error('Internal server error in DELETE', { error: error instanceof Error ? error.message : error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}