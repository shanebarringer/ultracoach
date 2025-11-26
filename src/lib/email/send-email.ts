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

// Cached Resend client instance for performance
let cachedResendClient: Resend | null = null
let cachedApiKey: string | undefined

/**
 * Get or create Resend client (lazy initialization with caching for serverless compatibility)
 * The client is cached but we validate the API key hasn't changed (for hot-reload scenarios)
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn('RESEND_API_KEY not found - email sending will be disabled')
    cachedResendClient = null
    cachedApiKey = undefined
    return null
  }

  // Return cached client if API key hasn't changed
  if (cachedResendClient && cachedApiKey === apiKey) {
    return cachedResendClient
  }

  // Create new client and cache it
  cachedResendClient = new Resend(apiKey)
  cachedApiKey = apiKey
  return cachedResendClient
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
    // GDPR/CCPA: Don't log email addresses (PII)
    logger.warn('Email sending skipped - Resend not configured', {
      subject: options.subject,
    })

    // In development without Resend, log the email details for testing
    // NOTE: Still avoid logging PII even in dev mode for consistency
    if (process.env.NODE_ENV === 'development') {
      logger.info('📧 Email would be sent (dev mode):', {
        subject: options.subject,
        // Truncate HTML for logging
        htmlPreview: options.html.substring(0, 200) + '...',
      })
      // Return success: false in dev mode to make test failures more visible
      return { success: false, error: 'dev-mode-skipped', messageId: 'dev-mode-skipped' }
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
      // GDPR/CCPA: Don't log email addresses (PII)
      logger.error('Failed to send email', {
        error,
        subject: options.subject,
      })
      return {
        success: false,
        error: error.message || 'Unknown error sending email',
      }
    }

    // GDPR/CCPA: Don't log email addresses (PII)
    logger.info('Email sent successfully', {
      messageId: data?.id,
      subject: options.subject,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    // GDPR/CCPA: Don't log email addresses (PII)
    logger.error('Exception while sending email', {
      error: errorMessage,
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
