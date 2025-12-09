import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'
import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkTrainingPlanAccess } from '@/lib/training-plan-auth'

const logger = createLogger('TrainingPlanAPI')

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    // Fetch training plan with user access control
    let trainingPlanQuery = supabaseAdmin
      .from('training_plans')
      .select('*, runners:runner_id(*), coaches:coach_id(*)')
      .eq('id', id)
    if (session.user.userType === 'coach') {
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
      logger.error('Failed to fetch workouts for training plan', workoutsError)
      return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
    }
    return NextResponse.json({
      trainingPlan,
      workouts: workouts || [],
    })
  } catch (error) {
    logger.error('Internal server error in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request)
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
    // Separate error handling for better observability
    if (planError) {
      logger.error('Error loading training plan for delete', { id, error: planError })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!plan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    // Use shared auth helper for consistent authorization logic
    const { hasAccess } = checkTrainingPlanAccess(
      { id: session.user.id, userType: session.user.userType },
      { coach_id: plan.coach_id, runner_id: plan.runner_id }
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Delete the plan
    const { error: deleteError } = await supabaseAdmin.from('training_plans').delete().eq('id', id)
    if (deleteError) {
      logger.error('Failed to delete training plan', deleteError)
      return NextResponse.json({ error: 'Failed to delete training plan' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Training plan deleted successfully' }, { status: 200 })
  } catch (error) {
    logger.error('Internal server error in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
