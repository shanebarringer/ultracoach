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
    // Get all runners who have training plans with this coach
    const { data: trainingPlans, error: plansError } = await supabaseAdmin
      .from('training_plans')
      .select('runners:runner_id(*)')
      .eq('coach_id', session.user.id)
    if (plansError) {
      logger.error('Failed to fetch runners')
      return NextResponse.json({ error: 'Failed to fetch runners' }, { status: 500 })
    }
    // Extract unique runners
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueRunners = trainingPlans?.reduce((acc: any[], plan: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (plan.runners && !acc.find((r: any) => r.id === plan.runners.id)) {
        acc.push(plan.runners)
      }
      return acc
    }, []) || []
    return NextResponse.json({ runners: uniqueRunners })
  } catch {
    logger.error('API error in GET /runners')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}