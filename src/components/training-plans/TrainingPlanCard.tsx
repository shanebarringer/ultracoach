import { useState } from 'react'
import Link from 'next/link'
import type { TrainingPlan, User } from '@/lib/supabase'

interface TrainingPlanCardProps {
  plan: TrainingPlan & { runners?: User; coaches?: User }
  userRole: 'runner' | 'coach'
  onArchiveChange?: () => void
}

export default function TrainingPlanCard({ plan, userRole, onArchiveChange }: TrainingPlanCardProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleArchiveToggle = async () => {
    setIsArchiving(true)
    try {
      const response = await fetch(`/api/training-plans/${plan.id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: !plan.archived
        }),
      })

      if (response.ok) {
        onArchiveChange?.()
        setShowMenu(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update training plan')
      }
    } catch (error) {
      console.error('Error toggling archive status:', error)
      alert('Failed to update training plan')
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this training plan? This action cannot be undone.')) return;
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/training-plans/${plan.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onArchiveChange?.()
        setShowMenu(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete training plan')
      }
    } catch (error) {
      console.error('Error deleting training plan:', error)
      alert('Failed to delete training plan')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col justify-between ${plan.archived ? 'opacity-60' : ''}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{plan.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
          </div>
          <div className="relative ml-4">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button onClick={handleArchiveToggle} disabled={isArchiving || isDeleting} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                      {isArchiving ? 'Updating...' : plan.archived ? 'Restore Plan' : 'Archive Plan'}
                    </button>
                    <button onClick={handleDelete} disabled={isDeleting} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                      {isDeleting ? 'Deleting...' : 'Delete Plan'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {plan.target_race_date && (
            <div>
              <p className="text-xs text-gray-500">Target Race</p>
              <p className="font-medium text-gray-900">{formatDate(plan.target_race_date)}</p>
            </div>
          )}
          {plan.target_race_distance && (
            <div>
              <p className="text-xs text-gray-500">Distance</p>
              <p className="font-medium text-gray-900">{plan.target_race_distance}</p>
            </div>
          )}
        </div>
        {userRole === 'coach' && plan.runners && (
          <div>
            <p className="text-xs text-gray-500">Runner</p>
            <p className="font-medium text-gray-900">{plan.runners.full_name}</p>
          </div>
        )}
        {userRole === 'runner' && plan.coaches && (
          <div>
            <p className="text-xs text-gray-500">Coach</p>
            <p className="font-medium text-gray-900">{plan.coaches.full_name}</p>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-between items-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.archived ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
          {plan.archived ? 'Archived' : 'Active'}
        </span>
        <Link href={`/training-plans/${plan.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View Details &rarr;
        </Link>
      </div>
    </div>
  )
}
