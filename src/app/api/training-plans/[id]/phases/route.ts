import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'
import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const logger = createLogger('TrainingPlanPhasesAPI')

/**
 * GET /api/training-plans/[id]/phases
 *
 * Returns plan phases for a training plan.
 * Currently returns empty array as the plan_phases table is not yet implemented.
 * This stub prevents 404 errors while the full phases feature is developed.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await params

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    // Verify user has access to this training plan (ownership check)
    const { data: plan, error: planError } = await supabaseAdmin
      .from('training_plans')
      .select('id, coach_id, runner_id')
      .eq('id', planId)
      .single()

    // Separate error handling for better observability
    if (planError) {
      logger.error('Error loading training plan for phases', { planId, error: planError })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!plan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    // Explicit authorization for supported user types (deny unknown types by default)
    let hasAccess = false

    if (session.user.userType === 'coach') {
      hasAccess = plan.coach_id === session.user.id
    } else if (session.user.userType === 'runner') {
      hasAccess = plan.runner_id === session.user.id
    } else {
      // Deny access for unknown/unsupported user types
      logger.warn('Unknown userType attempted phases access', {
        planId,
        userId: session.user.id,
        userType: session.user.userType,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    logger.info('Phases requested for training plan', {
      planId,
      userId: session.user.id,
    })

    // TODO: Implement full phases feature with plan_phases table
    // For now, return empty array to prevent 404 errors
    return NextResponse.json({
      plan_phases: [],
    })
  } catch (error) {
    logger.error('Error fetching plan phases', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
