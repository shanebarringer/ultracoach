'use client'

import { useState, useEffect } from 'react'
import type { Workout } from '@/lib/supabase'

interface AddWorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  runnerId: string
  date: Date
  workout?: Workout | null
}

const WORKOUT_TYPES = [
  'Easy Run',
  'Long Run',
  'Tempo Run',
  'Interval Training',
  'Fartlek',
  'Hill Training',
  'Recovery Run',
  'Cross Training',
  'Strength Training',
  'Rest Day'
]

export default function AddWorkoutModal({ isOpen, onClose, runnerId, date, workout }: AddWorkoutModalProps) {
  const [plannedType, setPlannedType] = useState('')
  const [plannedDistance, setPlannedDistance] = useState<number | string>('')
  const [plannedDuration, setPlannedDuration] = useState<number | string>('')
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (workout) {
      setPlannedType(workout.planned_type || '')
      setPlannedDistance(workout.planned_distance || '')
      setPlannedDuration(workout.planned_duration || '')
      setWorkoutNotes(workout.workout_notes || '')
    } else {
      setPlannedType('Easy Run')
      setPlannedDistance('')
      setPlannedDuration('')
      setWorkoutNotes('')
    }
  }, [workout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const workoutData = {
      runner_id: runnerId,
      date: date.toISOString().split('T')[0],
      planned_type: plannedType,
      planned_distance: plannedDistance ? Number(plannedDistance) : null,
      planned_duration: plannedDuration ? Number(plannedDuration) : null,
      workout_notes: workoutNotes,
      status: 'planned'
    }

    try {
      const url = workout ? `/api/workouts/${workout.id}` : '/api/workouts'
      const method = workout ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutData)
      })

      if (response.ok) {
        onClose()
      } else {
        const error = await response.json()
        alert(`Failed to save workout: ${error.message}`)
      }
    } catch (error) {
      console.error('Error saving workout:', error)
      alert('An unexpected error occurred.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{workout ? 'Edit' : 'Add'} Workout</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Workout Type</label>
            <select value={plannedType} onChange={e => setPlannedType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              {WORKOUT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Planned Distance (miles)</label>
            <input type="number" value={plannedDistance} onChange={e => setPlannedDistance(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Planned Duration (minutes)</label>
            <input type="number" value={plannedDuration} onChange={e => setPlannedDuration(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea value={workoutNotes} onChange={e => setWorkoutNotes(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
