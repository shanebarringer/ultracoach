// User settings management atoms
import { atom } from 'jotai'

import { api } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

// Module-level logger for better performance
const logger = createLogger('SettingsAtom')

// Type definitions for user settings
export interface NotificationPreferences extends Record<string, unknown> {
  // In-app notifications
  messages: boolean
  workouts: boolean
  training_plans: boolean
  races: boolean
  reminders: boolean
  system_updates: boolean

  // Email notifications
  email_enabled: boolean
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  email_messages: boolean
  email_workouts: boolean
  email_training_plans: boolean
  email_races: boolean
  email_reminders: boolean
  email_weekly_summary: boolean

  // Push notifications (for future mobile app)
  push_enabled: boolean
  push_messages: boolean
  push_workouts: boolean
  push_reminders: boolean
}

export interface DisplayPreferences extends Record<string, unknown> {
  theme: 'light' | 'dark' | 'system'
  density: 'compact' | 'comfortable' | 'spacious'
  sidebar_collapsed: boolean
  show_tips: boolean
  animations_enabled: boolean
  reduced_motion: boolean
}

export interface UnitPreferences extends Record<string, unknown> {
  distance: 'miles' | 'kilometers'
  elevation: 'feet' | 'meters'
  temperature: 'fahrenheit' | 'celsius'
  pace_format: 'min_per_mile' | 'min_per_km' | 'mph' | 'kmh'
  time_format: '12h' | '24h'
  date_format: 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd'
}

export interface PrivacySettings extends Record<string, unknown> {
  profile_visibility: 'public' | 'coaches_only' | 'private'
  show_activity_stats: boolean
  show_training_calendar: boolean
  allow_coach_invitations: boolean
  allow_runner_connections: boolean
  show_location: boolean
  show_age: boolean
  data_sharing_analytics: boolean
}

export interface CommunicationSettings extends Record<string, unknown> {
  auto_responses_enabled: boolean
  auto_response_message: string
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  weekend_quiet_mode: boolean
  message_sound_enabled: boolean
  typing_indicators_enabled: boolean
}

export interface TrainingPreferences extends Record<string, unknown> {
  default_workout_view: 'calendar' | 'list' | 'timeline'
  show_completed_workouts: boolean
  auto_sync_devices: boolean
  preferred_training_times: string[]
  rest_day_preferences: string[]
  workout_reminder_time: number // minutes before workout
  show_weather_info: boolean
  track_heart_rate: boolean
  track_cadence: boolean
  track_power: boolean
}

export interface UserSettings {
  id: string
  user_id: string
  notification_preferences: NotificationPreferences
  display_preferences: DisplayPreferences
  unit_preferences: UnitPreferences
  privacy_settings: PrivacySettings
  communication_settings: CommunicationSettings
  training_preferences: TrainingPreferences
  created_at: string
  updated_at: string
}

// Core user settings atoms
export const userSettingsAtom = atom<UserSettings | null>(null)
export const userSettingsErrorAtom = atom<string | null>(null)

// Async user settings fetching atom with refresh trigger
export const userSettingsRefreshTriggerAtom = atom(0)

export const asyncUserSettingsAtom = atom(
  async get => {
    get(userSettingsRefreshTriggerAtom) // Subscribe to refresh trigger

    try {
      logger.debug('Fetching user settings...')
      const response = await api.get<{ success: boolean; settings: UserSettings; error?: string }>(
        '/api/settings',
        {
          suppressGlobalToast: true, // Atom handles its own error handling
        }
      )

      if (!response.data.success) {
        const errorMessage = response.data.error || 'Failed to fetch user settings'
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      logger.info('User settings fetched successfully')
      return response.data.settings
    } catch (error) {
      // Re-throw to let Suspense boundary handle it
      logger.error('Error fetching user settings:', error)
      throw error
    }
  },
  (_, set, newValue: UserSettings) => {
    set(userSettingsAtom, newValue)
    set(userSettingsErrorAtom, null) // Clear any existing errors when data is set
  }
)

// Refresh action atom
export const refreshUserSettingsAtom = atom(null, (get, set) => {
  set(userSettingsRefreshTriggerAtom, get(userSettingsRefreshTriggerAtom) + 1)
})

// Update settings atom (PUT request for full settings update)
export const updateUserSettingsAtom = atom(
  null,
  async (get, set, settingsUpdate: Partial<UserSettings>) => {
    try {
      logger.debug('Updating user settings...')
      const response = await api.put<{ success: boolean; settings: UserSettings; error?: string }>(
        '/api/settings',
        settingsUpdate,
        {
          suppressGlobalToast: true, // Atom handles its own toast notifications
        }
      )

      if (!response.data.success) {
        const errorMessage = response.data.error || 'Failed to update user settings'
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      // Update the cached settings
      set(userSettingsAtom, response.data.settings)
      set(userSettingsErrorAtom, null)

      logger.info('User settings updated successfully')
      toast.success('✅ Settings Updated', 'Your preferences have been saved.')

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      logger.error('Error updating user settings:', error)
      set(userSettingsErrorAtom, message)
      toast.error('❌ Update Failed', 'Failed to save your settings. Please try again.')

      return false
    }
  }
)

// Update settings section atom (PATCH request for specific section update)
export const updateUserSettingsSectionAtom = atom(
  null,
  async (get, set, payload: { section: keyof UserSettings; settings: Record<string, unknown> }) => {
    const { section, settings } = payload

    try {
      logger.debug(`Updating user settings section: ${section}...`)
      const response = await api.patch<{
        success: boolean
        settings: UserSettings
        error?: string
      }>(
        '/api/settings',
        { section, settings },
        {
          suppressGlobalToast: true, // Atom handles its own toast notifications
        }
      )

      if (!response.data.success) {
        const errorMessage = response.data.error || `Failed to update ${section}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      // Update the cached settings
      set(userSettingsAtom, response.data.settings)
      set(userSettingsErrorAtom, null)

      logger.info(`User settings section ${section} updated successfully`)
      toast.success('✅ Settings Updated', 'Your preferences have been saved.')

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      logger.error(`Error updating user settings section ${section}:`, error)
      set(userSettingsErrorAtom, message)
      toast.error('❌ Update Failed', `Failed to save ${section}. Please try again.`)

      return false
    }
  }
)

// Jotai Devtools debug labels
userSettingsAtom.debugLabel = 'settings/user'
userSettingsErrorAtom.debugLabel = 'settings/error'
userSettingsRefreshTriggerAtom.debugLabel = 'settings/refreshTrigger'
asyncUserSettingsAtom.debugLabel = 'settings/async'
refreshUserSettingsAtom.debugLabel = 'settings/refreshAction'
updateUserSettingsAtom.debugLabel = 'settings/updateAction'
updateUserSettingsSectionAtom.debugLabel = 'settings/updateSectionAction'
