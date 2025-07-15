'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea } from '@heroui/react'

interface AddWorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  trainingPlanId: string
}

export default function AddWorkoutModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  trainingPlanId
}: AddWorkoutModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    plannedType: '',
    plannedDistance: '',
    plannedDuration: '',
    notes: '',
    category: '' as 'easy' | 'tempo' | 'interval' | 'long_run' | 'race_simulation' | 'recovery' | 'strength' | 'cross_training' | 'rest' | '',
    intensity: '',
    terrain: '' as 'road' | 'trail' | 'track' | 'treadmill' | '',
    elevationGain: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainingPlanId,
          date: formData.date,
          plannedType: formData.plannedType,
          plannedDistance: formData.plannedDistance ? parseFloat(formData.plannedDistance) : null,
          plannedDuration: formData.plannedDuration ? parseInt(formData.plannedDuration) : null,
          notes: formData.notes,
          category: formData.category || null,
          intensity: formData.intensity ? parseInt(formData.intensity) : null,
          terrain: formData.terrain || null,
          elevationGain: formData.elevationGain ? parseInt(formData.elevationGain) : null,
        }),
      })

      if (response.ok) {
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
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add workout')
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
        <ModalHeader>Add Workout</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
              onSelectionChange={(keys) => {
                const selectedType = Array.from(keys).join('');
                setFormData(prev => ({ ...prev, plannedType: selectedType }));
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
                const selectedTerrain = Array.from(keys).join('') as 'road' | 'trail' | 'track' | 'treadmill' | '';
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