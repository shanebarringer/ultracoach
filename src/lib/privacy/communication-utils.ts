/**
 * Communication Utilities
 *
 * Helper functions for managing communication preferences:
 * - Quiet hours enforcement
 * - Auto-response handling
 * - Message delivery timing
 */
import type { CommunicationSettings } from '@/lib/atoms/settings'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CommunicationUtils')

export interface QuietHoursResult {
  inQuietHours: boolean
  reason?: string
  resumesAt?: Date
}

/**
 * Check if current time is within user's quiet hours
 */
export function isInQuietHours(
  settings: CommunicationSettings | null | undefined
): QuietHoursResult {
  if (!settings?.quiet_hours_enabled) {
    return { inQuietHours: false }
  }

  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
  const currentTime = now.getHours() * 60 + now.getMinutes()

  // Check weekend quiet mode
  if (settings.weekend_quiet_mode && (currentDay === 0 || currentDay === 6)) {
    // Calculate when quiet hours end (Monday 00:00)
    const resumesAt = new Date(now)
    const daysUntilMonday = currentDay === 0 ? 1 : 2
    resumesAt.setDate(now.getDate() + daysUntilMonday)
    resumesAt.setHours(0, 0, 0, 0)

    return {
      inQuietHours: true,
      reason: 'Weekend quiet mode active',
      resumesAt,
    }
  }

  // Parse quiet hours times
  try {
    const [startHour, startMin] = settings.quiet_hours_start.split(':').map(Number)
    const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number)

    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    const isInRange =
      endTime > startTime
        ? currentTime >= startTime && currentTime < endTime
        : currentTime >= startTime || currentTime < endTime

    if (isInRange) {
      // Calculate when quiet hours end
      const resumesAt = new Date(now)
      resumesAt.setHours(endHour, endMin, 0, 0)

      // If end time is tomorrow (overnight quiet hours)
      if (endTime < startTime && currentTime >= startTime) {
        resumesAt.setDate(resumesAt.getDate() + 1)
      }

      return {
        inQuietHours: true,
        reason: `Quiet hours: ${settings.quiet_hours_start} - ${settings.quiet_hours_end}`,
        resumesAt,
      }
    }

    return { inQuietHours: false }
  } catch (error) {
    logger.error('Error parsing quiet hours:', error)
    return { inQuietHours: false }
  }
}

/**
 * Get auto-response message if enabled
 */
export function getAutoResponseMessage(
  settings: CommunicationSettings | null | undefined
): string | null {
  if (!settings?.auto_responses_enabled) {
    return null
  }

  const quietHours = isInQuietHours(settings)

  if (quietHours.inQuietHours && settings.auto_response_message) {
    return settings.auto_response_message
  }

  return null
}

/**
 * Check if user has typing indicators enabled
 */
export function hasTypingIndicatorsEnabled(
  settings: CommunicationSettings | null | undefined
): boolean {
  return settings?.typing_indicators_enabled ?? true
}

/**
 * Check if user has message sounds enabled
 */
export function hasMessageSoundsEnabled(
  settings: CommunicationSettings | null | undefined
): boolean {
  return settings?.message_sound_enabled ?? true
}

/**
 * Determine if a notification should be delayed due to quiet hours
 */
export function shouldDelayNotification(settings: CommunicationSettings | null | undefined): {
  shouldDelay: boolean
  deliverAt?: Date
  reason?: string
} {
  const quietHours = isInQuietHours(settings)

  if (!quietHours.inQuietHours) {
    return { shouldDelay: false }
  }

  return {
    shouldDelay: true,
    deliverAt: quietHours.resumesAt,
    reason: quietHours.reason,
  }
}

/**
 * Format quiet hours for display
 */
export function formatQuietHours(
  settings: CommunicationSettings | null | undefined
): string | null {
  if (!settings?.quiet_hours_enabled) {
    return null
  }

  if (settings.weekend_quiet_mode) {
    return 'Weekends + ' + `${settings.quiet_hours_start} - ${settings.quiet_hours_end} daily`
  }

  return `${settings.quiet_hours_start} - ${settings.quiet_hours_end}`
}
