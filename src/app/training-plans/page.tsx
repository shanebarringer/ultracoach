'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import CreateTrainingPlanModal from '@/components/training-plans/CreateTrainingPlanModal'
import TrainingPlanCard from '@/components/training-plans/TrainingPlanCard'
import type { TrainingPlan, User } from '@/lib/supabase'

type TrainingPlanWithUsers = TrainingPlan & { runners?: User; coaches?: User }

export default function TrainingPlansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlanWithUsers[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const fetchTrainingPlans = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/training-plans')
      
      if (!response.ok) {
        console.error('Failed to fetch training plans:', response.statusText)
        return
      }

      const data = await response.json()
      setTrainingPlans(data.trainingPlans || [])
    } catch (error) {
      console.error('Error fetching training plans:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchTrainingPlans()
  }, [session, status, router, fetchTrainingPlans])

  const handleCreateSuccess = () => {
    fetchTrainingPlans()
  }

  const handleArchiveChange = () => {
    fetchTrainingPlans()
  }

  const filteredPlans = trainingPlans.filter(plan => 
    showArchived ? plan.archived : !plan.archived
  )

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Plans</h1>
            <p className="text-gray-600 mt-1">
              {session.user.role === 'coach' 
                ? 'Manage training plans for your runners'
                : 'View your training plans and progress'
              }
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show archived</span>
              </label>
            </div>
            
            {session.user.role === 'coach' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create New Plan
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {showArchived ? 'No archived training plans' : 'No training plans'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {showArchived 
                ? 'No training plans have been archived yet.'
                : session.user.role === 'coach' 
                  ? 'Get started by creating your first training plan.'
                  : 'No training plans have been created for you yet.'
              }
            </p>
            {session.user.role === 'coach' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Training Plan
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <TrainingPlanCard
                key={plan.id}
                plan={plan}
                userRole={session.user.role}
                onArchiveChange={handleArchiveChange}
              />
            ))}
          </div>
        )}

        <CreateTrainingPlanModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </Layout>
  )
}