import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import {
  type FeedbackEmailProps,
  feedbackTypeLabels,
  generateFeedbackEmailHTML,
  generateFeedbackEmailText,
} from '@/lib/email/feedback-template'
import { createLogger } from '@/lib/logger'
import { addRateLimitHeaders, feedbackLimiter, formatRetryAfter } from '@/lib/redis-rate-limiter'
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

// Transform empty strings to undefined to prevent persisting '' in database
const emptyStringToUndefined = z
  .literal('')
  .transform(() => undefined)
  .optional()

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
  title: z
    .string()
    .min(1, { message: 'Title is required' })
    .max(200, { message: 'Title must be 200 characters or less' }),
  description: z
    .string()
    .min(1, { message: 'Description is required' })
    .max(5000, { message: 'Description must be 5000 characters or less' }),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  user_email: z.union([
    z.string().email({ message: 'Invalid email format' }),
    emptyStringToUndefined,
  ]),
  browser_info: z
    .object({
      userAgent: z.string().optional(),
      screenWidth: z.number().optional(),
      screenHeight: z.number().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  page_url: z.union([z.string().url('Invalid URL format'), emptyStringToUndefined]),
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

    // Apply rate limiting to prevent feedback spam
    const rateLimitResult = await feedbackLimiter.check(session.user.id)
    if (!rateLimitResult.allowed) {
      const retryDisplay = formatRetryAfter(rateLimitResult.retryAfter)
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: `Too many feedback submissions. Please try again in ${retryDisplay}.`,
          retryAfter: rateLimitResult.retryAfter, // Always in seconds for API consistency
        },
        { status: 429 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Parse JSON with explicit error handling
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch (parseError) {
      logger.warn('Invalid JSON payload received:', parseError)
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

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

    // Prepare email props (type-safe with FeedbackEmailProps interface)
    const emailProps: FeedbackEmailProps = {
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

      // Sanitize title to prevent header injection (strip CR/LF)
      const sanitizedTitle = feedback.title.replace(/[\r\n]/g, ' ')

      // Use setImmediate to defer email sending until after response is sent
      // NOTE: On serverless/edge runtimes, setImmediate work may not complete if the
      // process freezes after response. This is acceptable for best-effort email delivery.
      // For guaranteed delivery, consider using a durable queue or await the send (slower).
      setImmediate(async () => {
        try {
          const emailHTML = generateFeedbackEmailHTML(emailProps)
          const emailText = generateFeedbackEmailText(emailProps)

          await resend.emails.send({
            from: 'UltraCoach Feedback <feedback@ultracoach.dev>',
            to: feedbackEmail,
            replyTo: feedback.user_email || undefined,
            subject: `[UltraCoach Feedback] ${feedbackTypeLabel} - ${sanitizedTitle}`,
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

    const response = NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        title: feedback.title,
        status: feedback.status,
        created_at: feedback.created_at,
      },
    })
    return addRateLimitHeaders(response, rateLimitResult)
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
