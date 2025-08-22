'use client'

import { Button, Card, CardBody, CardHeader, Checkbox, Spinner } from '@heroui/react'
import { useAtom } from 'jotai'
import { Calendar, Mountain, Plus, RefreshCw } from 'lucide-react'

import React, { Suspense, useCallback, useEffect } from 'react'

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

  const handleCreateSuccess = useCallback(() => {
    // Refresh training plans and close modal
    refreshTrainingPlans()
    setUiState(prev => ({ ...prev, showCreateTrainingPlan: false }))
  }, [refreshTrainingPlans, setUiState])

  const handleArchiveChange = useCallback(() => {
    // Refresh training plans to show updated archive status
    refreshTrainingPlans()
  }, [refreshTrainingPlans])

  const handleShowArchivedChange = useCallback(
    (checked: boolean) => {
      setUiState(prev => ({ ...prev, showArchived: checked }))
    },
    [setUiState]
  )

  const handleCreatePlanClick = useCallback(() => {
    setUiState(prev => ({ ...prev, showCreateTrainingPlan: true }))
  }, [setUiState])

  const handleCloseModal = useCallback(() => {
    setUiState(prev => ({ ...prev, showCreateTrainingPlan: false }))
  }, [setUiState])

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <Card className="mb-8 bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Mountain className="w-8 h-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                      🏔️ Training Expeditions
                    </h1>
                    <p className="text-foreground/70 mt-1 text-lg">
                      {user.role === 'coach'
                        ? 'Design summit quests for your athletes'
                        : 'Your personalized path to peak performance'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    isSelected={uiState.showArchived}
                    onValueChange={handleShowArchivedChange}
                    classNames={{
                      label: 'text-sm text-foreground/70',
                    }}
                  >
                    Show archived
                  </Checkbox>

                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={refreshTrainingPlans}
                    isIconOnly
                    className="border-primary/20 hover:border-primary/40"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  {user.role === 'coach' && (
                    <Button
                      color="primary"
                      onPress={handleCreatePlanClick}
                      startContent={<Plus className="h-4 w-4" />}
                      className="bg-primary font-medium"
                    >
                      Create Expedition
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Training Plans Display */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" color="primary" label="Loading your expeditions..." />
            </div>
          ) : hasError ? (
            <Card className="border border-danger/20 bg-danger/5">
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mountain className="w-8 h-8 text-danger" />
                </div>
                <h3 className="text-lg font-semibold text-danger mb-2">
                  Unable to Load Expeditions
                </h3>
                <p className="text-foreground/70 mb-4">
                  There was an error loading your training plans. Please try refreshing.
                </p>
                <Button
                  color="danger"
                  variant="flat"
                  onPress={refreshTrainingPlans}
                  startContent={<RefreshCw className="h-4 w-4" />}
                >
                  Try Again
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-64">
                  <Spinner size="lg" color="primary" label="Loading expeditions..." />
                </div>
              }
            >
              {getPlans().length === 0 ? (
                <Card className="border-dashed border-2 border-primary/20">
                  <CardBody className="text-center py-16">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Calendar className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {uiState.showArchived
                        ? 'No Archived Expeditions'
                        : 'No Training Expeditions Yet'}
                    </h3>
                    <p className="text-foreground/70 mb-6 max-w-md mx-auto">
                      {uiState.showArchived
                        ? 'No training plans have been archived yet. Archive completed expeditions to keep your dashboard organized.'
                        : user.role === 'coach'
                          ? 'Start building your first summit quest! Create personalized training expeditions to guide your athletes to peak performance.'
                          : 'Your coach will create customized training expeditions designed specifically for your goals and abilities.'}
                    </p>
                    {user.role === 'coach' && !uiState.showArchived && (
                      <Button
                        color="primary"
                        size="lg"
                        onPress={handleCreatePlanClick}
                        startContent={<Plus className="h-5 w-5" />}
                        className="bg-primary font-medium"
                      >
                        Create Your First Expedition
                      </Button>
                    )}
                  </CardBody>
                </Card>
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
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
          />
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
