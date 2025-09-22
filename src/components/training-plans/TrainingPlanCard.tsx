'use client'

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Progress,
} from '@heroui/react'
import {
  CalendarIcon,
  EllipsisVerticalIcon,
  FlagIcon,
  MapPinIcon,
  Target,
  TrendingUpIcon,
  UserIcon,
} from 'lucide-react'

import { memo, useCallback, useState } from 'react'

import Link from 'next/link'

import ConfirmModal from '@/components/ui/ConfirmModal'
import { useTrainingPlansActions } from '@/hooks/useTrainingPlansActions'
import { createLogger } from '@/lib/logger'
import type { Race, TrainingPlan, User } from '@/lib/supabase'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('TrainingPlanCard')

// Helper functions moved outside component for better performance
const getStatusColor = (archived: boolean) => {
  return archived ? 'default' : 'primary'
}

const getPhaseColor = (phase: string) => {
  switch (phase?.toLowerCase()) {
    case 'base':
      return 'success' // Zone 1 color
    case 'build':
      return 'primary' // Zone 2 color
    case 'peak':
      return 'danger' // Zone 4 color
    case 'taper':
      return 'secondary' // Zone 5 color
    case 'recovery':
      return 'warning' // Zone 3 color
    default:
      return 'default'
  }
}

const getGoalTypeColor = (goalType: string) => {
  switch (goalType?.toLowerCase()) {
    case 'completion':
      return 'success'
    case 'time':
      return 'warning'
    case 'placement':
      return 'danger'
    default:
      return 'default'
  }
}

interface TrainingPlanCardProps {
  plan: TrainingPlan & { runners?: User; coaches?: User; race?: Race }
  userRole: 'runner' | 'coach'
  onArchiveChange?: () => void
}

function TrainingPlanCard({ plan, userRole, onArchiveChange }: TrainingPlanCardProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { archiveTrainingPlan, deleteTrainingPlan } = useTrainingPlansActions()

  const handleArchiveToggle = useCallback(async () => {
    setIsArchiving(true)
    try {
      logger.info('Toggling archive status for training plan:', {
        planId: plan.id,
        currentArchived: plan.archived,
      })
      await archiveTrainingPlan(plan.id)
      onArchiveChange?.()
      logger.info('Successfully toggled archive status')

      // Show success toast
      if (plan.archived) {
        commonToasts.trainingPlanRestored() // Plan was restored
      } else {
        commonToasts.trainingPlanArchived() // Plan was archived
      }
    } catch (error) {
      logger.error('Error toggling archive status:', error)
      commonToasts.trainingPlanError('Failed to update training plan')
    } finally {
      setIsArchiving(false)
    }
  }, [plan.id, plan.archived, archiveTrainingPlan, onArchiveChange])

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true)
    try {
      logger.info('Deleting training plan:', { planId: plan.id, planTitle: plan.title })
      await deleteTrainingPlan(plan.id)
      onArchiveChange?.()
      logger.info('Successfully deleted training plan')

      // Show success toast
      commonToasts.trainingPlanDeleted()
    } catch (error) {
      logger.error('Error deleting training plan:', error)
      commonToasts.trainingPlanError('Failed to delete training plan')
    } finally {
      setIsDeleting(false)
    }
  }, [plan.id, plan.title, deleteTrainingPlan, onArchiveChange])

  return (
    <Card
      className={`hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-l-4 ${plan.archived ? 'border-l-default-300 opacity-60' : 'border-l-primary'} h-full flex flex-col`}
      isPressable={false}
    >
      <CardHeader className="flex justify-between items-start pb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-1">🏔️ {plan.title}</h3>
          {plan.description && (
            <p className="text-sm text-foreground/70 mb-2 line-clamp-2">{plan.description}</p>
          )}

          {/* Status and Phase Row */}
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <Chip
              color={getStatusColor(plan.archived)}
              size="sm"
              variant="flat"
              className="capitalize"
            >
              {plan.archived ? 'Archived' : 'Active'}
            </Chip>
            {plan.current_phase && (
              <Chip
                color={getPhaseColor(plan.current_phase)}
                size="sm"
                variant="dot"
                className="capitalize"
                startContent={<TrendingUpIcon className="w-3 h-3" />}
              >
                {plan.current_phase}
              </Chip>
            )}
            {plan.goal_type && (
              <Chip
                color={getGoalTypeColor(plan.goal_type)}
                size="sm"
                variant="flat"
                className="capitalize"
                startContent={<Target className="w-3 h-3" />}
              >
                {plan.goal_type.replaceAll('_', ' ')}
              </Chip>
            )}
          </div>
        </div>

        {userRole === 'coach' && (
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="hover:bg-default-100"
                aria-label="Training plan actions"
                aria-haspopup="menu"
              >
                <EllipsisVerticalIcon className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              onAction={key => {
                if (key === 'archive') {
                  handleArchiveToggle()
                } else if (key === 'delete') {
                  handleDeleteClick()
                }
                // Edit and duplicate actions can be handled later
              }}
              disabledKeys={isArchiving || isDeleting ? ['archive', 'delete'] : []}
            >
              <DropdownItem key="edit">Edit Plan</DropdownItem>
              <DropdownItem key="duplicate">Duplicate</DropdownItem>
              <DropdownItem key="archive" color="warning">
                {isArchiving ? 'Updating...' : plan.archived ? 'Restore Plan' : 'Archive Plan'}
              </DropdownItem>
              <DropdownItem key="delete" color="danger">
                {isDeleting ? 'Deleting...' : 'Delete Plan'}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </CardHeader>

      <CardBody className="py-2 flex-1">
        <div className="space-y-4">
          {/* Prominent Race Information */}
          {plan.race ? (
            <Card className="border border-success/20 bg-success/5">
              <CardBody className="p-3">
                <div className="flex items-center gap-3">
                  <FlagIcon className="w-5 h-5 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground mb-1 truncate">{plan.race.name}</p>
                    <div className="flex items-center gap-3 text-xs text-foreground/70">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{new Date(plan.race.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3" />
                        <span>{plan.race.distance_type || 'Ultra'}</span>
                      </div>
                      {plan.race.location && <span className="truncate">{plan.race.location}</span>}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card className="border border-default-200 bg-default-50">
              <CardBody className="p-3">
                <div className="flex items-center gap-3">
                  <FlagIcon className="w-5 h-5 text-default-400 shrink-0" />
                  <div className="text-foreground/60">
                    <p className="text-sm font-medium">No Target Race</p>
                    <p className="text-xs">No race has been linked to this plan</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Progress Bar */}
          {plan.progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Training Progress</span>
                <span className="font-semibold">
                  {Math.round(Math.max(0, Math.min(100, Number(plan.progress) || 0)))}% Complete
                </span>
              </div>
              <Progress
                value={Math.max(0, Math.min(100, Number(plan.progress) || 0))}
                color="primary"
                className="h-2"
                classNames={{
                  indicator: 'bg-primary',
                }}
              />
            </div>
          )}

          {/* Coach/Runner Information */}
          {((userRole === 'coach' && plan.runners) || (userRole === 'runner' && plan.coaches)) && (
            <Card className="border border-secondary/20 bg-secondary/5">
              <CardBody className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={
                      userRole === 'coach'
                        ? plan.runners?.full_name || 'Runner'
                        : plan.coaches?.full_name || 'Coach'
                    }
                    size="sm"
                    className="bg-secondary text-white shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon className="w-3 h-3 text-secondary" />
                      <span className="text-xs font-medium text-secondary uppercase">
                        {userRole === 'coach' ? 'Athlete' : 'Coach'}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground truncate">
                      {userRole === 'coach'
                        ? plan.runners?.full_name || 'Unknown Runner'
                        : plan.coaches?.full_name || 'Unknown Coach'}
                    </p>
                    <p className="text-xs text-foreground/70 truncate">
                      {userRole === 'coach' ? plan.runners?.email : plan.coaches?.email}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </CardBody>

      <CardFooter className="pt-4 mt-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3">
          <Button
            as={Link}
            href={`/training-plans/${plan.id}`}
            color="primary"
            variant="flat"
            size="md"
            className="font-medium w-full sm:w-auto"
            startContent={<CalendarIcon className="w-4 h-4" />}
          >
            View Training Plan
          </Button>
          <div className="text-xs text-foreground/50 text-center sm:text-right">
            {plan.weeks_remaining ? `${plan.weeks_remaining} weeks left` : 'Completed'}
          </div>
        </div>
      </CardFooter>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Training Plan"
        message="Are you sure you want to delete this training plan? This action cannot be undone."
        confirmText="Delete Plan"
        cancelText="Cancel"
        confirmColor="danger"
        isLoading={isDeleting}
      />
    </Card>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(TrainingPlanCard)
