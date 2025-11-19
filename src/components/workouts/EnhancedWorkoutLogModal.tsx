'use client'

import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Slider,
  Tab,
  Tabs,
  Textarea,
} from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom } from 'jotai'
import {
  Activity,
  AlertCircle,
  Calendar,
  Clock,
  Heart,
  MapPin,
  Mountain,
  Save,
  Target,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react'
import { z } from 'zod'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { usePostHogEvent } from '@/hooks/usePostHogIdentify'
import { stravaStateAtom, workoutLogFormAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import type { StravaActivity } from '@/types/strava'

const logger = createLogger('EnhancedWorkoutLogModal')

// Enhanced Zod schema with additional fields
const enhancedWorkoutLogSchema = z.object({
  status: z.enum(['completed', 'skipped', 'planned']),
  actualType: z.string().optional(),
  category: z
    .enum([
      'easy',
      'tempo',
      'interval',
      'long_run',
      'race_simulation',
      'recovery',
      'strength',
      'cross_training',
      'rest',
    ])
    .nullable()
    .optional(),
  intensity: z
    .number()
    .min(1, 'Intensity must be at least 1')
    .max(10, 'Intensity must be at most 10')
    .nullable()
    .optional(),
  effort: z
    .number()
    .min(1, 'Effort must be at least 1')
    .max(10, 'Effort must be at most 10')
    .nullable()
    .optional(),
  enjoyment: z
    .number()
    .min(1, 'Enjoyment must be at least 1')
    .max(10, 'Enjoyment must be at most 10')
    .nullable()
    .optional(),
  terrain: z.enum(['road', 'trail', 'track', 'treadmill']).nullable().optional(),
  elevationGain: z.number().min(0, 'Elevation gain must be positive').nullable().optional(),
  actualDistance: z.number().min(0, 'Distance must be positive').nullable().optional(),
  actualDuration: z.number().min(0, 'Duration must be positive').nullable().optional(),
  avgHeartRate: z
    .number()
    .min(40, 'Heart rate too low')
    .max(220, 'Heart rate too high')
    .nullable()
    .optional(),
  maxHeartRate: z
    .number()
    .min(40, 'Heart rate too low')
    .max(220, 'Heart rate too high')
    .nullable()
    .optional(),
  avgPace: z.string().optional(), // Format: "MM:SS"
  temperature: z
    .number()
    .min(-40, 'Temperature too low')
    .max(130, 'Temperature too high')
    .nullable()
    .optional(),
  humidity: z
    .number()
    .min(0, 'Humidity must be at least 0')
    .max(100, 'Humidity must be at most 100')
    .nullable()
    .optional(),
  windConditions: z
    .enum(['none', 'light', 'moderate', 'strong', 'very_strong'])
    .nullable()
    .optional(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional(),
  workoutNotes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
  injuryNotes: z.string().max(1000, 'Injury notes must be less than 1000 characters').optional(),
  energyLevel: z
    .number()
    .min(1, 'Energy level must be at least 1')
    .max(10, 'Energy level must be at most 10')
    .nullable()
    .optional(),
  sleepQuality: z
    .number()
    .min(1, 'Sleep quality must be at least 1')
    .max(10, 'Sleep quality must be at most 10')
    .nullable()
    .optional(),
  nutritionNotes: z
    .string()
    .max(500, 'Nutrition notes must be less than 500 characters')
    .optional(),
  gearNotes: z.string().max(500, 'Gear notes must be less than 500 characters').optional(),
})

type EnhancedWorkoutLogForm = z.infer<typeof enhancedWorkoutLogSchema>

interface EnhancedWorkoutLogModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  workout: Workout
  defaultToComplete?: boolean
}

/**
 * Enhanced workout logging modal with multi-tab interface
 *
 * Features:
 * - Multi-tab organization (Basic, Performance, Environment, Recovery)
 * - Rich form fields with sliders and advanced inputs
 * - Strava integration hints and data sync
 * - Visual feedback and validation
 * - Mountain Peak design consistency
 * - Real-time form validation
 */
const EnhancedWorkoutLogModal = memo(
  ({
    isOpen,
    onClose,
    onSuccess,
    workout,
    defaultToComplete = false,
  }: EnhancedWorkoutLogModalProps) => {
    const [formState, setFormState] = useAtom(workoutLogFormAtom)
    const [stravaState] = useAtom(stravaStateAtom)
    const [activeTab, setActiveTab] = useState('basic')
    const trackEvent = usePostHogEvent()

    // React Hook Form setup with enhanced schema
    const {
      control,
      handleSubmit,
      reset,
      watch,
      setValue,
      formState: { isSubmitting },
    } = useForm<EnhancedWorkoutLogForm>({
      resolver: zodResolver(enhancedWorkoutLogSchema),
      defaultValues: {
        status:
          defaultToComplete && workout.status !== 'completed'
            ? 'completed'
            : workout.status || 'planned',
        actualType: workout.actual_type || workout.planned_type || '',
        category: workout.category || undefined,
        intensity: workout.intensity || undefined,
        terrain: workout.terrain || undefined,
        elevationGain: workout.elevation_gain || undefined,
        actualDistance: workout.actual_distance || undefined,
        actualDuration: workout.actual_duration || undefined,
        workoutNotes: workout.workout_notes || '',
        injuryNotes: workout.injury_notes || '',
        effort: undefined,
        enjoyment: undefined,
        avgHeartRate: undefined,
        maxHeartRate: undefined,
        avgPace: '',
        temperature: undefined,
        humidity: undefined,
        windConditions: undefined,
        location: '',
        energyLevel: undefined,
        sleepQuality: undefined,
        nutritionNotes: '',
        gearNotes: '',
      },
    })

    const watchedStatus = watch('status')
    const watchedDistance = watch('actualDistance')
    const watchedDuration = watch('actualDuration')

    // Calculate average pace from distance and duration
    const calculatedPace = useMemo(() => {
      if (watchedDistance && watchedDuration && watchedDistance > 0) {
        const paceInMinutes = watchedDuration / watchedDistance
        const minutes = Math.floor(paceInMinutes)
        const seconds = Math.round((paceInMinutes - minutes) * 60)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
      return ''
    }, [watchedDistance, watchedDuration])

    // Update pace field when distance/duration changes
    useEffect(() => {
      if (calculatedPace) {
        setValue('avgPace', calculatedPace)
      }
    }, [calculatedPace, setValue])

    // Reset form when modal opens
    useEffect(() => {
      if (isOpen) {
        reset({
          status:
            defaultToComplete && workout.status !== 'completed'
              ? 'completed'
              : workout.status || 'planned',
          actualType: workout.actual_type || workout.planned_type || '',
          category: workout.category || undefined,
          intensity: workout.intensity || undefined,
          terrain: workout.terrain || undefined,
          elevationGain: workout.elevation_gain || undefined,
          actualDistance: workout.actual_distance || undefined,
          actualDuration: workout.actual_duration || undefined,
          workoutNotes: workout.workout_notes || '',
          injuryNotes: workout.injury_notes || '',
        })
        setActiveTab('basic')
      }
    }, [workout, isOpen, reset, defaultToComplete])

    // Check if there are Strava activities that might match this workout
    const potentialStravaMatch = useMemo(() => {
      if (!stravaState.activities || !workout.date) return null

      const workoutDate = workout.date
      return stravaState.activities.find((activity: StravaActivity) => {
        const activityDate = new Date(activity.start_date).toISOString().split('T')[0]
        return activityDate === workoutDate && activity.type === 'Run'
      })
    }, [stravaState.activities, workout.date])

    // Handle form submission
    const onSubmit = useCallback(
      async (data: EnhancedWorkoutLogForm) => {
        setFormState(prev => ({ ...prev, loading: true, error: '' }))

        try {
          const payload = {
            actualType: data.actualType,
            actualDistance: data.actualDistance,
            actualDuration: data.actualDuration,
            workoutNotes: data.workoutNotes,
            injuryNotes: data.injuryNotes,
            status: data.status,
            category: data.category,
            intensity: data.intensity,
            terrain: data.terrain,
            elevation_gain: data.elevationGain,
            // Extended fields - would need API endpoint updates to save these
            effort: data.effort,
            enjoyment: data.enjoyment,
            avg_heart_rate: data.avgHeartRate,
            max_heart_rate: data.maxHeartRate,
            avg_pace: data.avgPace,
            temperature: data.temperature,
            humidity: data.humidity,
            wind_conditions: data.windConditions,
            location: data.location,
            energy_level: data.energyLevel,
            sleep_quality: data.sleepQuality,
            nutrition_notes: data.nutritionNotes,
            gear_notes: data.gearNotes,
          }

          logger.info('Submitting enhanced workout log update:', { workoutId: workout.id, payload })

          const response = await fetch(`/api/workouts/${workout.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          if (response.ok) {
            logger.info('Enhanced workout updated successfully')

            // Track workout completion event in PostHog
            trackEvent('workout_logged', {
              workoutId: workout.id,
              status: data.status,
              workoutType: data.actualType || workout.planned_type,
              category: data.category,
              distance: data.actualDistance,
              duration: data.actualDuration,
              intensity: data.intensity,
              terrain: data.terrain,
              elevationGain: data.elevationGain,
              hasHeartRate: !!(data.avgHeartRate || data.maxHeartRate),
              hasStravaMatch: !!potentialStravaMatch,
            })

            setFormState(prev => ({ ...prev, loading: false, error: '' }))
            reset()
            onSuccess()
            onClose()
          } else {
            const errorData = await response.json()
            logger.error('Failed to update enhanced workout:', errorData)
            setFormState(prev => ({
              ...prev,
              loading: false,
              error: errorData.error || 'Failed to update workout',
            }))
          }
        } catch (error) {
          logger.error('Error updating enhanced workout:', error)
          setFormState(prev => ({
            ...prev,
            loading: false,
            error: 'An error occurred. Please try again.',
          }))
        }
      },
      [
        workout.id,
        workout.planned_type,
        setFormState,
        reset,
        onSuccess,
        onClose,
        trackEvent,
        potentialStravaMatch,
      ]
    )

    // Handle Strava data import
    const handleImportStravaData = useCallback(() => {
      if (potentialStravaMatch) {
        logger.info('Importing Strava data into workout log', {
          activityId: potentialStravaMatch.id,
          workoutId: workout.id,
        })

        setValue('actualDistance', Number((potentialStravaMatch.distance / 1609.34).toFixed(2)))
        setValue('actualDuration', Math.round(potentialStravaMatch.moving_time / 60))
        setValue('elevationGain', Math.round(potentialStravaMatch.total_elevation_gain || 0))
        setValue(
          'location',
          potentialStravaMatch.location_city || potentialStravaMatch.location_state || ''
        )
        setValue('status', 'completed')

        // Switch to basic tab to show imported data
        setActiveTab('basic')
      }
    }, [potentialStravaMatch, setValue, workout.id])

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="4xl"
        scrollBehavior="inside"
        className="max-h-[95vh]"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Log Workout</h2>
              {potentialStravaMatch && (
                <Button
                  size="sm"
                  color="success"
                  variant="flat"
                  onPress={handleImportStravaData}
                  startContent={<Activity className="h-4 w-4" />}
                >
                  Import from Strava
                </Button>
              )}
            </div>

            {/* Planned workout summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardBody className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {new Date(workout.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{workout.planned_type}</span>
                  </div>
                  {workout.planned_distance && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{workout.planned_distance} miles</span>
                    </div>
                  )}
                  {workout.planned_duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">{workout.planned_duration} min</span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </ModalHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody className="p-0">
              {formState.error && (
                <div className="mx-6 mt-4 bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {formState.error}
                  </div>
                </div>
              )}

              <Tabs
                aria-label="Workout logging tabs"
                className="px-6 pt-4"
                selectedKey={activeTab}
                onSelectionChange={key => setActiveTab(key as string)}
              >
                <Tab
                  key="basic"
                  title={
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Basic Info
                    </div>
                  }
                >
                  <div className="space-y-6 py-4">
                    {/* Status */}
                    <Controller
                      name="status"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Select
                          label="Status"
                          isRequired
                          selectedKeys={field.value ? [field.value] : []}
                          onSelectionChange={keys => {
                            const selectedStatus = Array.from(keys).join('') as
                              | 'completed'
                              | 'skipped'
                              | 'planned'
                            field.onChange(selectedStatus)
                          }}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                          items={[
                            { id: 'completed', name: 'Completed' },
                            { id: 'skipped', name: 'Skipped' },
                            { id: 'planned', name: 'Planned' },
                          ]}
                        >
                          {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                        </Select>
                      )}
                    />

                    {watchedStatus === 'completed' && (
                      <>
                        {/* Basic metrics grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Controller
                            name="actualDistance"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Input
                                {...field}
                                type="number"
                                label="Distance (miles)"
                                placeholder="e.g., 6.2"
                                step="0.1"
                                min="0"
                                value={field.value?.toString() || ''}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={<MapPin className="h-4 w-4 text-default-400" />}
                              />
                            )}
                          />

                          <Controller
                            name="actualDuration"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Input
                                {...field}
                                type="number"
                                label="Duration (minutes)"
                                placeholder="e.g., 45"
                                min="0"
                                value={field.value?.toString() || ''}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={<Clock className="h-4 w-4 text-default-400" />}
                              />
                            )}
                          />
                        </div>

                        {/* Calculated pace display */}
                        {calculatedPace && (
                          <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-success" />
                            <span className="text-sm text-success font-medium">
                              Average Pace: {calculatedPace} /mile
                            </span>
                          </div>
                        )}

                        {/* Type and Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Controller
                            name="actualType"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Select
                                label="Actual Workout Type"
                                selectedKeys={field.value ? [field.value] : []}
                                onSelectionChange={keys => {
                                  const selectedType = Array.from(keys).join('')
                                  field.onChange(selectedType)
                                }}
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                items={[
                                  { id: 'Easy Run', name: 'Easy Run' },
                                  { id: 'Long Run', name: 'Long Run' },
                                  { id: 'Tempo Run', name: 'Tempo Run' },
                                  { id: 'Interval Training', name: 'Interval Training' },
                                  { id: 'Fartlek', name: 'Fartlek' },
                                  { id: 'Hill Training', name: 'Hill Training' },
                                  { id: 'Recovery Run', name: 'Recovery Run' },
                                  { id: 'Cross Training', name: 'Cross Training' },
                                  { id: 'Strength Training', name: 'Strength Training' },
                                ]}
                              >
                                {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                              </Select>
                            )}
                          />

                          <Controller
                            name="terrain"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Select
                                label="Terrain"
                                selectedKeys={field.value ? [field.value] : []}
                                onSelectionChange={keys => {
                                  const selectedTerrain = Array.from(keys)[0] as
                                    | 'road'
                                    | 'trail'
                                    | 'track'
                                    | 'treadmill'
                                    | ''
                                  field.onChange(selectedTerrain || undefined)
                                }}
                                placeholder="Select terrain..."
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                items={[
                                  { id: 'road', name: 'Road' },
                                  { id: 'trail', name: 'Trail' },
                                  { id: 'track', name: 'Track' },
                                  { id: 'treadmill', name: 'Treadmill' },
                                ]}
                              >
                                {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                              </Select>
                            )}
                          />
                        </div>

                        {/* Location */}
                        <Controller
                          name="location"
                          control={control}
                          render={({ field, fieldState }) => (
                            <Input
                              {...field}
                              label="Location"
                              placeholder="e.g., Central Park, NYC"
                              isInvalid={!!fieldState.error}
                              errorMessage={fieldState.error?.message}
                              startContent={<MapPin className="h-4 w-4 text-default-400" />}
                            />
                          )}
                        />
                      </>
                    )}
                  </div>
                </Tab>

                <Tab
                  key="performance"
                  title={
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Performance
                    </div>
                  }
                >
                  <div className="space-y-6 py-4">
                    {watchedStatus === 'completed' && (
                      <>
                        {/* Intensity and Effort Sliders */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Controller
                            name="intensity"
                            control={control}
                            render={({ field }) => (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-warning" />
                                  <label className="text-sm font-medium">Intensity Level</label>
                                  {field.value && (
                                    <Badge color="warning" size="sm">
                                      {field.value}/10
                                    </Badge>
                                  )}
                                </div>
                                <Slider
                                  size="sm"
                                  step={1}
                                  minValue={1}
                                  maxValue={10}
                                  value={field.value ? [field.value] : [5]}
                                  onChange={value =>
                                    field.onChange(Array.isArray(value) ? value[0] : value)
                                  }
                                  className="max-w-md"
                                  color="warning"
                                />
                                <p className="text-xs text-foreground-600">
                                  How hard was the planned effort?
                                </p>
                              </div>
                            )}
                          />

                          <Controller
                            name="effort"
                            control={control}
                            render={({ field }) => (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-danger" />
                                  <label className="text-sm font-medium">Perceived Effort</label>
                                  {field.value && (
                                    <Badge color="danger" size="sm">
                                      {field.value}/10
                                    </Badge>
                                  )}
                                </div>
                                <Slider
                                  size="sm"
                                  step={1}
                                  minValue={1}
                                  maxValue={10}
                                  value={field.value ? [field.value] : [5]}
                                  onChange={value =>
                                    field.onChange(Array.isArray(value) ? value[0] : value)
                                  }
                                  className="max-w-md"
                                  color="danger"
                                />
                                <p className="text-xs text-foreground-600">
                                  How hard did it actually feel?
                                </p>
                              </div>
                            )}
                          />
                        </div>

                        {/* Heart Rate */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Controller
                            name="avgHeartRate"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Input
                                {...field}
                                type="number"
                                label="Average Heart Rate"
                                placeholder="e.g., 150"
                                min="40"
                                max="220"
                                value={field.value?.toString() || ''}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={<Heart className="h-4 w-4 text-danger" />}
                                endContent={<span className="text-sm text-default-400">bpm</span>}
                              />
                            )}
                          />

                          <Controller
                            name="maxHeartRate"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Input
                                {...field}
                                type="number"
                                label="Max Heart Rate"
                                placeholder="e.g., 175"
                                min="40"
                                max="220"
                                value={field.value?.toString() || ''}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={<Heart className="h-4 w-4 text-danger" />}
                                endContent={<span className="text-sm text-default-400">bpm</span>}
                              />
                            )}
                          />
                        </div>

                        {/* Elevation */}
                        <Controller
                          name="elevationGain"
                          control={control}
                          render={({ field, fieldState }) => (
                            <Input
                              {...field}
                              type="number"
                              label="Elevation Gain"
                              placeholder="e.g., 500"
                              min="0"
                              value={field.value?.toString() || ''}
                              onChange={e =>
                                field.onChange(e.target.value ? Number(e.target.value) : undefined)
                              }
                              isInvalid={!!fieldState.error}
                              errorMessage={fieldState.error?.message}
                              startContent={<Mountain className="h-4 w-4 text-success" />}
                              endContent={<span className="text-sm text-default-400">ft</span>}
                            />
                          )}
                        />

                        {/* Enjoyment Slider */}
                        <Controller
                          name="enjoyment"
                          control={control}
                          render={({ field }) => (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">😊</span>
                                <label className="text-sm font-medium">Enjoyment Level</label>
                                {field.value && (
                                  <Badge color="success" size="sm">
                                    {field.value}/10
                                  </Badge>
                                )}
                              </div>
                              <Slider
                                size="sm"
                                step={1}
                                minValue={1}
                                maxValue={10}
                                value={field.value ? [field.value] : [7]}
                                onChange={value =>
                                  field.onChange(Array.isArray(value) ? value[0] : value)
                                }
                                className="max-w-md"
                                color="success"
                              />
                              <p className="text-xs text-foreground-600">
                                How much did you enjoy this workout?
                              </p>
                            </div>
                          )}
                        />
                      </>
                    )}
                  </div>
                </Tab>

                <Tab
                  key="environment"
                  title={
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🌤️</span>
                      Environment
                    </div>
                  }
                >
                  <div className="space-y-6 py-4">
                    {watchedStatus === 'completed' && (
                      <>
                        {/* Weather conditions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Controller
                            name="temperature"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Input
                                {...field}
                                type="number"
                                label="Temperature"
                                placeholder="e.g., 65"
                                min="-40"
                                max="130"
                                value={field.value?.toString() || ''}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={<span className="text-sm">🌡️</span>}
                                endContent={<span className="text-sm text-default-400">°F</span>}
                              />
                            )}
                          />

                          <Controller
                            name="humidity"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Input
                                {...field}
                                type="number"
                                label="Humidity"
                                placeholder="e.g., 65"
                                min="0"
                                max="100"
                                value={field.value?.toString() || ''}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={<span className="text-sm">💧</span>}
                                endContent={<span className="text-sm text-default-400">%</span>}
                              />
                            )}
                          />

                          <Controller
                            name="windConditions"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Select
                                label="Wind Conditions"
                                selectedKeys={field.value ? [field.value] : []}
                                onSelectionChange={keys => {
                                  const selectedWind = Array.from(keys)[0] as
                                    | 'none'
                                    | 'light'
                                    | 'moderate'
                                    | 'strong'
                                    | 'very_strong'
                                    | ''
                                  field.onChange(selectedWind || undefined)
                                }}
                                placeholder="Select wind..."
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                items={[
                                  { id: 'none', name: 'None' },
                                  { id: 'light', name: 'Light Breeze' },
                                  { id: 'moderate', name: 'Moderate' },
                                  { id: 'strong', name: 'Strong' },
                                  { id: 'very_strong', name: 'Very Strong' },
                                ]}
                              >
                                {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                              </Select>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </Tab>

                <Tab
                  key="notes"
                  title={
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Notes & Recovery
                    </div>
                  }
                >
                  <div className="space-y-6 py-4">
                    {/* Recovery metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Controller
                        name="energyLevel"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-warning" />
                              <label className="text-sm font-medium">Energy Level</label>
                              {field.value && (
                                <Badge color="warning" size="sm">
                                  {field.value}/10
                                </Badge>
                              )}
                            </div>
                            <Slider
                              size="sm"
                              step={1}
                              minValue={1}
                              maxValue={10}
                              value={field.value ? [field.value] : [7]}
                              onChange={value =>
                                field.onChange(Array.isArray(value) ? value[0] : value)
                              }
                              className="max-w-md"
                              color="warning"
                            />
                            <p className="text-xs text-foreground-600">
                              How energetic did you feel?
                            </p>
                          </div>
                        )}
                      />

                      <Controller
                        name="sleepQuality"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">😴</span>
                              <label className="text-sm font-medium">Sleep Quality</label>
                              {field.value && (
                                <Badge color="primary" size="sm">
                                  {field.value}/10
                                </Badge>
                              )}
                            </div>
                            <Slider
                              size="sm"
                              step={1}
                              minValue={1}
                              maxValue={10}
                              value={field.value ? [field.value] : [7]}
                              onChange={value =>
                                field.onChange(Array.isArray(value) ? value[0] : value)
                              }
                              className="max-w-md"
                              color="primary"
                            />
                            <p className="text-xs text-foreground-600">
                              How well did you sleep last night?
                            </p>
                          </div>
                        )}
                      />
                    </div>

                    {/* Notes sections */}
                    <Controller
                      name="workoutNotes"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Textarea
                          {...field}
                          label="Workout Notes"
                          rows={4}
                          placeholder="How did the workout feel? Any observations, splits, or highlights..."
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                          description="Detailed notes about your performance and experience"
                        />
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        name="nutritionNotes"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Textarea
                            {...field}
                            label="Nutrition & Fueling"
                            rows={3}
                            placeholder="What did you eat/drink before, during, after..."
                            isInvalid={!!fieldState.error}
                            errorMessage={fieldState.error?.message}
                          />
                        )}
                      />

                      <Controller
                        name="gearNotes"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Textarea
                            {...field}
                            label="Gear & Equipment"
                            rows={3}
                            placeholder="Shoes, clothing, any gear issues or notes..."
                            isInvalid={!!fieldState.error}
                            errorMessage={fieldState.error?.message}
                          />
                        )}
                      />
                    </div>

                    <Controller
                      name="injuryNotes"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Textarea
                          {...field}
                          label="Injury & Recovery Notes"
                          rows={2}
                          placeholder="Any aches, pains, soreness, or recovery observations..."
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      )}
                    />
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>

            <ModalFooter className="gap-3">
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting || formState.loading}
                startContent={<Save className="h-4 w-4" />}
              >
                {isSubmitting || formState.loading ? 'Saving...' : 'Save Workout'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    )
  }
)

EnhancedWorkoutLogModal.displayName = 'EnhancedWorkoutLogModal'

export default EnhancedWorkoutLogModal
