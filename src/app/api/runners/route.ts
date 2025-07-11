import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all runners who have training plans with this coach
    const { data: trainingPlans, error: plansError } = await supabaseAdmin
      .from('training_plans')
      .select('runners:runner_id(*)')
      .eq('coach_id', session.user.id)

    if (plansError) {
      console.error('Error fetching training plans:', plansError)
      return NextResponse.json({ error: 'Failed to fetch runners' }, { status: 500 })
    }

    // Extract unique runners
    const uniqueRunners = trainingPlans?.reduce((acc: any[], plan: any) => {
      if (plan.runners && !acc.find(r => r.id === plan.runners.id)) {
        acc.push(plan.runners)
      }
      return acc
    }, []) || []

    // Get additional stats for each runner
    const runnersWithStats = await Promise.all(
      uniqueRunners.map(async (runner) => {
        // Get training plan count
        const { data: planCount } = await supabaseAdmin
          .from('training_plans')
          .select('id', { count: 'exact' })
          .eq('coach_id', session.user.id)
          .eq('runner_id', runner.id)

        // Get completed workouts count
        const { data: completedWorkouts } = await supabaseAdmin
          .from('workouts')
          .select('id', { count: 'exact' })
          .eq('status', 'completed')
          .in(
            'training_plan_id',
            trainingPlans
              ?.filter(p => p.runners?.id === runner.id)
              .map(p => p.id) || []
          )

        // Get upcoming workouts count
        const { data: upcomingWorkouts } = await supabaseAdmin
          .from('workouts')
          .select('id', { count: 'exact' })
          .eq('status', 'planned')
          .gte('date', new Date().toISOString().split('T')[0])
          .in(
            'training_plan_id',
            trainingPlans
              ?.filter(p => p.runners?.id === runner.id)
              .map(p => p.id) || []
          )

        return {
          ...runner,
          stats: {
            trainingPlans: planCount?.length || 0,
            completedWorkouts: completedWorkouts?.length || 0,
            upcomingWorkouts: upcomingWorkouts?.length || 0
          }
        }
      })
    )

    return NextResponse.json({ runners: runnersWithStats })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}