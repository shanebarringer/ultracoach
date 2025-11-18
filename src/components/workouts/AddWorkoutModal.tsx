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
import { useSetAtom } from 'jotai'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api-client'
import { workoutsAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('AddWorkoutModal')

interface AddWorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  trainingPlanId?: string // Made optional for standalone workouts
  initialDate?: string // Pre-populate the date field
}

export default function AddWorkoutModal({
  isOpen,
  onClose,
  onSuccess,
  trainingPlanId,
  initialDate,
}: AddWorkoutModalProps) {
  const setWorkouts = useSetAtom(workoutsAtom)
  const [formData, setFormData] = useState({
    date: initialDate || '',
    plannedType: '',
    plannedDistance: '',
    plannedDuration: '',
    notes: '',
    category: '' as
      | 'easy'
      | 'tempo'
      | 'interval'
      | 'long_run'
      | 'race_simulation'
      | 'recovery'
      | 'strength'
      | 'cross_training'
      | 'rest'
      | '',
    intensity: '',
    terrain: '' as 'road' | 'trail' | 'track' | 'treadmill' | '',
    elevationGain: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Update form date when initialDate prop changes
  useEffect(() => {
    if (initialDate && initialDate !== formData.date) {
      setFormData(prev => ({ ...prev, date: initialDate }))
    }
  }, [initialDate, formData.date])

  // Enhanced form reset logic to prevent stale error states
  useEffect(() => {
    if (isOpen) {
      // Reset error state when opening modal
      setError('')

      // Reset form data completely when opening without initial date
      if (!initialDate) {
        setFormData({
          date: '',
          plannedType: '',
          plannedDistance: '',
          plannedDuration: '',
          notes: '',
          category: '' as
            | 'easy'
            | 'tempo'
            | 'interval'
            | 'long_run'
            | 'race_simulation'
            | 'recovery'
            | 'strength'
            | 'cross_training'
            | 'rest'
            | '',
          intensity: '',
          terrain: '' as 'road' | 'trail' | 'track' | 'treadmill' | '',
          elevationGain: '',
        })
      }
    }
  }, [isOpen, initialDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Generate temp ID for optimistic update
    const tempId = `temp-${Date.now()}`

    // Build workout payload
    const workoutPayload = {
      trainingPlanId: trainingPlanId || null,
      date: formData.date,
      plannedType: formData.plannedType,
      plannedDistance: formData.plannedDistance ? parseFloat(formData.plannedDistance) : null,
      plannedDuration: formData.plannedDuration ? parseInt(formData.plannedDuration) : null,
      notes: formData.notes,
      category: formData.category || null,
      intensity: formData.intensity ? parseInt(formData.intensity) : null,
      terrain: formData.terrain || null,
      elevationGain: formData.elevationGain ? parseInt(formData.elevationGain) : null,
    }

    // Create temp workout for optimistic update
    const tempWorkout: Workout = {
      id: tempId,
      user_id: '', // Will be set by server
      training_plan_id: workoutPayload.trainingPlanId || null,
      date: workoutPayload.date,
      planned_type: workoutPayload.plannedType,
      planned_distance: workoutPayload.plannedDistance ?? undefined,
      planned_duration: workoutPayload.plannedDuration ?? undefined,
      workout_notes: workoutPayload.notes,
      category: workoutPayload.category ?? undefined,
      intensity: workoutPayload.intensity ?? undefined,
      terrain: workoutPayload.terrain ?? undefined,
      elevation_gain: workoutPayload.elevationGain ?? undefined,
      status: 'planned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Optional fields set to undefined
      actual_distance: undefined,
      actual_duration: undefined,
      actual_type: undefined,
      injury_notes: undefined,
    }

    logger.debug('Optimistic update: Adding temp workout', { tempId })

    // Optimistically add workout to atom immediately
    setWorkouts(prev => [...prev, tempWorkout])

    try {
      const response = await api.post<{ workout: Workout }>('/api/workouts', workoutPayload)
      const savedWorkout = response.data.workout || (response.data as unknown as Workout)

      logger.debug('API response received, replacing temp ID with real ID', {
        tempId,
        realId: savedWorkout.id,
      })

      // Replace temp workout with real server workout
      setWorkouts(prev => prev.map(w => (w.id === tempId ? savedWorkout : w)))

      setFormData({
        date: '',
        plannedType: '',
        plannedDistance: '',
        plannedDuration: '',
        notes: '',
        category: '',
        intensity: '',
        terrain: '',
        elevationGain: '',
      })

      commonToasts.workoutSaved()

      logger.info('Workout created successfully with optimistic update', {
        workoutId: savedWorkout.id,
      })

      onSuccess()
      onClose()
    } catch (error) {
      // Rollback optimistic update on error
      logger.debug('Rolling back optimistic update due to exception', { tempId, error })
      setWorkouts(prev => prev.filter(w => w.id !== tempId))

      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred. Please try again.'
      setError(errorMessage)
      commonToasts.workoutError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>Add Workout</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm">
                {error}
              </div>
            )}

            <Input
              type="date"
              label="Date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
            />

            <Select
              label="Workout Type"
              name="plannedType"
              required
              selectedKeys={formData.plannedType ? [formData.plannedType] : []}
              onSelectionChange={keys => {
                const keyArray = Array.from(keys)
                if (keyArray.length > 0 && typeof keyArray[0] === 'string') {
                  const selectedType = keyArray[0]
                  setFormData(prev => ({ ...prev, plannedType: selectedType }))
                }
              }}
              placeholder="Select type..."
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

            <Select
              label="Category"
              name="category"
              selectedKeys={formData.category ? [formData.category] : []}
              onSelectionChange={keys => {
                const keyArray = Array.from(keys)
                if (keyArray.length > 0 && typeof keyArray[0] === 'string') {
                  const selectedCategory = keyArray[0] as
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
                  setFormData(prev => ({ ...prev, category: selectedCategory }))
                }
              }}
              placeholder="Select category..."
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

            <Input
              type="number"
              label="Intensity (1-10)"
              name="intensity"
              min="1"
              max="10"
              value={formData.intensity}
              onChange={handleChange}
              placeholder="e.g., 7"
            />

            <Select
              label="Terrain"
              name="terrain"
              selectedKeys={formData.terrain ? [formData.terrain] : []}
              onSelectionChange={keys => {
                const keyArray = Array.from(keys)
                if (keyArray.length > 0 && typeof keyArray[0] === 'string') {
                  const selectedTerrain = keyArray[0] as
                    | 'road'
                    | 'trail'
                    | 'track'
                    | 'treadmill'
                    | ''
                  setFormData(prev => ({ ...prev, terrain: selectedTerrain }))
                }
              }}
              placeholder="Select terrain..."
              items={[
                { id: 'road', name: 'Road' },
                { id: 'trail', name: 'Trail' },
                { id: 'track', name: 'Track' },
                { id: 'treadmill', name: 'Treadmill' },
              ]}
            >
              {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
            </Select>

            <Input
              type="number"
              label="Elevation Gain (feet)"
              name="elevationGain"
              min="0"
              value={formData.elevationGain}
              onChange={handleChange}
              placeholder="e.g., 500"
            />

            <Input
              type="number"
              label="Planned Distance (miles)"
              name="plannedDistance"
              step="0.1"
              min="0"
              value={formData.plannedDistance}
              onChange={handleChange}
              placeholder="e.g., 5.5"
            />

            <Input
              type="number"
              label="Planned Duration (minutes)"
              name="plannedDuration"
              min="0"
              value={formData.plannedDuration}
              onChange={handleChange}
              placeholder="e.g., 60"
            />

            <Textarea
              label="Notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional workout instructions or notes..."
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Workout'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
