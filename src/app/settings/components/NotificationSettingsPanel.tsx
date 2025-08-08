'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Divider,
  Select,
  SelectItem,
  Switch,
} from '@heroui/react'
import { BellIcon, MailIcon, SmartphoneIcon } from 'lucide-react'

import { useState } from 'react'

import { useUserSettings, UserSettings } from '@/hooks/useUserSettings'

interface NotificationSettingsPanelProps {
  settings: UserSettings | null
}

export default function NotificationSettingsPanel({ settings }: NotificationSettingsPanelProps) {
  const { updateSettingsSection } = useUserSettings()
  const [saving, setSaving] = useState(false)

  const notificationPrefs = settings?.notification_preferences || {
    // In-app notifications
    messages: true,
    workouts: true,
    training_plans: true,
    races: true,
    reminders: true,
    system_updates: true,
    
    // Email notifications  
    email_enabled: false,
    email_frequency: 'daily',
    email_messages: false,
    email_workouts: false,
    email_training_plans: false,
    email_races: false,
    email_reminders: false,
    email_weekly_summary: false,
    
    // Push notifications (for future mobile app)
    push_enabled: false,
    push_messages: false,
    push_workouts: false,
    push_reminders: false,
  }

  const [localSettings, setLocalSettings] = useState(notificationPrefs)

  const handleSave = async () => {
    setSaving(true)
    await updateSettingsSection('notification_preferences', localSettings)
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(notificationPrefs)

  return (
    <div className="space-y-6">
      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">In-App Notifications</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              isSelected={localSettings.messages}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, messages: value }))
              }
            >
              <div>
                <p className="font-medium">New Messages</p>
                <p className="text-sm text-foreground-500">
                  Get notified when coaches or runners send you messages
                </p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.workouts}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, workouts: value }))
              }
            >
              <div>
                <p className="font-medium">Workout Updates</p>
                <p className="text-sm text-foreground-500">
                  Notifications about workout changes and assignments
                </p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.training_plans}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, training_plans: value }))
              }
            >
              <div>
                <p className="font-medium">Training Plans</p>
                <p className="text-sm text-foreground-500">
                  Updates about your training plan progress
                </p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.races}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, races: value }))
              }
            >
              <div>
                <p className="font-medium">Race Events</p>
                <p className="text-sm text-foreground-500">
                  Reminders about upcoming races and events
                </p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.reminders}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, reminders: value }))
              }
            >
              <div>
                <p className="font-medium">Workout Reminders</p>
                <p className="text-sm text-foreground-500">
                  Reminders about scheduled workouts
                </p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.system_updates}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, system_updates: value }))
              }
            >
              <div>
                <p className="font-medium">System Updates</p>
                <p className="text-sm text-foreground-500">
                  Important announcements and feature updates
                </p>
              </div>
            </Switch>
          </div>
        </CardBody>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MailIcon className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Email Notifications</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Switch
            isSelected={localSettings.email_enabled}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, email_enabled: value }))
            }
          >
            <div>
              <p className="font-medium">Enable Email Notifications</p>
              <p className="text-sm text-foreground-500">
                Receive notifications via email when you&apos;re not active on the app
              </p>
            </div>
          </Switch>

          {localSettings.email_enabled && (
            <>
              <Select
                label="Email Frequency"
                selectedKeys={[localSettings.email_frequency]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string
                  setLocalSettings(prev => ({ ...prev, email_frequency: value as 'immediate' | 'daily' | 'weekly' | 'never' }))
                }}
                description="How often you want to receive email digests"
              >
                <SelectItem key="immediate">Immediate</SelectItem>
                <SelectItem key="daily">Daily digest</SelectItem>
                <SelectItem key="weekly">Weekly summary</SelectItem>
                <SelectItem key="never">Never</SelectItem>
              </Select>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground-700">
                  What to include in email notifications:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Checkbox
                    isSelected={localSettings.email_messages}
                    onValueChange={(value) => 
                      setLocalSettings(prev => ({ ...prev, email_messages: value }))
                    }
                  >
                    New Messages
                  </Checkbox>

                  <Checkbox
                    isSelected={localSettings.email_workouts}
                    onValueChange={(value) => 
                      setLocalSettings(prev => ({ ...prev, email_workouts: value }))
                    }
                  >
                    Workout Updates
                  </Checkbox>

                  <Checkbox
                    isSelected={localSettings.email_training_plans}
                    onValueChange={(value) => 
                      setLocalSettings(prev => ({ ...prev, email_training_plans: value }))
                    }
                  >
                    Training Plans
                  </Checkbox>

                  <Checkbox
                    isSelected={localSettings.email_races}
                    onValueChange={(value) => 
                      setLocalSettings(prev => ({ ...prev, email_races: value }))
                    }
                  >
                    Race Events
                  </Checkbox>

                  <Checkbox
                    isSelected={localSettings.email_reminders}
                    onValueChange={(value) => 
                      setLocalSettings(prev => ({ ...prev, email_reminders: value }))
                    }
                  >
                    Workout Reminders
                  </Checkbox>

                  <Checkbox
                    isSelected={localSettings.email_weekly_summary}
                    onValueChange={(value) => 
                      setLocalSettings(prev => ({ ...prev, email_weekly_summary: value }))
                    }
                  >
                    Weekly Summary
                  </Checkbox>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Push Notifications (Future Mobile App) */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SmartphoneIcon className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Push Notifications</h3>
            <span className="text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded">
              Coming Soon
            </span>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p className="text-foreground-500 text-sm">
            Push notifications will be available when the UltraCoach mobile app launches.
            Configure your preferences here for when that happens.
          </p>
        </CardBody>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
          >
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}