'use client'

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom } from 'jotai'
import { useSetAtom } from 'jotai'
import { z } from 'zod'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import {
  completeWorkoutAtom,
  logWorkoutDetailsAtom,
  skipWorkoutAtom,
  workoutLogFormAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('WorkoutLogModal')

// Zod schema for workout log form validation
const workoutLogSchema = z.object({
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
  terrain: z.enum(['road', 'trail', 'track', 'treadmill']).nullable().optional(),
  elevationGain: z.number().min(0, 'Elevation gain must be positive').nullable().optional(),
  actualDistance: z.number().min(0, 'Distance must be positive').nullable().optional(),
  actualDuration: z.number().min(0, 'Duration must be positive').nullable().optional(),
  workoutNotes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  injuryNotes: z.string().max(500, 'Injury notes must be less than 500 characters').optional(),
})

type WorkoutLogForm = z.infer<typeof workoutLogSchema>

interface WorkoutLogModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  workout: Workout
  defaultToComplete?: boolean
}

export default function WorkoutLogModal({
  isOpen,
  onClose,
  onSuccess,
  workout,
  defaultToComplete = false,
}: WorkoutLogModalProps) {
  const [formState, setFormState] = useAtom(workoutLogFormAtom)
  const completeWorkout = useSetAtom(completeWorkoutAtom)
  const logWorkoutDetails = useSetAtom(logWorkoutDetailsAtom)
  const skipWorkout = useSetAtom(skipWorkoutAtom)

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<WorkoutLogForm>({
    resolver: zodResolver(workoutLogSchema),
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
    },
  })

  const watchedStatus = watch('status')

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
    }
  }, [workout, isOpen, reset, defaultToComplete])

  const onSubmit = async (data: WorkoutLogForm) => {
    setFormState(prev => ({ ...prev, loading: true, error: '' }))

    try {
      // Build the payload for the API
      const payload = {
        actual_type: data.actualType,
        actual_distance: data.actualDistance,
        actual_duration: data.actualDuration,
        workout_notes: data.workoutNotes,
        injury_notes: data.injuryNotes,
        category: data.category,
        intensity: data.intensity,
        terrain: data.terrain,
        elevation_gain: data.elevationGain,
      }

      logger.info('Submitting workout log update:', {
        workoutId: workout.id,
        status: data.status,
        payload,
      })

      // Use the appropriate atom based on status
      if (data.status === 'skipped') {
        await skipWorkout(workout.id)
      } else if (data.status === 'completed') {
        // If we have actual data, use the log details atom, otherwise just mark complete
        const hasActualData = data.actualDistance || data.actualDuration || data.workoutNotes
        if (hasActualData) {
          await logWorkoutDetails({ workoutId: workout.id, data: payload })
        } else {
          await completeWorkout({ workoutId: workout.id, data: {} })
        }
      } else {
        // For 'planned' status, just update the workout with the API directly
        const response = await fetch(`/api/workouts/${workout.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...payload, status: 'planned' }),
        })

        if (!response.ok) {
          throw new Error('Failed to update workout')
        }
      }

      logger.info('Workout updated successfully')
      setFormState(prev => ({ ...prev, loading: false, error: '' }))
      reset() // Reset form with react-hook-form
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error updating workout:', error)
      setFormState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred. Please try again.',
      }))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>Log Workout</ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Planned Workout</h3>
              <p className="text-sm text-gray-600">
                {workout.planned_type}
                {workout.planned_distance && ` • ${workout.planned_distance} miles`}
                {workout.planned_duration && ` • ${workout.planned_duration} min`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(workout.date).toLocaleDateString()}
              </p>
            </div>

            {formState.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm">
                {formState.error}
              </div>
            )}

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
                        { id: 'Rest Day', name: 'Rest Day' },
                      ]}
                    >
                      {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                    </Select>
                  )}
                />

                <Controller
                  name="category"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Select
                      label="Category"
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={keys => {
                        const selectedCategory = Array.from(keys).join('') as
                          | 'easy'
                          | 'tempo'
                          | 'interval'
                          | 'long_run'
                          | 'race_simulation'
                          | 'recovery'
                          | 'strength'
                          | 'cross_training'
                          | 'rest'
                          | ''
                        field.onChange(selectedCategory || undefined)
                      }}
                      placeholder="Select category..."
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      items={[
                        { id: 'easy', name: 'Easy' },
                        { id: 'tempo', name: 'Tempo' },
                        { id: 'interval', name: 'Interval' },
                        { id: 'long_run', name: 'Long Run' },
                        { id: 'race_simulation', name: 'Race Simulation' },
                        { id: 'recovery', name: 'Recovery' },
                        { id: 'strength', name: 'Strength' },
                        { id: 'cross_training', name: 'Cross Training' },
                        { id: 'rest', name: 'Rest' },
                      ]}
                    >
                      {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                    </Select>
                  )}
                />

                <Controller
                  name="intensity"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Intensity (1-10)"
                      min="1"
                      max="10"
                      value={field.value?.toString() || ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="e.g., 7"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                    />
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

                <Controller
                  name="elevationGain"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Elevation Gain (feet)"
                      min="0"
                      value={field.value?.toString() || ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="e.g., 500"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  name="actualDistance"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Actual Distance (miles)"
                      step="0.1"
                      min="0"
                      value={field.value?.toString() || ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="e.g., 5.5"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
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
                      label="Actual Duration (minutes)"
                      min="0"
                      value={field.value?.toString() || ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="e.g., 60"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                    />
                  )}
                />
              </>
            )}

            <Controller
              name="workoutNotes"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  {...field}
                  label="Workout Notes"
                  rows={3}
                  placeholder="How did the workout feel? Any observations..."
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="injuryNotes"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  {...field}
                  label="Injury Notes"
                  rows={2}
                  placeholder="Any aches, pains, or injuries to note..."
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting || formState.loading}>
              {isSubmitting || formState.loading ? 'Saving...' : 'Save Workout'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
