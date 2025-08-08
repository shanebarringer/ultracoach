import { and, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { onboarding_steps } from '@/lib/schema'

const logger = createLogger('api/onboarding/steps')

interface UserWithRole {
  id: string
  name: string
  email: string
  role?: 'runner' | 'coach'
}

interface SessionWithRole {
  user?: UserWithRole
}

// Get onboarding steps (filtered by role if provided)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role') as 'runner' | 'coach' | null

    const baseCondition = eq(onboarding_steps.is_active, true)

    const whereCondition = roleFilter
      ? and(
          baseCondition,
          or(eq(onboarding_steps.role, roleFilter), eq(onboarding_steps.role, 'both'))
        )
      : baseCondition

    const steps = await db
      .select()
      .from(onboarding_steps)
      .where(whereCondition)
      .orderBy(onboarding_steps.step_number)

    return NextResponse.json({ steps })
  } catch (error) {
    logger.error('Error fetching onboarding steps:', error)
    return NextResponse.json({ error: 'Failed to fetch onboarding steps' }, { status: 500 })
  }
}

// Create or update onboarding steps (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionWithRole = session as SessionWithRole
    const userRole = sessionWithRole.user?.role || 'runner'

    // Only coaches can manage onboarding steps
    if (userRole !== 'coach') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      step_number,
      role,
      title,
      description,
      step_type,
      fields = [],
      is_required = true,
    } = body

    if (!step_number || !role || !title || !description || !step_type) {
      return NextResponse.json(
        {
          error: 'Missing required fields: step_number, role, title, description, step_type',
        },
        { status: 400 }
      )
    }

    const [step] = await db
      .insert(onboarding_steps)
      .values({
        step_number,
        role,
        title,
        description,
        step_type,
        fields,
        is_required,
        is_active: true,
      })
      .returning()

    logger.info(`Onboarding step created: ${step.id} by admin ${session.user.id}`)

    return NextResponse.json({
      success: true,
      step,
    })
  } catch (error) {
    logger.error('Error creating onboarding step:', error)
    return NextResponse.json({ error: 'Failed to create onboarding step' }, { status: 500 })
  }
}
