'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Switch,
} from '@heroui/react'
import { MessageSquareIcon, BellOffIcon, VolumeXIcon } from 'lucide-react'

import { useState } from 'react'

import { useUserSettings, UserSettings } from '@/hooks/useUserSettings'

interface CommunicationSettingsPanelProps {
  settings: UserSettings | null
}

export default function CommunicationSettingsPanel({ settings }: CommunicationSettingsPanelProps) {
  const { updateSettingsSection } = useUserSettings()
  const [saving, setSaving] = useState(false)

  const communicationSettings = settings?.communication_settings || {
    auto_responses_enabled: false,
    auto_response_message: '',
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    weekend_quiet_mode: false,
    message_sound_enabled: true,
    typing_indicators_enabled: true,
  }

  const [localSettings, setLocalSettings] = useState(communicationSettings)

  const handleSave = async () => {
    setSaving(true)
    await updateSettingsSection('communication_settings', localSettings)
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(communicationSettings)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquareIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Message Settings</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              isSelected={localSettings.message_sound_enabled}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, message_sound_enabled: value }))
              }
            >
              <div>
                <p className="font-medium">Message Sounds</p>
                <p className="text-sm text-foreground-500">Play sound when you receive messages</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.typing_indicators_enabled}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, typing_indicators_enabled: value }))
              }
            >
              <div>
                <p className="font-medium">Typing Indicators</p>
                <p className="text-sm text-foreground-500">Show when someone is typing</p>
              </div>
            </Switch>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellOffIcon className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Quiet Hours</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Switch
            isSelected={localSettings.quiet_hours_enabled}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, quiet_hours_enabled: value }))
            }
          >
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-sm text-foreground-500">
                Disable notifications during specified hours
              </p>
            </div>
          </Switch>

          {localSettings.quiet_hours_enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="time"
                  label="Quiet Hours Start"
                  value={localSettings.quiet_hours_start}
                  onValueChange={(value) => 
                    setLocalSettings(prev => ({ ...prev, quiet_hours_start: value }))
                  }
                />
                
                <Input
                  type="time"
                  label="Quiet Hours End"
                  value={localSettings.quiet_hours_end}
                  onValueChange={(value) => 
                    setLocalSettings(prev => ({ ...prev, quiet_hours_end: value }))
                  }
                />
              </div>

              <Switch
                isSelected={localSettings.weekend_quiet_mode}
                onValueChange={(value) => 
                  setLocalSettings(prev => ({ ...prev, weekend_quiet_mode: value }))
                }
              >
                <div>
                  <p className="font-medium">Weekend Quiet Mode</p>
                  <p className="text-sm text-foreground-500">
                    Extend quiet hours on weekends for better rest
                  </p>
                </div>
              </Switch>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <VolumeXIcon className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Auto-Response</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Switch
            isSelected={localSettings.auto_responses_enabled}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, auto_responses_enabled: value }))
            }
          >
            <div>
              <p className="font-medium">Enable Auto-Response</p>
              <p className="text-sm text-foreground-500">
                Automatically reply to messages when you&apos;re away
              </p>
            </div>
          </Switch>

          {localSettings.auto_responses_enabled && (
            <Input
              label="Auto-Response Message"
              placeholder="Thanks for your message. I'll get back to you soon!"
              value={localSettings.auto_response_message}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, auto_response_message: value }))
              }
              description="This message will be sent automatically to new conversations"
              maxLength={200}
            />
          )}
        </CardBody>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
          >
            {saving ? 'Saving...' : 'Save Communication Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}