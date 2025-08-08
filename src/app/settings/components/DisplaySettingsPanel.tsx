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
import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon, ZapIcon } from 'lucide-react'

import { useState } from 'react'

import { UserSettings, useUserSettings } from '@/hooks/useUserSettings'

interface DisplaySettingsPanelProps {
  settings: UserSettings | null
}

export default function DisplaySettingsPanel({ settings }: DisplaySettingsPanelProps) {
  const { updateSettingsSection } = useUserSettings()
  const [saving, setSaving] = useState(false)

  const displayPrefs = settings?.display_preferences || {
    theme: 'system',
    density: 'comfortable',
    sidebar_collapsed: false,
    show_tips: true,
    animations_enabled: true,
    reduced_motion: false,
  }

  const [localSettings, setLocalSettings] = useState(displayPrefs)

  const handleSave = async () => {
    setSaving(true)
    await updateSettingsSection('display_preferences', localSettings)
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(displayPrefs)

  const themeOptions = [
    { key: 'light', label: 'Light', icon: <SunIcon className="w-4 h-4" /> },
    { key: 'dark', label: 'Dark', icon: <MoonIcon className="w-4 h-4" /> },
    { key: 'system', label: 'System', icon: <MonitorIcon className="w-4 h-4" /> },
  ]

  const densityOptions = [
    { key: 'compact', label: 'Compact', description: 'More content, less spacing' },
    { key: 'comfortable', label: 'Comfortable', description: 'Balanced spacing' },
    { key: 'spacious', label: 'Spacious', description: 'More breathing room' },
  ]

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PaletteIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Theme & Appearance</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Select
            label="Color Theme"
            selectedKeys={[localSettings.theme]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              setLocalSettings(prev => ({ ...prev, theme: value as 'light' | 'dark' | 'system' }))
            }}
            description="Choose your preferred color scheme"
            startContent={themeOptions.find(option => option.key === localSettings.theme)?.icon}
          >
            {themeOptions.map(option => (
              <SelectItem key={option.key} startContent={option.icon}>
                {option.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Interface Density"
            selectedKeys={[localSettings.density]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              setLocalSettings(prev => ({
                ...prev,
                density: value as 'compact' | 'comfortable' | 'spacious',
              }))
            }}
            description="Adjust the spacing and size of interface elements"
          >
            {densityOptions.map(option => (
              <SelectItem key={option.key} textValue={option.label}>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-foreground-500">{option.description}</div>
                </div>
              </SelectItem>
            ))}
          </Select>
        </CardBody>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MonitorIcon className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Layout & Navigation</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Switch
            isSelected={!localSettings.sidebar_collapsed}
            onValueChange={value =>
              setLocalSettings(prev => ({ ...prev, sidebar_collapsed: !value }))
            }
          >
            <div>
              <p className="font-medium">Keep Sidebar Expanded</p>
              <p className="text-sm text-foreground-500">
                Show navigation labels in the sidebar by default
              </p>
            </div>
          </Switch>

          <Switch
            isSelected={localSettings.show_tips}
            onValueChange={value => setLocalSettings(prev => ({ ...prev, show_tips: value }))}
          >
            <div>
              <p className="font-medium">Show Helpful Tips</p>
              <p className="text-sm text-foreground-500">
                Display tooltips and guidance throughout the app
              </p>
            </div>
          </Switch>
        </CardBody>
      </Card>

      {/* Animation & Motion */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ZapIcon className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Animations & Motion</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Switch
            isSelected={localSettings.animations_enabled}
            onValueChange={value =>
              setLocalSettings(prev => ({ ...prev, animations_enabled: value }))
            }
          >
            <div>
              <p className="font-medium">Enable Animations</p>
              <p className="text-sm text-foreground-500">
                Show smooth transitions and animated effects
              </p>
            </div>
          </Switch>

          <Switch
            isSelected={localSettings.reduced_motion}
            onValueChange={value => setLocalSettings(prev => ({ ...prev, reduced_motion: value }))}
          >
            <div>
              <p className="font-medium">Reduce Motion</p>
              <p className="text-sm text-foreground-500">
                Minimize motion effects for accessibility (overrides animation setting)
              </p>
            </div>
          </Switch>

          {localSettings.reduced_motion && (
            <div className="p-3 bg-info-50 border border-info-200 rounded-lg">
              <p className="text-sm text-info-700">
                <strong>Accessibility Note:</strong> Reduced motion is enabled, which will minimize
                animations and transitions throughout the app to prevent motion sensitivity issues.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button color="primary" onPress={handleSave} isLoading={saving}>
            {saving ? 'Saving...' : 'Save Display Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}
