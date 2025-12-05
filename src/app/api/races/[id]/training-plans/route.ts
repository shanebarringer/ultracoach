import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { training_plans, user } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('RaceTrainingPlansAPI')

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: raceId } = await params

    try {
      // Get all training plans with runner details
      // Note: Currently training_plans doesn't have race_id or goal_type fields
      // For now, we'll show all training plans and improve filtering later
      const plansForRace = await db
        .select({
          id: training_plans.id,
          title: training_plans.title,
          description: training_plans.description,
          created_at: training_plans.created_at,
          runner_name: user.fullName,
          runner_email: user.email,
          runner_id: user.id,
        })
        .from(training_plans)
        .leftJoin(user, eq(training_plans.runner_id, user.id))

      logger.info('Training plans for race fetched successfully', {
        raceId,
        count: plansForRace.length,
      })

      return NextResponse.json({
        training_plans: plansForRace,
        count: plansForRace.length,
      })
    } catch (error) {
      logger.error('Error fetching training plans for race:', error)
      return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in GET /api/races/[id]/training-plans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
