import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import {
  feedbackTypeLabels,
  generateFeedbackEmailHTML,
  generateFeedbackEmailText,
} from '@/lib/email/feedback-template'
import { createLogger } from '@/lib/logger'
import { user_feedback } from '@/lib/schema'

const logger = createLogger('api/feedback')

// Validate and initialize Resend with API key
const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) {
  logger.warn(
    'RESEND_API_KEY is not configured - email notifications will not be sent. Set RESEND_API_KEY environment variable to enable email notifications.'
  )
}
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// Zod schema for runtime validation of feedback request
const feedbackRequestSchema = z.object({
  feedback_type: z.enum([
    'bug_report',
    'feature_request',
    'general_feedback',
    'complaint',
    'compliment',
  ]),
  category: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be 5000 characters or less'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  user_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  browser_info: z
    .object({
      userAgent: z.string().optional(),
      screenWidth: z.number().optional(),
      screenHeight: z.number().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  page_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
})

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>

// Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await request.json()

    // Validate request body with Zod for runtime type safety
    const validation = feedbackRequestSchema.safeParse(rawBody)
    if (!validation.success) {
      logger.warn('Invalid feedback request:', validation.error.flatten())
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const body = validation.data

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

    // Validate that created_at was properly set by the database
    if (!feedback.created_at) {
      logger.error(`Feedback ${feedback.id} missing created_at timestamp`)
      throw new Error('Database failed to set created_at timestamp')
    }

    // Prepare email props (DRY - used by both HTML and text generators)
    const emailProps = {
      feedback_type: feedback.feedback_type,
      category: feedback.category || undefined,
      title: feedback.title,
      description: feedback.description,
      priority: (feedback.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      user_email: feedback.user_email || undefined,
      user_name: session.user.name || undefined,
      browser_info: feedback.browser_info as
        | {
            userAgent?: string
            screenWidth?: number
            screenHeight?: number
            language?: string
            timezone?: string
          }
        | undefined,
      page_url: feedback.page_url || undefined,
      submitted_at: feedback.created_at,
    }

    // Send email notification asynchronously (non-blocking)
    if (resend) {
      // Fire-and-forget: send email without blocking the response
      const feedbackEmail = process.env.FEEDBACK_EMAIL || 'feedback@example.com'
      const feedbackTypeLabel = feedbackTypeLabels[feedback.feedback_type] || 'Feedback'

      // Use setImmediate to defer email sending until after response is sent
      // NOTE: On serverless/edge runtimes, setImmediate work may not complete if the
      // process freezes after response. This is acceptable for best-effort email delivery.
      // For guaranteed delivery, consider using a durable queue or await the send (slower).
      setImmediate(async () => {
        try {
          const emailHTML = generateFeedbackEmailHTML(emailProps)
          const emailText = generateFeedbackEmailText(emailProps)

          await resend.emails.send({
            from: 'UltraCoach Feedback <feedback@ultracoach.app>',
            to: feedbackEmail,
            replyTo: feedback.user_email || undefined,
            subject: `[UltraCoach Feedback] ${feedbackTypeLabel} - ${feedback.title}`,
            html: emailHTML,
            text: emailText,
          })

          logger.info(`Feedback email sent for feedback ID: ${feedback.id}`)
        } catch (emailError) {
          // Log the error but don't fail the request since it's async
          logger.error('Error sending feedback email:', emailError)
          logger.warn(`Feedback ${feedback.id} saved to database but email notification failed`)
        }
      })
    } else {
      logger.debug(
        `Skipping email notification for feedback ${feedback.id} - Resend not configured`
      )
    }

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
