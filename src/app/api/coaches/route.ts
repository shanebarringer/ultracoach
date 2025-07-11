import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'coaches-api' })

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'runner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Get all coaches who have training plans with this runner
    const { data: trainingPlans, error: plansError } = await supabaseAdmin
      .from('training_plans')
      .select('coaches:coach_id(*)')
      .eq('runner_id', session.user.id)
    if (plansError) {
      logger.error('Failed to fetch coaches')
      return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 })
    }
    // Extract unique coaches
    const uniqueCoaches = trainingPlans?.reduce((acc: any[], plan: any) => {
      if (plan.coaches && !acc.find(c => c.id === plan.coaches.id)) {
        acc.push(plan.coaches)
      }
      return acc
    }, []) || []
    return NextResponse.json({ coaches: uniqueCoaches })
  } catch {
    logger.error('API error in GET /coaches')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}