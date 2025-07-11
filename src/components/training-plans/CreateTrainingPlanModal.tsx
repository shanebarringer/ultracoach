'use client'

import { useState } from 'react'

interface CreateTrainingPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateTrainingPlanModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateTrainingPlanModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    runnerEmail: '',
    targetRaceDate: '',
    targetRaceDistance: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/training-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setFormData({
          title: '',
          description: '',
          runnerEmail: '',
          targetRaceDate: '',
          targetRaceDistance: ''
        })
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create training plan')
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
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create Training Plan</h2>
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
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Plan Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., 100-Mile Ultra Training Plan"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the training plan goals and approach..."
            />
          </div>

          <div>
            <label htmlFor="runnerEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Runner Email
            </label>
            <input
              type="email"
              id="runnerEmail"
              name="runnerEmail"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.runnerEmail}
              onChange={handleChange}
              placeholder="runner@example.com"
            />
          </div>

          <div>
            <label htmlFor="targetRaceDate" className="block text-sm font-medium text-gray-700 mb-1">
              Target Race Date
            </label>
            <input
              type="date"
              id="targetRaceDate"
              name="targetRaceDate"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.targetRaceDate}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="targetRaceDistance" className="block text-sm font-medium text-gray-700 mb-1">
              Target Race Distance
            </label>
            <select
              id="targetRaceDistance"
              name="targetRaceDistance"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.targetRaceDistance}
              onChange={handleChange}
            >
              <option value="">Select distance...</option>
              <option value="50K">50K (31 miles)</option>
              <option value="50M">50 Miles</option>
              <option value="100K">100K (62 miles)</option>
              <option value="100M">100 Miles</option>
              <option value="Other">Other</option>
            </select>
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
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}