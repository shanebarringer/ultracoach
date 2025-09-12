import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'
import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const logger = createLogger('api-training-plans-archive')

// Zod validation schema for archive request
const ArchiveRequestSchema = z.object({
  archived: z.boolean(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()

    // Validate request body with Zod
    const validationResult = ArchiveRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.issues[0].message }, { status: 400 })
    }

    const { archived } = validationResult.data
    // Fetch the plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('training_plans')
      .select('*')
      .eq('id', id)
      .single()
    if (planError || !plan) {
      logger.error('Failed to fetch training plan for archive', planError)
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    // Authorization: coach owns the plan; allow runner only if product requirements permit
    const isCoach = session.user.userType === 'coach'
    const authorized =
      (isCoach && session.user.id === plan.coach_id) ||
      (!isCoach && session.user.id === plan.runner_id)

    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Update the archived status
    const { data: updatedPlan, error: updateError } = await supabaseAdmin
      .from('training_plans')
      .update({ archived })
      .eq('id', id)
      .select()
      .single()
    if (updateError) {
      logger.error('Failed to update training plan archive status', updateError)
      return NextResponse.json({ error: 'Failed to update training plan' }, { status: 500 })
    }
    // Send notification to the other party about the archive/unarchive action
    try {
      const recipientId = session.user.userType === 'coach' ? plan.runner_id : plan.coach_id
      const { data: actor } = await supabaseAdmin
        .from('better_auth_users')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      const action = archived ? 'archived' : 'unarchived'
      const actorName =
        actor?.full_name || (session.user.userType === 'coach' ? 'Your coach' : 'Your runner')
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: recipientId,
          title: `Training Plan ${archived ? 'Archived' : 'Restored'}`,
          message: `${actorName} has ${action} the training plan "${plan.name}".`,
          type: 'workout',
          category: 'training_plan',
          data: {
            action: 'view_training_plans',
            trainingPlanId: id,
            planName: plan.name,
            archived,
          },
        },
      ])
    } catch (error) {
      logger.error('Failed to send archive notification', error)
      // Don't fail the main request if notification fails
    }
    return NextResponse.json({
      trainingPlan: updatedPlan,
      message: `Training plan ${archived ? 'archived' : 'restored'} successfully`,
    })
  } catch (error) {
    logger.error('API error in PATCH /training-plans/[id]/archive', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
