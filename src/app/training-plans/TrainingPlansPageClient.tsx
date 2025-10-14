'use client'

import { Button, Card, CardBody, CardHeader, Checkbox } from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Calendar, Mountain, Plus, RefreshCw } from 'lucide-react'

import React, { useCallback, useMemo } from 'react'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import CreateTrainingPlanModal from '@/components/training-plans/CreateTrainingPlanModal'
import TrainingPlanCard from '@/components/training-plans/TrainingPlanCard'
import { useHydrateTrainingPlans } from '@/hooks/useTrainingPlans'
import { refreshTrainingPlansAtom, trainingPlansAtom, uiStateAtom } from '@/lib/atoms/index'
import type { TrainingPlan } from '@/lib/supabase'
import type { ServerSession } from '@/utils/auth-server'

interface Props {
  user: ServerSession['user']
}

/**
 * Training Plans Content (Inner component - handles data hydration)
 *
 * This component is wrapped in Suspense, so useHydrateTrainingPlans() can throw
 * a Promise for loading state. Layout is kept outside Suspense to ensure
 * Header/user-menu always renders.
 */
function TrainingPlansContent({ user }: Props) {
  // Hydrate training plans at entry point - this will trigger Suspense if needed
  useHydrateTrainingPlans()
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const plans = useAtomValue(trainingPlansAtom)
  const refreshPlans = useSetAtom(refreshTrainingPlansAtom)

  // Filter plans based on archived state (don't use derived atom to keep it simple)
  const filteredPlans = useMemo<TrainingPlan[]>(() => {
    const allPlans = Array.isArray(plans) ? plans : []
    return uiState.showArchived ? allPlans : allPlans.filter(p => !p.archived)
  }, [plans, uiState.showArchived])

  const handleCreateSuccess = useCallback(() => {
    // Refresh training plans and close modal
    refreshPlans()
    setUiState(prev => ({ ...prev, showCreateTrainingPlan: false }))
  }, [refreshPlans, setUiState])

  const handleArchiveChange = useCallback(() => {
    // Refresh training plans to show updated archive status
    refreshPlans()
  }, [refreshPlans])

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
    <>
      {/* Hero Section */}
      <Card className="mb-8 bg-content1 border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-4">
            <div className="flex items-center gap-3">
              <Mountain className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  🏔️ Training Expeditions
                </h1>
                <p className="text-foreground/70 mt-1 text-base lg:text-lg">
                  {user.userType === 'coach'
                    ? 'Design summit quests for your athletes'
                    : 'Your personalized path to peak performance'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
                onPress={refreshPlans}
                isIconOnly
                aria-label="Refresh training plans"
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
                  <span className="hidden sm:inline">Create Your First Expedition</span>
                  <span className="sm:hidden">Create Plan</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Training Plans Display - Suspense handles loading automatically */}
      {filteredPlans.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/20">
          <CardBody className="text-center py-16">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {uiState.showArchived ? 'No Archived Expeditions' : 'No Training Expeditions Yet'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredPlans.map((plan: TrainingPlan) => (
            <TrainingPlanCard
              key={plan.id}
              plan={plan}
              userRole={user.userType}
              onArchiveChange={handleArchiveChange}
            />
          ))}
        </div>
      )}

      <CreateTrainingPlanModal
        isOpen={uiState.showCreateTrainingPlan}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
      />
    </>
  )
}

/**
 * Training Plans Page Client Component
 *
 * Follows the dashboard architecture pattern:
 * - Layout is OUTSIDE Suspense (Header/user-menu always visible)
 * - Only content is INSIDE Suspense (loading states don't hide navigation)
 *
 * This ensures consistent behavior across all authenticated pages and
 * prevents test failures where user-menu disappears during loading.
 */
export default function TrainingPlansPageClient({ user }: Props) {
  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TrainingPlansContent user={user} />
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
