'use client'

import { Card, CardBody, Radio, RadioGroup, Spinner } from '@heroui/react'
import { AlertCircle, Check, Pencil, Smartphone, Watch, Zap } from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'

const logger = createLogger('ActivitySourcePreference')

export type ActivitySource = 'strava' | 'garmin' | 'manual' | 'auto'

interface ActivitySourcePreferenceProps {
  initialValue?: ActivitySource
  onSave?: (source: ActivitySource) => void
}

/**
 * Activity Source Preference Selector
 *
 * Allows users to choose their preferred source for activity data when
 * multiple sources (Strava, Garmin) could provide the same workout data.
 *
 * Options:
 * - auto: Use first available source (default)
 * - strava: Prefer Strava activities
 * - garmin: Prefer Garmin activities
 * - manual: Only use manually entered data
 */
export default function ActivitySourcePreference({
  initialValue,
  onSave,
}: ActivitySourcePreferenceProps) {
  const [value, setValue] = useState<ActivitySource>(initialValue ?? 'auto')
  const [isLoading, setIsLoading] = useState(!initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Fetch current preference on mount
  useEffect(() => {
    if (initialValue) {
      setIsLoading(false)
      return
    }

    const fetchPreference = async () => {
      try {
        const response = await fetch('/api/settings', {
          credentials: 'same-origin',
        })

        if (response.ok) {
          const data = await response.json()
          const preference =
            data.settings?.training_preferences?.preferred_activity_source ?? 'auto'
          setValue(preference)
        }
      } catch (error) {
        logger.error('Failed to fetch activity source preference', { error })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreference()
  }, [initialValue])

  const handleChange = useCallback(
    async (newValue: string) => {
      const source = newValue as ActivitySource
      setValue(source)
      setIsSaving(true)
      setSaveStatus('idle')

      try {
        const response = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            section: 'training_preferences',
            settings: { preferred_activity_source: source },
          }),
        })

        if (response.ok) {
          setSaveStatus('success')
          onSave?.(source)
          logger.info('Activity source preference saved', { source })

          // Reset status after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          throw new Error('Failed to save preference')
        }
      } catch (error) {
        logger.error('Failed to save activity source preference', { error })
        setSaveStatus('error')
      } finally {
        setIsSaving(false)
      }
    },
    [onSave]
  )

  if (isLoading) {
    return (
      <Card className="bg-default-50">
        <CardBody className="flex items-center justify-center py-8">
          <Spinner size="sm" />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="bg-default-50">
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium">Primary Activity Source</h4>
            <p className="text-sm text-default-500">
              Choose which source to use when multiple devices record the same workout
            </p>
          </div>
          {isSaving && <Spinner size="sm" />}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-success">
              <Check className="h-4 w-4" />
              <span className="text-sm">Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-danger">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Error</span>
            </div>
          )}
        </div>

        <RadioGroup
          value={value}
          onValueChange={handleChange}
          classNames={{
            wrapper: 'gap-3',
          }}
        >
          <Radio
            value="auto"
            description="Use whichever source syncs first"
            classNames={{
              base: 'max-w-full p-3 border-2 border-transparent data-[selected=true]:border-primary rounded-lg bg-content1',
            }}
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              <span>Auto (First Available)</span>
            </div>
          </Radio>

          <Radio
            value="strava"
            description="Always prefer Strava activity data"
            classNames={{
              base: 'max-w-full p-3 border-2 border-transparent data-[selected=true]:border-primary rounded-lg bg-content1',
            }}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#FC4C02]" />
              <span>Strava</span>
            </div>
          </Radio>

          <Radio
            value="garmin"
            description="Always prefer Garmin device data"
            classNames={{
              base: 'max-w-full p-3 border-2 border-transparent data-[selected=true]:border-primary rounded-lg bg-content1',
            }}
          >
            <div className="flex items-center gap-2">
              <Watch className="h-4 w-4 text-[#007CC3]" />
              <span>Garmin</span>
            </div>
          </Radio>

          <Radio
            value="manual"
            description="Only use manually entered workout data"
            classNames={{
              base: 'max-w-full p-3 border-2 border-transparent data-[selected=true]:border-primary rounded-lg bg-content1',
            }}
          >
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-default-500" />
              <span>Manual Only</span>
            </div>
          </Radio>
        </RadioGroup>

        <p className="text-xs text-default-400">
          This prevents duplicate imports when the same workout is recorded on multiple devices.
        </p>
      </CardBody>
    </Card>
  )
}
