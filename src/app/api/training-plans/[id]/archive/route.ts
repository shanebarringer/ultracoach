import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const { archived } = await request.json()
    // Fetch the plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('training_plans')
      .select('*')
      .eq('id', id)
      .single()
    if (planError || !plan) {
      console.error('Failed to fetch training plan for archive', planError)
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }
    // Update the archived status
    const { data: updatedPlan, error: updateError } = await supabaseAdmin
      .from('training_plans')
      .update({ archived })
      .eq('id', id)
      .select()
      .single()
    if (updateError) {
      console.error('Failed to update training plan archive status', updateError)
      return NextResponse.json({ error: 'Failed to update training plan' }, { status: 500 })
    }
    // Send notification to the other party about the archive/unarchive action
    try {
      const recipientId = session.user.role === 'coach' ? plan.runner_id : plan.coach_id
      const { data: actor } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      const action = archived ? 'archived' : 'unarchived'
      const actorName = actor?.full_name || (session.user.role === 'coach' ? 'Your coach' : 'Your runner')
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: recipientId,
          title: `Training Plan ${archived ? 'Archived' : 'Restored'}`,
          message: `${actorName} has ${action} the training plan "${plan.name}".`,
          type: 'workout',
          category: 'training_plan',
          data: {
            action: 'view_training_plans',
            trainingPlanId: id,
            planName: plan.name,
            archived
          }
        }])
    } catch (error) {
      console.error('Failed to send archive notification', error)
      // Don't fail the main request if notification fails
    }
    return NextResponse.json({ 
      trainingPlan: updatedPlan,
      message: `Training plan ${archived ? 'archived' : 'restored'} successfully`
    })
  } catch (error) {
    console.error('API error in PATCH /training-plans/[id]/archive', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}