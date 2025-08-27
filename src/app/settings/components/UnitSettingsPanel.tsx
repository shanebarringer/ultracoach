'use client'

import { Button, Card, CardBody, CardHeader, Divider, Select, SelectItem } from '@heroui/react'
import { CalendarIcon, ClockIcon, RulerIcon, ThermometerIcon } from 'lucide-react'

import { useState } from 'react'

import { UserSettings, useUserSettings } from '@/hooks/useUserSettings'

interface UnitSettingsPanelProps {
  settings: UserSettings | null
}

export default function UnitSettingsPanel({ settings }: UnitSettingsPanelProps) {
  const { updateSettingsSection } = useUserSettings()
  const [saving, setSaving] = useState(false)

  const unitPrefs = settings?.unit_preferences || {
    distance: 'miles',
    elevation: 'feet',
    temperature: 'fahrenheit',
    pace_format: 'min_per_mile',
    time_format: '12h',
    date_format: 'MM/dd/yyyy',
  }

  const [localSettings, setLocalSettings] = useState(unitPrefs)

  const handleSave = async () => {
    setSaving(true)
    await updateSettingsSection('unit_preferences', localSettings)
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(unitPrefs)

  return (
    <div className="space-y-6">
      {/* Distance & Measurement Units */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RulerIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Distance & Measurement</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Distance Units"
              selectedKeys={[localSettings.distance]}
              onSelectionChange={keys => {
                const value = Array.from(keys)[0] as string
                setLocalSettings(prev => ({ ...prev, distance: value as 'miles' | 'kilometers' }))
              }}
              description="Primary unit for distances and running metrics"
            >
              <SelectItem key="miles">Miles</SelectItem>
              <SelectItem key="kilometers">Kilometers</SelectItem>
            </Select>

            <Select
              label="Elevation Units"
              selectedKeys={[localSettings.elevation]}
              onSelectionChange={keys => {
                const value = Array.from(keys)[0] as string
                setLocalSettings(prev => ({ ...prev, elevation: value as 'feet' | 'meters' }))
              }}
              description="Unit for elevation gain and altitude"
            >
              <SelectItem key="feet">Feet</SelectItem>
              <SelectItem key="meters">Meters</SelectItem>
            </Select>
          </div>

          <Select
            label="Pace Format"
            selectedKeys={[localSettings.pace_format]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              setLocalSettings(prev => ({
                ...prev,
                pace_format: value as 'min_per_mile' | 'min_per_km' | 'mph' | 'kmh',
              }))
            }}
            description="How to display running pace and speed"
          >
            <SelectItem key="min_per_mile">Minutes per Mile (e.g., 8:30/mi)</SelectItem>
            <SelectItem key="min_per_km">Minutes per Kilometer (e.g., 5:17/km)</SelectItem>
            <SelectItem key="mph">Miles per Hour (e.g., 7.1 mph)</SelectItem>
            <SelectItem key="kmh">Kilometers per Hour (e.g., 11.4 km/h)</SelectItem>
          </Select>
        </CardBody>
      </Card>

      {/* Temperature Units */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ThermometerIcon className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Temperature</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <Select
            label="Temperature Units"
            selectedKeys={[localSettings.temperature]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              setLocalSettings(prev => ({
                ...prev,
                temperature: value as 'fahrenheit' | 'celsius',
              }))
            }}
            description="Unit for weather and temperature displays"
          >
            <SelectItem key="fahrenheit">Fahrenheit (°F)</SelectItem>
            <SelectItem key="celsius">Celsius (°C)</SelectItem>
          </Select>
        </CardBody>
      </Card>

      {/* Time & Date Formats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Time & Date Formats</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Time Format"
              selectedKeys={[localSettings.time_format]}
              onSelectionChange={keys => {
                const value = Array.from(keys)[0] as string
                setLocalSettings(prev => ({ ...prev, time_format: value as '12h' | '24h' }))
              }}
              description="12-hour or 24-hour time display"
              startContent={<ClockIcon className="w-4 h-4" />}
            >
              <SelectItem key="12h">12-hour (3:30 PM)</SelectItem>
              <SelectItem key="24h">24-hour (15:30)</SelectItem>
            </Select>

            <Select
              label="Date Format"
              selectedKeys={[localSettings.date_format]}
              onSelectionChange={keys => {
                const value = Array.from(keys)[0] as string
                setLocalSettings(prev => ({
                  ...prev,
                  date_format: value as 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd',
                }))
              }}
              description="How dates are displayed throughout the app"
              startContent={<CalendarIcon className="w-4 h-4" />}
            >
              <SelectItem key="MM/dd/yyyy">MM/dd/yyyy (12/25/2024)</SelectItem>
              <SelectItem key="dd/MM/yyyy">dd/MM/yyyy (25/12/2024)</SelectItem>
              <SelectItem key="yyyy-MM-dd">yyyy-MM-dd (2024-12-25)</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Preview */}
      <Card className="bg-primary-50 border-primary-200">
        <CardHeader>
          <h3 className="text-lg font-semibold">Preview</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground-700 mb-2">Distance & Pace:</p>
              <p>• 10 {localSettings.distance === 'miles' ? 'miles' : 'kilometers'} run</p>
              <p>
                •{' '}
                {localSettings.pace_format === 'min_per_mile'
                  ? '8:30/mi pace'
                  : localSettings.pace_format === 'min_per_km'
                    ? '5:17/km pace'
                    : localSettings.pace_format === 'mph'
                      ? '7.1 mph speed'
                      : '11.4 km/h speed'}
              </p>
              <p>• 1,200 {localSettings.elevation === 'feet' ? 'ft' : 'm'} elevation gain</p>
            </div>
            <div>
              <p className="font-medium text-foreground-700 mb-2">Time & Weather:</p>
              <p>• Workout at {localSettings.time_format === '12h' ? '6:30 AM' : '06:30'}</p>
              <p>
                • Date:{' '}
                {localSettings.date_format === 'MM/dd/yyyy'
                  ? '12/25/2024'
                  : localSettings.date_format === 'dd/MM/yyyy'
                    ? '25/12/2024'
                    : '2024-12-25'}
              </p>
              <p>• Temperature: 45{localSettings.temperature === 'fahrenheit' ? '°F' : '°C'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button color="primary" onPress={handleSave} isLoading={saving}>
            {saving ? 'Saving...' : 'Save Unit Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}
