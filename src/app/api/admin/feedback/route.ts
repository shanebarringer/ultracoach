import { desc, eq, sql } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user, user_feedback } from '@/lib/schema'

const logger = createLogger('api/admin/feedback')

interface UserWithRole {
  id: string
  name: string
  email: string
  role?: 'runner' | 'coach'
}

interface SessionWithRole {
  user?: UserWithRole
}

// Get all feedback (coaches/admins only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only coaches can access admin feedback
    const sessionWithRole = session as SessionWithRole
    const userRole = sessionWithRole.user?.role || 'runner'
    if (userRole !== 'coach') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const feedbackList = await db
      .select({
        id: user_feedback.id,
        user_id: user_feedback.user_id,
        feedback_type: user_feedback.feedback_type,
        category: user_feedback.category,
        title: user_feedback.title,
        description: user_feedback.description,
        priority: user_feedback.priority,
        status: user_feedback.status,
        user_email: user_feedback.user_email,
        browser_info: user_feedback.browser_info,
        page_url: user_feedback.page_url,
        admin_notes: user_feedback.admin_notes,
        resolved_by: user_feedback.resolved_by,
        resolved_at: user_feedback.resolved_at,
        created_at: user_feedback.created_at,
        updated_at: user_feedback.updated_at,
        user: {
          name: user.name,
          email: user.email,
        },
      })
      .from(user_feedback)
      .leftJoin(user, eq(user_feedback.user_id, user.id))
      .orderBy(desc(user_feedback.created_at))

    return NextResponse.json({ feedback: feedbackList })
  } catch (error) {
    logger.error('Error fetching admin feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}

// Update feedback status and admin notes
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only coaches can update feedback
    const sessionWithRole = session as SessionWithRole
    const userRole = sessionWithRole.user?.role || 'runner'
    if (userRole !== 'coach') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { feedbackId, status, admin_notes } = body

    if (!feedbackId) {
      return NextResponse.json({ error: 'Missing feedbackId' }, { status: 400 })
    }

    const updateData: {
      updated_at?: ReturnType<typeof sql>
      status?: 'open' | 'in_progress' | 'resolved' | 'closed'
      resolved_by?: string
      resolved_at?: ReturnType<typeof sql>
      admin_notes?: string
    } = {
      updated_at: sql`now()`,
    }

    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      updateData.status = status as 'open' | 'in_progress' | 'resolved' | 'closed'

      // Set resolved info if status is resolved
      if (status === 'resolved') {
        updateData.resolved_by = session.user.id
        updateData.resolved_at = sql`now()`
      }
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const [updatedFeedback] = await db
      .update(user_feedback)
      .set(updateData)
      .where(eq(user_feedback.id, feedbackId))
      .returning()

    if (!updatedFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    logger.info(`Feedback ${feedbackId} updated by admin ${session.user.id}`)

    return NextResponse.json({
      success: true,
      feedback: updatedFeedback,
    })
  } catch (error) {
    logger.error('Error updating feedback:', error)
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
  }
}
