/**
 * Notification Manager
 *
 * Centralized notification system that respects user preferences.
 * Filters notifications based on user settings before displaying them.
 */
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('NotificationManager')

export type NotificationType =
  | 'messages'
  | 'workouts'
  | 'training_plans'
  | 'races'
  | 'reminders'
  | 'system_updates'

export interface NotificationPreferences {
  messages: boolean
  workouts: boolean
  training_plans: boolean
  races: boolean
  reminders: boolean
  system_updates: boolean
}

export class NotificationManager {
  /**
   * Check if a notification type should be shown based on user preferences
   */
  static async shouldShow(type: NotificationType): Promise<boolean> {
    try {
      // Fetch current user settings
      const response = await fetch('/api/settings', {
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        // If we can't fetch settings, default to showing notifications
        logger.warn(`Failed to fetch settings for notification check: ${response.status}`)
        return true
      }

      const data = await response.json()

      if (!data.success || !data.settings?.notification_preferences) {
        logger.warn('Settings response missing notification preferences')
        return true
      }

      const preferences = data.settings.notification_preferences as NotificationPreferences
      const shouldShow = preferences[type] ?? true

      logger.debug(`Notification check for type "${type}": ${shouldShow ? 'allowed' : 'blocked'}`)

      return shouldShow
    } catch (error) {
      logger.error('Error checking notification preferences:', error)
      // Default to showing notifications on error
      return true
    }
  }

  /**
   * Show a success toast if the notification type is enabled
   */
  static async showSuccess(type: NotificationType, title: string, message: string): Promise<void> {
    if (await this.shouldShow(type)) {
      toast.success(title, message)
      logger.info(`Showed success notification: ${type} - ${title}`)
    } else {
      logger.debug(`Notification blocked by preferences: ${type} - ${title}`)
    }
  }

  /**
   * Show an info toast if the notification type is enabled
   */
  static async showInfo(type: NotificationType, title: string, message: string): Promise<void> {
    if (await this.shouldShow(type)) {
      toast.info(title, message)
      logger.info(`Showed info notification: ${type} - ${title}`)
    } else {
      logger.debug(`Notification blocked by preferences: ${type} - ${title}`)
    }
  }

  /**
   * Show a warning toast if the notification type is enabled
   */
  static async showWarning(type: NotificationType, title: string, message: string): Promise<void> {
    if (await this.shouldShow(type)) {
      toast.warning(title, message)
      logger.info(`Showed warning notification: ${type} - ${title}`)
    } else {
      logger.debug(`Notification blocked by preferences: ${type} - ${title}`)
    }
  }

  /**
   * Show an error toast (always shown, errors are critical)
   */
  static showError(title: string, message: string): void {
    toast.error(title, message)
    logger.info(`Showed error notification: ${title}`)
  }

  /**
   * Synchronous version for components that have preferences loaded
   */
  static shouldShowSync(
    type: NotificationType,
    preferences: NotificationPreferences | null | undefined
  ): boolean {
    if (!preferences) {
      return true // Default to showing if no preferences available
    }

    return preferences[type] ?? true
  }

  /**
   * Show success toast with preferences already loaded (synchronous)
   */
  static showSuccessSync(
    type: NotificationType,
    title: string,
    message: string,
    preferences: NotificationPreferences | null | undefined
  ): void {
    if (this.shouldShowSync(type, preferences)) {
      toast.success(title, message)
      logger.info(`Showed success notification: ${type} - ${title}`)
    } else {
      logger.debug(`Notification blocked by preferences: ${type} - ${title}`)
    }
  }

  /**
   * Show info toast with preferences already loaded (synchronous)
   */
  static showInfoSync(
    type: NotificationType,
    title: string,
    message: string,
    preferences: NotificationPreferences | null | undefined
  ): void {
    if (this.shouldShowSync(type, preferences)) {
      toast.info(title, message)
      logger.info(`Showed info notification: ${type} - ${title}`)
    } else {
      logger.debug(`Notification blocked by preferences: ${type} - ${title}`)
    }
  }
}
