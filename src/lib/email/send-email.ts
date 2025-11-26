/**
 * Email sending utility using Resend
 */
import { Resend } from 'resend'

import { createLogger } from '../logger'

const logger = createLogger('email-service')

// Initialize Resend client
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
  logger.info('Resend email service initialized')
} else {
  logger.warn('RESEND_API_KEY not found - email sending will be disabled')
}

// Get the from address
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'UltraCoach <onboarding@resend.dev>'

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
      from: FROM_EMAIL,
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
  return resend !== null
}
