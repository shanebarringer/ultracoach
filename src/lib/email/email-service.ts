/**
 * Email Service
 *
 * Centralized email sending and queue management.
 * Handles template rendering, queue processing, and delivery.
 */
import { render } from '@react-email/render'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { email_queue } from '@/lib/schema'

import { EMAIL_CONFIG, EMAIL_TEMPLATES, type EmailTemplate, getResendClient } from './resend-client'
import {
  DailyDigestTemplate,
  MessageReceivedTemplate,
  WeeklySummaryTemplate,
  WorkoutAssignedTemplate,
} from './templates'

const logger = createLogger('EmailService')

/**
 * Queue an email for delivery
 */
export async function queueEmail({
  userId,
  recipientEmail,
  subject,
  templateId,
  templateData,
  priority = 5,
  scheduledFor,
}: {
  userId: string
  recipientEmail: string
  subject: string
  templateId: EmailTemplate
  templateData: Record<string, unknown>
  priority?: number
  scheduledFor?: Date
}) {
  try {
    const [queuedEmail] = await db
      .insert(email_queue)
      .values({
        user_id: userId,
        recipient_email: recipientEmail,
        subject,
        template_id: templateId,
        template_data: templateData,
        priority,
        scheduled_for: scheduledFor,
        status: 'pending',
      })
      .returning()

    logger.info('Email queued successfully', {
      emailId: queuedEmail.id,
      templateId,
      recipientEmail,
    })

    return queuedEmail
  } catch (error) {
    logger.error('Failed to queue email:', error)
    throw error
  }
}

/**
 * Send a queued email immediately
 */
export async function sendQueuedEmail(emailId: string) {
  try {
    // Fetch email from queue
    const [queuedEmail] = await db.select().from(email_queue).where(eq(email_queue.id, emailId))

    if (!queuedEmail) {
      logger.warn('Queued email not found', { emailId })
      return false
    }

    if (queuedEmail.status !== 'pending') {
      logger.warn('Email already processed', { emailId, status: queuedEmail.status })
      return false
    }

    // Update status to sending
    await db
      .update(email_queue)
      .set({ status: 'sending', updated_at: new Date() })
      .where(eq(email_queue.id, emailId))

    // Render email template
    const html = await renderEmailTemplate(
      queuedEmail.template_id as EmailTemplate,
      queuedEmail.template_data as Record<string, unknown>
    )

    // Send via Resend
    const resend = getResendClient()
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [queuedEmail.recipient_email],
      subject: queuedEmail.subject,
      html,
    })

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`)
    }

    // Update status to sent
    await db
      .update(email_queue)
      .set({
        status: 'sent',
        sent_at: new Date(),
        resend_email_id: result.data?.id,
        updated_at: new Date(),
      })
      .where(eq(email_queue.id, emailId))

    logger.info('Email sent successfully', { emailId, resendId: result.data?.id })
    return true
  } catch (error) {
    logger.error('Failed to send email:', error)

    // Update status to failed and increment retry count
    const [queuedEmail] = await db.select().from(email_queue).where(eq(email_queue.id, emailId))

    if (queuedEmail) {
      const newRetryCount = queuedEmail.retry_count + 1
      const shouldRetry = newRetryCount < queuedEmail.max_retries

      await db
        .update(email_queue)
        .set({
          status: shouldRetry ? 'pending' : 'failed',
          retry_count: newRetryCount,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date(),
        })
        .where(eq(email_queue.id, emailId))
    }

    return false
  }
}

/**
 * Process pending emails from the queue
 */
export async function processEmailQueue(limit = 10) {
  try {
    const now = new Date()

    // Fetch pending emails (either no scheduled_for or scheduled_for <= now)
    const pendingEmails = await db.query.email_queue.findMany({
      where: (email_queue, { eq, or, and, lte, isNull }) =>
        and(
          eq(email_queue.status, 'pending'),
          or(isNull(email_queue.scheduled_for), lte(email_queue.scheduled_for, now))
        ),
      orderBy: (email_queue, { asc, desc }) => [
        desc(email_queue.priority),
        asc(email_queue.created_at),
      ],
      limit,
    })

    logger.info(`Processing ${pendingEmails.length} pending emails`)

    const results = await Promise.allSettled(pendingEmails.map(email => sendQueuedEmail(email.id)))

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length
    const failureCount = results.length - successCount

    logger.info('Email queue processed', { successCount, failureCount })

    return { successCount, failureCount, totalProcessed: results.length }
  } catch (error) {
    logger.error('Error processing email queue:', error)
    throw error
  }
}

/**
 * Render email template to HTML
 */
async function renderEmailTemplate(
  templateId: EmailTemplate,
  data: Record<string, unknown>
): Promise<string> {
  try {
    let templateComponent: React.ReactElement

    switch (templateId) {
      case EMAIL_TEMPLATES.MESSAGE_RECEIVED:
        templateComponent = MessageReceivedTemplate(
          data as Parameters<typeof MessageReceivedTemplate>[0]
        )
        break

      case EMAIL_TEMPLATES.WORKOUT_ASSIGNED:
        templateComponent = WorkoutAssignedTemplate(
          data as Parameters<typeof WorkoutAssignedTemplate>[0]
        )
        break

      case EMAIL_TEMPLATES.DAILY_DIGEST:
        templateComponent = DailyDigestTemplate(data as Parameters<typeof DailyDigestTemplate>[0])
        break

      case EMAIL_TEMPLATES.WEEKLY_SUMMARY:
        templateComponent = WeeklySummaryTemplate(
          data as Parameters<typeof WeeklySummaryTemplate>[0]
        )
        break

      default:
        throw new Error(`Unknown email template: ${templateId}`)
    }

    return await render(templateComponent)
  } catch (error) {
    logger.error('Failed to render email template:', error)
    throw new Error(`Template rendering failed for ${templateId}`)
  }
}

/**
 * Send email immediately (bypasses queue for urgent emails)
 */
export async function sendImmediateEmail({
  to,
  subject,
  templateId,
  templateData,
}: {
  to: string
  subject: string
  templateId: EmailTemplate
  templateData: Record<string, unknown>
}) {
  try {
    const html = await renderEmailTemplate(templateId, templateData)

    const resend = getResendClient()
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      subject,
      html,
    })

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`)
    }

    logger.info('Immediate email sent', { to, subject, resendId: result.data?.id })
    return result.data?.id
  } catch (error) {
    logger.error('Failed to send immediate email:', error)
    throw error
  }
}
