import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user || session.user.role !== 'runner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Get all coaches who have training plans with this runner
    const { data: trainingPlans, error: plansError } = await supabaseAdmin
      .from('training_plans')
      .select('coaches:coach_id(*)')
      .eq('runner_id', session.user.id)
    if (plansError) {
      console.error('Failed to fetch coaches', plansError)
      return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 })
    }
    // Extract unique coaches
    const uniqueCoaches: unknown[] = []

    if (trainingPlans) {
      for (const plan of trainingPlans) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const coaches = (plan as any).coaches
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (coaches && !uniqueCoaches.find((c: any) => c.id === coaches.id)) {
          uniqueCoaches.push(coaches)
        }
      }
    }
    return NextResponse.json({ coaches: uniqueCoaches })
  } catch (error) {
    console.error('API error in GET /coaches', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
