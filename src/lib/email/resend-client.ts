/**
 * Resend Email Client
 *
 * Centralized Resend client configuration for sending emails.
 * Handles initialization, error handling, and provides a typed interface.
 */
import { Resend } from 'resend'

import { createLogger } from '@/lib/logger'

const logger = createLogger('ResendClient')

// Initialize Resend client
let resendClient: Resend | null = null

/**
 * Get or create Resend client instance
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      logger.error('RESEND_API_KEY not found in environment variables')
      throw new Error('Email service not configured - RESEND_API_KEY missing')
    }

    resendClient = new Resend(apiKey)
    logger.info('Resend client initialized')
  }

  return resendClient
}

/**
 * Email sender configuration
 */
export const EMAIL_CONFIG = {
  // Default sender (update with your verified domain when DNS is ready)
  from: process.env.RESEND_FROM_EMAIL || 'UltraCoach <onboarding@resend.dev>',

  // Reply-to address
  replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'support@ultracoach.app',

  // Support email
  supportEmail: process.env.SUPPORT_EMAIL || 'support@ultracoach.app',

  // Feedback email
  feedbackEmail: process.env.FEEDBACK_EMAIL || 'feedback@ultracoach.app',
} as const

/**
 * Email template IDs
 */
export const EMAIL_TEMPLATES = {
  // Transactional
  MESSAGE_RECEIVED: 'message_received',
  WORKOUT_ASSIGNED: 'workout_assigned',
  WORKOUT_COMPLETED: 'workout_completed',
  TRAINING_PLAN_ASSIGNED: 'training_plan_assigned',
  COACH_INVITATION: 'coach_invitation',
  RUNNER_INVITATION: 'runner_invitation',

  // Digests
  DAILY_DIGEST: 'daily_digest',
  WEEKLY_SUMMARY: 'weekly_summary',

  // System
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
} as const

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES]
