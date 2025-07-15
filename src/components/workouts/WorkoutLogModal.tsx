'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea } from '@heroui/react'
import { useAtom } from 'jotai'
import { workoutLogFormAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

interface WorkoutLogModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  workout: Workout
}

export default function WorkoutLogModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  workout
}: WorkoutLogModalProps) {
  const [formData, setFormData] = useAtom(workoutLogFormAtom)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFormData({
      actualType: workout.actual_type || workout.planned_type,
      actualDistance: workout.actual_distance?.toString() || '',
      actualDuration: workout.actual_duration?.toString() || '',
      workoutNotes: workout.workout_notes || '',
      injuryNotes: workout.injury_notes || '',
      status: workout.status,
      category: workout.category || '',
      intensity: workout.intensity?.toString() || '',
      terrain: workout.terrain || '',
      elevationGain: workout.elevation_gain?.toString() || '',
    })
  }, [workout, setFormData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/workouts/${workout.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actualType: formData.actualType,
            actualDistance: formData.actualDistance ? parseFloat(formData.actualDistance) : null,
            actualDuration: formData.actualDuration ? parseInt(formData.actualDuration) : null,
            workoutNotes: formData.workoutNotes,
            injuryNotes: formData.injuryNotes,
            status: formData.status,
            category: formData.category || null,
            intensity: formData.intensity ? parseInt(formData.intensity) : null,
            terrain: formData.terrain || null,
            elevation_gain: formData.elevationGain ? parseInt(formData.elevationGain) : null,
          }),
        }
      )

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update workout')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Log Workout</ModalHeader>
        <form onSubmit={handleSubmit}>
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Select
              label="Status"
              name="status"
              required
              selectedKeys={[formData.status]}
              onSelectionChange={(keys) => {
                const selectedStatus = Array.from(keys).join('') as 'completed' | 'skipped' | 'planned';
                setFormData(prev => ({ ...prev, status: selectedStatus }));
              }}
              items={[
                { id: 'completed', name: 'Completed' },
                { id: 'skipped', name: 'Skipped' },
                { id: 'planned', name: 'Planned' },
              ]}
            >
              {(item) => (
                <SelectItem key={item.id}>
                  {item.name}
                </SelectItem>
              )}
            </Select>

            {formData.status === 'completed' && (
              <>
                <Select
                  label="Actual Workout Type"
                  name="actualType"
                  selectedKeys={formData.actualType ? [formData.actualType] : []}
                  onSelectionChange={(keys) => {
                    const selectedType = Array.from(keys).join('');
                    setFormData(prev => ({ ...prev, actualType: selectedType }));
                  }}
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
                  {(item) => (
                    <SelectItem key={item.id}>
                      {item.name}
                    </SelectItem>
                  )}
                </Select>

                <Select
                  label="Category"
                  name="category"
                  selectedKeys={formData.category ? [formData.category] : []}
                  onSelectionChange={(keys) => {
                    const selectedCategory = Array.from(keys).join('') as 'easy' | 'tempo' | 'interval' | 'long_run' | 'race_simulation' | 'recovery' | 'strength' | 'cross_training' | 'rest' | '';
                    setFormData(prev => ({ ...prev, category: selectedCategory }));
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
                  {(item) => (
                    <SelectItem key={item.id}>
                      {item.name}
                    </SelectItem>
                  )}
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
                  onSelectionChange={(keys) => {
                    const selectedTerrain = Array.from(keys)[0] as 'road' | 'trail' | 'track' | 'treadmill' | '';
                    setFormData(prev => ({ ...prev, terrain: selectedTerrain }));
                  }}
                  placeholder="Select terrain..."
                  items={[
                    { id: 'road', name: 'Road' },
                    { id: 'trail', name: 'Trail' },
                    { id: 'track', name: 'Track' },
                    { id: 'treadmill', name: 'Treadmill' },
                  ]}
                >
                  {(item) => (
                    <SelectItem key={item.id}>
                      {item.name}
                    </SelectItem>
                  )}
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
                  label="Actual Distance (miles)"
                  name="actualDistance"
                  step="0.1"
                  min="0"
                  value={formData.actualDistance}
                  onChange={handleChange}
                  placeholder="e.g., 5.5"
                />

                <Input
                  type="number"
                  label="Actual Duration (minutes)"
                  name="actualDuration"
                  min="0"
                  value={formData.actualDuration}
                  onChange={handleChange}
                  placeholder="e.g., 60"
                />
              </>
            )}

            <Textarea
              label="Workout Notes"
              name="workoutNotes"
              rows={3}
              value={formData.workoutNotes}
              onChange={handleChange}
              placeholder="How did the workout feel? Any observations..."
            />

            <Textarea
              label="Injury Notes"
              name="injuryNotes"
              rows={2}
              value={formData.injuryNotes}
              onChange={handleChange}
              placeholder="Any aches, pains, or injuries to note..."
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Workout'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}