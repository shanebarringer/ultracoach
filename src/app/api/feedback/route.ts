import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user_feedback } from '@/lib/schema'

const logger = createLogger('api/feedback')

interface FeedbackRequest {
  feedback_type: 'bug_report' | 'feature_request' | 'general_feedback' | 'complaint' | 'compliment'
  category?: string
  title: string
  description: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  user_email?: string
  browser_info?: {
    userAgent?: string
    screenWidth?: number
    screenHeight?: number
    language?: string
    timezone?: string
  }
  page_url?: string
}

// Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: FeedbackRequest = await request.json()

    // Validate required fields
    if (!body.feedback_type || !body.title || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: feedback_type, title, description' },
        { status: 400 }
      )
    }

    // Insert feedback into database
    const [feedback] = await db
      .insert(user_feedback)
      .values({
        user_id: session.user.id,
        feedback_type: body.feedback_type,
        category: body.category,
        title: body.title,
        description: body.description,
        priority: body.priority || 'medium',
        user_email: body.user_email,
        browser_info: body.browser_info,
        page_url: body.page_url,
        status: 'open',
      })
      .returning()

    logger.info(`New feedback submitted: ${feedback.id} by user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        title: feedback.title,
        status: feedback.status,
        created_at: feedback.created_at,
      },
    })
  } catch (error) {
    logger.error('Error submitting feedback:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}

// Get user's feedback submissions
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedbackList = await db
      .select({
        id: user_feedback.id,
        feedback_type: user_feedback.feedback_type,
        category: user_feedback.category,
        title: user_feedback.title,
        description: user_feedback.description,
        priority: user_feedback.priority,
        status: user_feedback.status,
        created_at: user_feedback.created_at,
        updated_at: user_feedback.updated_at,
        resolved_at: user_feedback.resolved_at,
      })
      .from(user_feedback)
      .where(eq(user_feedback.user_id, session.user.id))
      .orderBy(user_feedback.created_at)

    return NextResponse.json({ feedback: feedbackList })
  } catch (error) {
    logger.error('Error fetching user feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}
