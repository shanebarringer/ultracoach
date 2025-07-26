import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Get all runners who have training plans with this coach
    const { data: trainingPlans, error: plansError } = await supabaseAdmin
      .from('training_plans')
      .select('runners:runner_id(*)')
      .eq('coach_id', session.user.id)
    if (plansError) {
      console.error('Failed to fetch runners', plansError)
      return NextResponse.json({ error: 'Failed to fetch runners' }, { status: 500 })
    }
    // Extract unique runners
    const uniqueRunners: unknown[] = []
    
    if (trainingPlans) {
      for (const plan of trainingPlans) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const runners = (plan as any).runners
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (runners && !uniqueRunners.find((r: any) => r.id === runners.id)) {
          uniqueRunners.push(runners)
        }
      }
    }
    return NextResponse.json({ runners: uniqueRunners })
  } catch (error) {
    console.error('API error in GET /runners', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
