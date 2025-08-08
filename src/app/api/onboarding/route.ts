import { NextRequest, NextResponse } from 'next/server'
import { eq, and, or } from 'drizzle-orm'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user_onboarding, onboarding_steps } from '@/lib/schema'

const logger = createLogger('api/onboarding')

interface UserWithRole {
  id: string
  name: string
  email: string
  role?: 'runner' | 'coach'
}

interface SessionWithRole {
  user?: UserWithRole
}

// Get user's onboarding progress
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionWithRole = session as SessionWithRole
    const userRole = sessionWithRole.user?.role || 'runner'

    // Get user's onboarding progress
    const [userOnboarding] = await db
      .select()
      .from(user_onboarding)
      .where(eq(user_onboarding.user_id, session.user.id))

    // Get available onboarding steps for user's role
    const availableSteps = await db
      .select()
      .from(onboarding_steps)
      .where(
        and(
          eq(onboarding_steps.is_active, true),
          or(
            eq(onboarding_steps.role, userRole),
            eq(onboarding_steps.role, 'both')
          )
        )
      )
      .orderBy(onboarding_steps.step_number)

    // If no onboarding record exists, create one
    if (!userOnboarding && availableSteps.length > 0) {
      const [newOnboarding] = await db
        .insert(user_onboarding)
        .values({
          user_id: session.user.id,
          role: userRole,
          current_step: 1,
          total_steps: availableSteps.length,
          completed: false,
        })
        .returning()

      return NextResponse.json({
        onboarding: newOnboarding,
        steps: availableSteps,
        currentStepData: availableSteps[0] || null,
      })
    }

    const currentStepData = availableSteps.find(
      step => step.step_number === userOnboarding?.current_step
    )

    return NextResponse.json({
      onboarding: userOnboarding,
      steps: availableSteps,
      currentStepData,
    })
  } catch (error) {
    logger.error('Error fetching onboarding data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding data' },
      { status: 500 }
    )
  }
}

// Update onboarding progress
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stepNumber, stepData, completed = false } = body

    if (typeof stepNumber !== 'number') {
      return NextResponse.json(
        { error: 'stepNumber is required and must be a number' },
        { status: 400 }
      )
    }

    // Get existing onboarding record
    const [existingOnboarding] = await db
      .select()
      .from(user_onboarding)
      .where(eq(user_onboarding.user_id, session.user.id))

    if (!existingOnboarding) {
      return NextResponse.json(
        { error: 'Onboarding record not found' },
        { status: 404 }
      )
    }

    // Merge step data with existing data
    const currentStepData = existingOnboarding.step_data as Record<string, unknown> || {}
    const updatedStepData = {
      ...currentStepData,
      [`step_${stepNumber}`]: stepData,
    }

    // Calculate next step and completion status
    const nextStep = completed ? existingOnboarding.total_steps + 1 : stepNumber + 1
    const isCompleted = completed || nextStep > existingOnboarding.total_steps

    const updateData: {
      current_step?: number
      step_data?: Record<string, unknown>
      completed?: boolean
      completed_at?: Date
      updated_at?: Date
    } = {
      step_data: updatedStepData,
      updated_at: new Date(),
    }

    if (!completed) {
      updateData.current_step = Math.min(nextStep, existingOnboarding.total_steps)
    }

    if (isCompleted && !existingOnboarding.completed) {
      updateData.completed = true
      updateData.completed_at = new Date()
      updateData.current_step = existingOnboarding.total_steps
    }

    const [updatedOnboarding] = await db
      .update(user_onboarding)
      .set(updateData)
      .where(eq(user_onboarding.user_id, session.user.id))
      .returning()

    logger.info(`Onboarding progress updated for user ${session.user.id}`, {
      stepNumber,
      completed: isCompleted,
      nextStep: updateData.current_step,
    })

    return NextResponse.json({
      success: true,
      onboarding: updatedOnboarding,
    })
  } catch (error) {
    logger.error('Error updating onboarding progress:', error)
    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    )
  }
}

// Skip onboarding (mark as completed without going through all steps)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [updatedOnboarding] = await db
      .update(user_onboarding)
      .set({
        completed: true,
        skipped_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(user_onboarding.user_id, session.user.id))
      .returning()

    logger.info(`User ${session.user.id} skipped onboarding`)

    return NextResponse.json({
      success: true,
      onboarding: updatedOnboarding,
    })
  } catch (error) {
    logger.error('Error skipping onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to skip onboarding' },
      { status: 500 }
    )
  }
}