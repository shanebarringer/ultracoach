'use client'

import { Button, Card, CardBody, CardHeader, Switch } from '@heroui/react'
import { BellIcon, MailIcon, MessageSquareIcon, SaveIcon } from 'lucide-react'

import { useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('NotificationPreferences')

interface NotificationPrefs {
  messages: boolean
  workouts: boolean
  training_plans: boolean
  races: boolean
  reminders: boolean
  toast_notifications: boolean
  email_notifications: boolean
}

const defaultPreferences: NotificationPrefs = {
  messages: true,
  workouts: true,
  training_plans: true,
  races: true,
  reminders: true,
  toast_notifications: true,
  email_notifications: false,
}

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPrefs>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/notification-preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      } else {
        logger.error('Failed to fetch notification preferences')
      }
    } catch (error) {
      logger.error('Error fetching notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      })

      if (response.ok) {
        toast.success(
          '✅ Preferences Saved',
          'Your notification preferences have been updated.'
        )
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      logger.error('Error saving notification preferences:', error)
      toast.error(
        '❌ Save Failed',
        'Failed to save notification preferences. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPrefs, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return <div className="animate-pulse">Loading preferences...</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <BellIcon className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Notification Preferences</h3>
          <p className="text-sm text-foreground-600">
            Choose which notifications you&apos;d like to receive
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* In-App Notifications */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <MessageSquareIcon className="w-4 h-4" />
            In-App Notifications
          </h4>
          
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Messages</label>
                <p className="text-xs text-foreground-600">
                  Coach and runner messages
                </p>
              </div>
              <Switch
                isSelected={preferences.messages}
                onValueChange={value => handlePreferenceChange('messages', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Workouts</label>
                <p className="text-xs text-foreground-600">
                  Workout updates and reminders
                </p>
              </div>
              <Switch
                isSelected={preferences.workouts}
                onValueChange={value => handlePreferenceChange('workouts', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Training Plans</label>
                <p className="text-xs text-foreground-600">
                  Plan updates and changes
                </p>
              </div>
              <Switch
                isSelected={preferences.training_plans}
                onValueChange={value => handlePreferenceChange('training_plans', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Races</label>
                <p className="text-xs text-foreground-600">
                  Race registrations and updates
                </p>
              </div>
              <Switch
                isSelected={preferences.races}
                onValueChange={value => handlePreferenceChange('races', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Reminders</label>
                <p className="text-xs text-foreground-600">
                  Training reminders and deadlines
                </p>
              </div>
              <Switch
                isSelected={preferences.reminders}
                onValueChange={value => handlePreferenceChange('reminders', value)}
              />
            </div>
          </div>
        </div>

        {/* Toast Notifications */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <BellIcon className="w-4 h-4" />
            Toast Notifications
          </h4>
          
          <div className="flex items-center justify-between pl-6">
            <div>
              <label className="text-sm font-medium">Show Toast Notifications</label>
              <p className="text-xs text-foreground-600">
                Show popup notifications for real-time updates
              </p>
            </div>
            <Switch
              isSelected={preferences.toast_notifications}
              onValueChange={value => handlePreferenceChange('toast_notifications', value)}
            />
          </div>
        </div>

        {/* Email Notifications */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <MailIcon className="w-4 h-4" />
            Email Notifications
          </h4>
          
          <div className="flex items-center justify-between pl-6">
            <div>
              <label className="text-sm font-medium">Email Notifications</label>
              <p className="text-xs text-foreground-600">
                Receive important updates via email
              </p>
            </div>
            <Switch
              isSelected={preferences.email_notifications}
              onValueChange={value => handlePreferenceChange('email_notifications', value)}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            color="primary"
            onPress={savePreferences}
            isLoading={saving}
            startContent={!saving && <SaveIcon className="w-4 h-4" />}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}