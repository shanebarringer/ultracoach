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

    if (planError || !plan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    // Check if user owns this plan (as coach or runner)
    const hasAccess =
      session.user.userType === 'coach'
        ? plan.coach_id === session.user.id
        : plan.runner_id === session.user.id

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
