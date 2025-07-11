'use client'

import { useState } from 'react'

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
    notes: ''
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
          notes: formData.notes
        }),
      })

      if (response.ok) {
        setFormData({
          date: '',
          plannedType: '',
          plannedDistance: '',
          plannedDuration: '',
          notes: ''
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add Workout</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="plannedType" className="block text-sm font-medium text-gray-700 mb-1">
              Workout Type
            </label>
            <select
              id="plannedType"
              name="plannedType"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.plannedType}
              onChange={handleChange}
            >
              <option value="">Select type...</option>
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
            <label htmlFor="plannedDistance" className="block text-sm font-medium text-gray-700 mb-1">
              Planned Distance (miles)
            </label>
            <input
              type="number"
              id="plannedDistance"
              name="plannedDistance"
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.plannedDistance}
              onChange={handleChange}
              placeholder="e.g., 5.5"
            />
          </div>

          <div>
            <label htmlFor="plannedDuration" className="block text-sm font-medium text-gray-700 mb-1">
              Planned Duration (minutes)
            </label>
            <input
              type="number"
              id="plannedDuration"
              name="plannedDuration"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.plannedDuration}
              onChange={handleChange}
              placeholder="e.g., 60"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional workout instructions or notes..."
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
              {loading ? 'Adding...' : 'Add Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}