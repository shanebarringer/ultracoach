import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'runners-api' })

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: trainingPlans, error: plansError } = await supabaseAdmin
      .from('training_plans')
      .select('runner_id, runners:runner_id(*)')
      .eq('coach_id', session.user.id)

    if (plansError) {
      logger.error('Failed to fetch runners', plansError)
      return NextResponse.json({ error: 'Failed to fetch runners' }, { status: 500 })
    }

    const runnerIds = [...new Set(trainingPlans.map(p => p.runner_id))]
    const runners = trainingPlans.map(p => p.runners).filter((r, i, a) => a.findIndex(t => t.id === r.id) === i)

    const runnersWithStats = await Promise.all(runners.map(async (runner) => {
      const { data: workouts, error: workoutsError } = await supabaseAdmin
        .from('workouts')
        .select('status, date')
        .in('training_plan_id', trainingPlans.filter(p => p.runner_id === runner.id).map(p => p.id))

      if (workoutsError) {
        logger.error(`Failed to fetch workouts for runner ${runner.id}`, workoutsError)
        return { ...runner, stats: { trainingPlans: 0, completedWorkouts: 0, upcomingWorkouts: 0 } }
      }

      const completedWorkouts = workouts.filter(w => w.status === 'completed').length
      const upcomingWorkouts = workouts.filter(w => w.status === 'planned' && new Date(w.date) >= new Date()).length
      const trainingPlansCount = trainingPlans.filter(p => p.runner_id === runner.id).length

      return {
        ...runner,
        stats: {
          trainingPlans: trainingPlansCount,
          completedWorkouts,
          upcomingWorkouts
        }
      }
    }))

    return NextResponse.json({ runners: runnersWithStats })
  } catch (error) {
    logger.error('API error in GET /runners', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
