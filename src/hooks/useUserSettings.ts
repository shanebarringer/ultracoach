'use client'

import { useCallback, useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('useUserSettings')

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

interface UseUserSettingsReturn {
  settings: UserSettings | null
  loading: boolean
  error: string | null
  updateSettings: (settingsUpdate: Partial<UserSettings>) => Promise<boolean>
  updateSettingsSection: (section: keyof UserSettings, sectionSettings: Record<string, unknown>) => Promise<boolean>
  refreshSettings: () => Promise<void>
}

export function useUserSettings(): UseUserSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/settings')
      
      if (!response.ok) {
        throw new Error('Failed to fetch user settings')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user settings')
      }
      
      setSettings(data.settings)
      logger.info('User settings fetched successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      logger.error('Error fetching user settings:', err)
      setError(message)
      toast.error('❌ Settings Error', 'Failed to load your settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (settingsUpdate: Partial<UserSettings>): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsUpdate),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update user settings')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update user settings')
      }
      
      setSettings(data.settings)
      logger.info('User settings updated successfully')
      toast.success('✅ Settings Updated', 'Your preferences have been saved.')
      
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      logger.error('Error updating user settings:', err)
      setError(message)
      toast.error('❌ Update Failed', 'Failed to save your settings. Please try again.')
      
      return false
    }
  }, [])

  const updateSettingsSection = useCallback(async (
    section: keyof UserSettings, 
    sectionSettings: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          settings: sectionSettings,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update ${section}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || `Failed to update ${section}`)
      }
      
      setSettings(data.settings)
      logger.info(`User settings section ${section} updated successfully`)
      toast.success('✅ Settings Updated', 'Your preferences have been saved.')
      
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      logger.error(`Error updating user settings section ${section}:`, err)
      setError(message)
      toast.error('❌ Update Failed', `Failed to save ${section}. Please try again.`)
      
      return false
    }
  }, [])

  const refreshSettings = useCallback(async () => {
    await fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    updateSettings,
    updateSettingsSection,
    refreshSettings,
  }
}