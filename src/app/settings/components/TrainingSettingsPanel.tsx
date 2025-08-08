'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CheckboxGroup,
  Checkbox,
  Divider,
  Input,
  Select,
  SelectItem,
  Switch,
} from '@heroui/react'
import { TargetIcon, CalendarIcon, ClockIcon } from 'lucide-react'

import { useState } from 'react'

import { useUserSettings, UserSettings } from '@/hooks/useUserSettings'

interface TrainingSettingsPanelProps {
  settings: UserSettings | null
}

export default function TrainingSettingsPanel({ settings }: TrainingSettingsPanelProps) {
  const { updateSettingsSection } = useUserSettings()
  const [saving, setSaving] = useState(false)

  const trainingPrefs = settings?.training_preferences || {
    default_workout_view: 'calendar',
    show_completed_workouts: true,
    auto_sync_devices: false,
    preferred_training_times: [],
    rest_day_preferences: ['sunday'],
    workout_reminder_time: 60,
    show_weather_info: true,
    track_heart_rate: true,
    track_cadence: false,
    track_power: false,
  }

  const [localSettings, setLocalSettings] = useState(trainingPrefs)

  const handleSave = async () => {
    setSaving(true)
    await updateSettingsSection('training_preferences', localSettings)
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(trainingPrefs)


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Workout Display</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <Select
            label="Default Workout View"
            selectedKeys={[localSettings.default_workout_view]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string
              setLocalSettings(prev => ({ ...prev, default_workout_view: value as 'calendar' | 'list' | 'timeline' }))
            }}
            description="How you prefer to view your training schedule"
          >
            <SelectItem key="calendar">Calendar View</SelectItem>
            <SelectItem key="list">List View</SelectItem>
            <SelectItem key="timeline">Timeline View</SelectItem>
          </Select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              isSelected={localSettings.show_completed_workouts}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, show_completed_workouts: value }))
              }
            >
              <div>
                <p className="font-medium">Show Completed Workouts</p>
                <p className="text-sm text-foreground-500">Display past workouts in your calendar</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.show_weather_info}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, show_weather_info: value }))
              }
            >
              <div>
                <p className="font-medium">Show Weather Info</p>
                <p className="text-sm text-foreground-500">Display weather for workout days</p>
              </div>
            </Switch>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Training Schedule</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <CheckboxGroup
            label="Preferred Training Times"
            value={localSettings.preferred_training_times}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, preferred_training_times: value }))
            }
            description="When do you usually prefer to work out?"
            orientation="horizontal"
          >
            <Checkbox value="early-morning">Early Morning (5-8 AM)</Checkbox>
            <Checkbox value="morning">Morning (8-12 PM)</Checkbox>
            <Checkbox value="afternoon">Afternoon (12-5 PM)</Checkbox>
            <Checkbox value="evening">Evening (5-8 PM)</Checkbox>
          </CheckboxGroup>

          <CheckboxGroup
            label="Preferred Rest Days"
            value={localSettings.rest_day_preferences}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, rest_day_preferences: value }))
            }
            description="Which days do you prefer for rest or recovery?"
            orientation="horizontal"
          >
            <Checkbox value="sunday">Sunday</Checkbox>
            <Checkbox value="monday">Monday</Checkbox>
            <Checkbox value="tuesday">Tuesday</Checkbox>
            <Checkbox value="wednesday">Wednesday</Checkbox>
            <Checkbox value="thursday">Thursday</Checkbox>
            <Checkbox value="friday">Friday</Checkbox>
            <Checkbox value="saturday">Saturday</Checkbox>
          </CheckboxGroup>

          <Input
            type="number"
            label="Workout Reminder (minutes)"
            value={localSettings.workout_reminder_time.toString()}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, workout_reminder_time: parseInt(value) || 60 }))
            }
            description="How many minutes before a workout should you be reminded?"
            min="0"
            max="1440"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Data Tracking</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              isSelected={localSettings.auto_sync_devices}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, auto_sync_devices: value }))
              }
            >
              <div>
                <p className="font-medium">Auto-Sync Devices</p>
                <p className="text-sm text-foreground-500">Automatically sync fitness device data</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.track_heart_rate}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, track_heart_rate: value }))
              }
            >
              <div>
                <p className="font-medium">Track Heart Rate</p>
                <p className="text-sm text-foreground-500">Monitor and display heart rate data</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.track_cadence}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, track_cadence: value }))
              }
            >
              <div>
                <p className="font-medium">Track Cadence</p>
                <p className="text-sm text-foreground-500">Monitor running cadence (steps per minute)</p>
              </div>
            </Switch>

            <Switch
              isSelected={localSettings.track_power}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, track_power: value }))
              }
            >
              <div>
                <p className="font-medium">Track Power</p>
                <p className="text-sm text-foreground-500">Monitor running power metrics</p>
              </div>
            </Switch>
          </div>
        </CardBody>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
          >
            {saving ? 'Saving...' : 'Save Training Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}