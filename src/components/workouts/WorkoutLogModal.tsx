'use client'

import { useState } from 'react'
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
  const [formData, setFormData] = useState({
    actualType: workout.actual_type || workout.planned_type,
    actualDistance: workout.actual_distance?.toString() || '',
    actualDuration: workout.actual_duration?.toString() || '',
    workoutNotes: workout.workout_notes || '',
    injuryNotes: workout.injury_notes || '',
    status: workout.status
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/workouts/${workout.id}`, {
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
          status: formData.status
        }),
      })

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Log Workout</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="planned">Planned</option>
            </select>
          </div>

          {formData.status === 'completed' && (
            <>
              <div>
                <label htmlFor="actualType" className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Workout Type
                </label>
                <select
                  id="actualType"
                  name="actualType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.actualType}
                  onChange={handleChange}
                >
                  <option value="Easy Run">Easy Run</option>
                  <option value="Long Run">Long Run</option>
                  <option value="Tempo Run">Tempo Run</option>
                  <option value="Interval Training">Interval Training</option>
                  <option value="Fartlek">Fartlek</option>
                  <option value="Hill Training">Hill Training</option>
                  <option value="Recovery Run">Recovery Run</option>
                  <option value="Cross Training">Cross Training</option>
                  <option value="Strength Training">Strength Training</option>
                  <option value="Rest Day">Rest Day</option>
                </select>
              </div>

              <div>
                <label htmlFor="actualDistance" className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Distance (miles)
                </label>
                <input
                  type="number"
                  id="actualDistance"
                  name="actualDistance"
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.actualDistance}
                  onChange={handleChange}
                  placeholder="e.g., 5.5"
                />
              </div>

              <div>
                <label htmlFor="actualDuration" className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Duration (minutes)
                </label>
                <input
                  type="number"
                  id="actualDuration"
                  name="actualDuration"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.actualDuration}
                  onChange={handleChange}
                  placeholder="e.g., 60"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="workoutNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Workout Notes
            </label>
            <textarea
              id="workoutNotes"
              name="workoutNotes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.workoutNotes}
              onChange={handleChange}
              placeholder="How did the workout feel? Any observations..."
            />
          </div>

          <div>
            <label htmlFor="injuryNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Injury Notes
            </label>
            <textarea
              id="injuryNotes"
              name="injuryNotes"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.injuryNotes}
              onChange={handleChange}
              placeholder="Any aches, pains, or injuries to note..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}