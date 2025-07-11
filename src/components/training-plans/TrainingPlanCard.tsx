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

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
      plan.archived ? 'opacity-60' : ''
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
            {plan.archived && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Archived
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-gray-500">Created</div>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(plan.created_at)}
            </div>
          </div>
          
          {/* Action Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={handleArchiveToggle}
                      disabled={isArchiving}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {isArchiving 
                        ? 'Updating...'
                        : plan.archived 
                          ? 'Restore Plan' 
                          : 'Archive Plan'
                      }
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {plan.target_race_date && (
          <div>
            <div className="text-xs text-gray-500">Target Race</div>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(plan.target_race_date)}
            </div>
          </div>
        )}
        {plan.target_race_distance && (
          <div>
            <div className="text-xs text-gray-500">Distance</div>
            <div className="text-sm font-medium text-gray-900">
              {plan.target_race_distance}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        {userRole === 'coach' && plan.runners && (
          <div>
            <div className="text-xs text-gray-500">Runner</div>
            <div className="text-sm font-medium text-gray-900">
              {plan.runners.full_name}
            </div>
          </div>
        )}
        {userRole === 'runner' && plan.coaches && (
          <div>
            <div className="text-xs text-gray-500">Coach</div>
            <div className="text-sm font-medium text-gray-900">
              {plan.coaches.full_name}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            plan.archived 
              ? 'bg-gray-100 text-gray-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {plan.archived ? 'Archived' : 'Active'}
          </span>
        </div>
        <Link
          href={`/training-plans/${plan.id}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View Details →
        </Link>
      </div>
    </div>
  )
}