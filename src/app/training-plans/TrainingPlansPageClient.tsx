'use client'

import { Button, Card, CardBody, CardHeader, Checkbox } from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { Calendar, Mountain, Plus, RefreshCw } from 'lucide-react'

import React, { Suspense, useCallback, useEffect, useMemo } from 'react'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import CreateTrainingPlanModal from '@/components/training-plans/CreateTrainingPlanModal'
import TrainingPlanCard from '@/components/training-plans/TrainingPlanCard'
import { TrainingPlansPageSkeleton } from '@/components/ui/LoadingSkeletons'
import { useRefreshableTrainingPlans } from '@/hooks/useRefreshableTrainingPlans'
import {
  filteredTrainingPlansAtom,
  trainingPlansLoadableAtom,
  uiStateAtom,
} from '@/lib/atoms/index'
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
  const filteredPlans = useAtomValue(filteredTrainingPlansAtom)
  const trainingPlansLoadable = useAtomValue(trainingPlansLoadableAtom)

  // Initialize the refreshable training plans
  const { refreshTrainingPlans } = useRefreshableTrainingPlans()

  // Trigger initial fetch on mount
  useEffect(() => {
    refreshTrainingPlans()
  }, [refreshTrainingPlans])

  // Get plans and loading state from loadable
  const plansData = trainingPlansLoadable.state === 'hasData' ? trainingPlansLoadable.data : null
  const getPlans = useMemo(() => {
    if (trainingPlansLoadable.state === 'hasData') {
      const plans = Array.isArray(plansData) ? plansData : []
      return uiState.showArchived ? plans : plans.filter(p => !p.archived)
    }
    // Fallback - ensure filteredPlans is an array
    return Array.isArray(filteredPlans) ? filteredPlans : []
  }, [trainingPlansLoadable.state, plansData, uiState.showArchived, filteredPlans])

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
          <Card className="mb-8 bg-content1 border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Mountain className="w-8 h-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">🏔️ Training Expeditions</h1>
                    <p className="text-foreground/70 mt-1 text-lg">
                      {user.userType === 'coach'
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

                  {user.userType === 'coach' && (
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
            <TrainingPlansPageSkeleton />
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
            <Suspense fallback={<TrainingPlansPageSkeleton />}>
              {getPlans.length === 0 ? (
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
                        : user.userType === 'coach'
                          ? 'Start building your first summit quest! Create personalized training expeditions to guide your athletes to peak performance.'
                          : 'Your coach will create customized training expeditions designed specifically for your goals and abilities.'}
                    </p>
                    {user.userType === 'coach' && !uiState.showArchived && (
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
                  {getPlans.map((plan: TrainingPlan) => (
                    <TrainingPlanCard
                      key={plan.id}
                      plan={plan}
                      userRole={user.userType}
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
