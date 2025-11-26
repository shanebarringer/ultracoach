/**
 * Email sending utility using Resend
 *
 * NOTE: Resend client is initialized lazily inside functions to ensure
 * environment variables are read at request time (not module load time).
 * This is critical for serverless environments like Vercel where modules
 * can be cached with stale environment values.
 */
import { Resend } from 'resend'

import { createLogger } from '../logger'

const logger = createLogger('email-service')

/**
 * Get or create Resend client (lazy initialization for serverless compatibility)
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn('RESEND_API_KEY not found - email sending will be disabled')
    return null
  }
  return new Resend(apiKey)
}

/**
 * Get the from address (read at request time for serverless compatibility)
 */
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'UltraCoach <onboarding@resend.dev>'
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // Lazy initialization for serverless compatibility
  const resend = getResendClient()
  const fromEmail = getFromEmail()

  if (!resend) {
    logger.warn('Email sending skipped - Resend not configured', {
      to: options.to,
      subject: options.subject,
    })

    // In development without Resend, log the email details for testing
    if (process.env.NODE_ENV === 'development') {
      logger.info('📧 Email would be sent (dev mode):', {
        to: options.to,
        subject: options.subject,
        // Truncate HTML for logging
        htmlPreview: options.html.substring(0, 200) + '...',
      })
      return { success: true, messageId: 'dev-mode-skipped' }
    }

    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    })

    if (error) {
      logger.error('Failed to send email', {
        error,
        to: options.to,
        subject: options.subject,
      })
      return {
        success: false,
        error: error.message || 'Unknown error sending email',
      }
    }

    logger.info('Email sent successfully', {
      messageId: data?.id,
      to: options.to,
      subject: options.subject,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Exception while sending email', {
      error: errorMessage,
      to: options.to,
      subject: options.subject,
    })
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Check if email service is available
 */
export function isEmailServiceAvailable(): boolean {
  return !!process.env.RESEND_API_KEY
}
