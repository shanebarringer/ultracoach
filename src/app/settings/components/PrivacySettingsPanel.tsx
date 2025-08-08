'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Select,
  SelectItem,
  Switch,
} from '@heroui/react'
import { ShieldIcon, EyeIcon, UsersIcon } from 'lucide-react'

import { useState } from 'react'

import { useUserSettings, UserSettings } from '@/hooks/useUserSettings'

interface PrivacySettingsPanelProps {
  settings: UserSettings | null
}

export default function PrivacySettingsPanel({ settings }: PrivacySettingsPanelProps) {
  const { updateSettingsSection } = useUserSettings()
  const [saving, setSaving] = useState(false)

  const privacySettings = settings?.privacy_settings || {
    profile_visibility: 'coaches_only',
    show_activity_stats: true,
    show_training_calendar: true,
    allow_coach_invitations: true,
    allow_runner_connections: true,
    show_location: true,
    show_age: true,
    data_sharing_analytics: true,
  }

  const [localSettings, setLocalSettings] = useState(privacySettings)

  const handleSave = async () => {
    setSaving(true)
    await updateSettingsSection('privacy_settings', localSettings)
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(privacySettings)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <EyeIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Profile Visibility</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Select
            label="Who can see your profile"
            selectedKeys={[localSettings.profile_visibility]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string
              setLocalSettings(prev => ({ ...prev, profile_visibility: value as 'public' | 'coaches_only' | 'private' }))
            }}
            description="Control who can view your profile information"
          >
            <SelectItem key="public">Everyone (Public)</SelectItem>
            <SelectItem key="coaches_only">Coaches Only</SelectItem>
            <SelectItem key="private">Private (Only you)</SelectItem>
          </Select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              isSelected={localSettings.show_activity_stats}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, show_activity_stats: value }))
              }
            >
              <div>
                <p className="font-medium">Show Activity Stats</p>
                <p className="text-sm text-foreground-500">Display your running metrics and progress</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.show_training_calendar}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, show_training_calendar: value }))
              }
            >
              <div>
                <p className="font-medium">Show Training Calendar</p>
                <p className="text-sm text-foreground-500">Let others see your workout schedule</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.show_location}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, show_location: value }))
              }
            >
              <div>
                <p className="font-medium">Show Location</p>
                <p className="text-sm text-foreground-500">Display your city and timezone</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.show_age}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, show_age: value }))
              }
            >
              <div>
                <p className="font-medium">Show Age</p>
                <p className="text-sm text-foreground-500">Display your age on your profile</p>
              </div>
            </Switch>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Connection Settings</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              isSelected={localSettings.allow_coach_invitations}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, allow_coach_invitations: value }))
              }
            >
              <div>
                <p className="font-medium">Allow Coach Invitations</p>
                <p className="text-sm text-foreground-500">Let coaches send you training invitations</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.allow_runner_connections}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, allow_runner_connections: value }))
              }
            >
              <div>
                <p className="font-medium">Allow Runner Connections</p>
                <p className="text-sm text-foreground-500">Let other runners connect with you</p>
              </div>
            </Switch>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Data & Analytics</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <Switch
            isSelected={localSettings.data_sharing_analytics}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, data_sharing_analytics: value }))
            }
          >
            <div>
              <p className="font-medium">Help Improve UltraCoach</p>
              <p className="text-sm text-foreground-500">
                Share anonymous usage data to help us improve the app experience
              </p>
            </div>
          </Switch>

          {!localSettings.data_sharing_analytics && (
            <div className="mt-3 p-3 bg-info-50 border border-info-200 rounded-lg">
              <p className="text-sm text-info-700">
                Disabling analytics helps protect your privacy but may limit our ability to 
                improve features and fix issues you encounter.
              </p>
            </div>
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
            {saving ? 'Saving...' : 'Save Privacy Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}