import { CalendarIcon, EllipsisHorizontalIcon, MapPinIcon } from '@heroicons/react/24/outline'
import {
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

import { memo, useCallback, useState } from 'react'

import Link from 'next/link'

import { useTrainingPlansActions } from '@/hooks/useTrainingPlansActions'
import { createLogger } from '@/lib/logger'
import type { Race, TrainingPlan, User } from '@/lib/supabase'

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
    } catch (error) {
      logger.error('Error toggling archive status:', error)
      alert('Failed to update training plan')
    } finally {
      setIsArchiving(false)
    }
  }, [plan.id, plan.archived, archiveTrainingPlan, onArchiveChange])

  const handleDelete = useCallback(async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this training plan? This action cannot be undone.'
      )
    )
      return
    setIsDeleting(true)
    try {
      logger.info('Deleting training plan:', { planId: plan.id, planTitle: plan.title })
      await deleteTrainingPlan(plan.id)
      onArchiveChange?.()
      logger.info('Successfully deleted training plan')
    } catch (error) {
      logger.error('Error deleting training plan:', error)
      alert('Failed to delete training plan')
    } finally {
      setIsDeleting(false)
    }
  }, [plan.id, plan.title, deleteTrainingPlan, onArchiveChange])

  return (
    <Card
      className={`hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-t-4 border-t-primary/60 ${plan.archived ? 'opacity-60' : ''}`}
      isPressable={false}
    >
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-foreground">{plan.title}</h3>
          {plan.race && <p className="text-sm text-foreground-500">{plan.race.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Chip
            color={getStatusColor(plan.archived)}
            size="sm"
            variant="flat"
            className="capitalize"
          >
            {plan.archived ? 'Archived' : 'Active'}
          </Chip>
          {userRole === 'coach' && (
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly size="sm" variant="light" className="hover:bg-default-100">
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem key="edit">Edit Plan</DropdownItem>
                <DropdownItem key="duplicate">Duplicate</DropdownItem>
                <DropdownItem
                  key="archive"
                  color="warning"
                  onClick={handleArchiveToggle}
                  isDisabled={isArchiving || isDeleting}
                >
                  {isArchiving ? 'Updating...' : plan.archived ? 'Restore Plan' : 'Archive Plan'}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  color="danger"
                  onClick={handleDelete}
                  isDisabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Plan'}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </CardHeader>

      <CardBody className="py-4">
        <div className="space-y-4">
          {/* Race Information */}
          {plan.race && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-foreground-600">
                <CalendarIcon className="w-4 h-4" />
                <span>{new Date(plan.race.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1 text-foreground-600">
                <MapPinIcon className="w-4 h-4" />
                <span>{plan.race.distance || 'Ultra'}</span>
              </div>
            </div>
          )}

          {/* Current Phase */}
          {plan.current_phase && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-600">Current Phase:</span>
              <Chip
                color={getPhaseColor(plan.current_phase)}
                size="sm"
                variant="dot"
                className="capitalize"
              >
                {plan.current_phase}
              </Chip>
            </div>
          )}

          {/* Progress */}
          {plan.progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-600">Progress</span>
                <span className="font-medium">{plan.progress}% Complete</span>
              </div>
              <Progress
                value={plan.progress}
                color="primary"
                className="h-2"
                classNames={{
                  indicator: 'bg-gradient-to-r from-primary to-secondary',
                }}
              />
            </div>
          )}

          {/* Goal Information */}
          {plan.goal_type && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-600">Goal:</span>
              <Chip
                color={getGoalTypeColor(plan.goal_type)}
                size="sm"
                variant="flat"
                className="capitalize"
              >
                {plan.goal_type.replace('_', ' ')}
              </Chip>
            </div>
          )}

          {/* Coach/Runner Info */}
          {userRole === 'coach' && plan.runners && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-600">Runner:</span>
              <span className="font-medium">{plan.runners.full_name}</span>
            </div>
          )}
          {userRole === 'runner' && plan.coaches && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-600">Coach:</span>
              <span className="font-medium">{plan.coaches.full_name}</span>
            </div>
          )}
        </div>
      </CardBody>

      <CardFooter className="pt-4">
        <div className="flex justify-between items-center w-full">
          <Button
            as={Link}
            href={`/training-plans/${plan.id}`}
            color="primary"
            variant="flat"
            size="sm"
            className="font-medium"
          >
            View Details
          </Button>
          <div className="text-xs text-foreground-500">
            {plan.weeks_remaining ? `${plan.weeks_remaining} weeks left` : 'Completed'}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(TrainingPlanCard)
