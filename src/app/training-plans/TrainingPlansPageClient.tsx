'use client'

import { useAtom } from 'jotai'

import React, { Suspense, useEffect } from 'react'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import CreateTrainingPlanModal from '@/components/training-plans/CreateTrainingPlanModal'
import TrainingPlanCard from '@/components/training-plans/TrainingPlanCard'
import { useRefreshableTrainingPlans } from '@/hooks/useRefreshableTrainingPlans'
import { filteredTrainingPlansAtom, trainingPlansLoadableAtom, uiStateAtom } from '@/lib/atoms'
import type { TrainingPlan } from '@/lib/supabase'
import type { ServerSession } from '@/utils/auth-server'

interface Props {
  user: ServerSession['user']
}

/**
 * Training Plans Page Client Component
 *
 * Handles training plans interactivity and state management.
 * Receives authenticated user data from Server Component parent.
 */
export default function TrainingPlansPageClient({ user }: Props) {
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const [filteredPlans] = useAtom(filteredTrainingPlansAtom)
  const [trainingPlansLoadable] = useAtom(trainingPlansLoadableAtom)

  // Initialize the refreshable training plans
  const { refreshTrainingPlans } = useRefreshableTrainingPlans()

  // Trigger initial fetch on mount
  useEffect(() => {
    refreshTrainingPlans()
  }, [refreshTrainingPlans])

  // Get plans and loading state from loadable
  const getPlans = () => {
    if (trainingPlansLoadable.state === 'hasData') {
      const plans = trainingPlansLoadable.data || []
      return uiState.showArchived ? plans : (plans as TrainingPlan[]).filter(p => !p.archived)
    }
    return filteredPlans // Fallback
  }

  const isLoading = trainingPlansLoadable.state === 'loading'
  const hasError = trainingPlansLoadable.state === 'hasError'

  const handleCreateSuccess = () => {
    // Refresh training plans and close modal
    refreshTrainingPlans()
    setUiState(prev => ({ ...prev, showCreateTrainingPlan: false }))
  }

  const handleArchiveChange = () => {
    // Refresh training plans to show updated archive status
    refreshTrainingPlans()
  }

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Training Plans</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {user.role === 'coach'
                  ? 'Manage training plans for your runners'
                  : 'View your training plans and progress'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={uiState.showArchived}
                    onChange={e =>
                      setUiState(prev => ({ ...prev, showArchived: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Show archived
                  </span>
                </label>
              </div>

              <button
                onClick={refreshTrainingPlans}
                className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
              >
                Refresh
              </button>

              {user.role === 'coach' && (
                <button
                  onClick={() => setUiState(prev => ({ ...prev, showCreateTrainingPlan: true }))}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Create New Plan
                </button>
              )}
            </div>
          </div>

          {/* Training Plans Display */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : hasError ? (
            <div className="text-center py-12">
              <div className="text-red-600 dark:text-red-400">
                Error loading training plans. Please try refreshing.
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
              }
            >
              {getPlans().length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {uiState.showArchived ? 'No archived training plans' : 'No training plans'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {uiState.showArchived
                      ? 'No training plans have been archived yet.'
                      : user.role === 'coach'
                        ? 'Get started by creating your first training plan.'
                        : 'No training plans have been created for you yet.'}
                  </p>
                  {user.role === 'coach' && (
                    <div className="mt-6">
                      <button
                        onClick={() =>
                          setUiState(prev => ({ ...prev, showCreateTrainingPlan: true }))
                        }
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        Create Training Plan
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getPlans().map((plan: TrainingPlan) => (
                    <TrainingPlanCard
                      key={plan.id}
                      plan={plan}
                      userRole={user.role as 'runner' | 'coach'}
                      onArchiveChange={handleArchiveChange}
                    />
                  ))}
                </div>
              )}
            </Suspense>
          )}

          <CreateTrainingPlanModal
            isOpen={uiState.showCreateTrainingPlan}
            onClose={() => setUiState(prev => ({ ...prev, showCreateTrainingPlan: false }))}
            onSuccess={handleCreateSuccess}
          />
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
