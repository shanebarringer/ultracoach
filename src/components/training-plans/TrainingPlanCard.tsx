import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardBody, CardFooter, Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { useTrainingPlans } from '@/hooks/useTrainingPlans'
import type { TrainingPlan, User } from '@/lib/atoms'

interface TrainingPlanCardProps {
  plan: TrainingPlan & { runners?: User; coaches?: User }
  userRole: 'runner' | 'coach'
  onArchiveChange?: () => void
}

export default function TrainingPlanCard({ plan, userRole, onArchiveChange }: TrainingPlanCardProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { archiveTrainingPlan, deleteTrainingPlan } = useTrainingPlans()

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
      await archiveTrainingPlan(plan.id)
      onArchiveChange?.()
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
      await deleteTrainingPlan(plan.id)
      onArchiveChange?.()
    } catch (error) {
      console.error('Error deleting training plan:', error)
      alert('Failed to delete training plan')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${plan.archived ? 'opacity-60' : ''}`}
      isPressable={false}
    >
      <CardHeader className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{plan.title}</h3>
            {plan.archived && (
              <Chip size="sm" variant="flat" color="default">
                Archived
              </Chip>
            )}
          </div>
          <p className="text-small text-foreground-500 mt-1">{plan.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-tiny text-foreground-400">Created</div>
            <div className="text-small font-medium">
              {formatDate(plan.created_at)}
            </div>
          </div>
          
          {/* Action Menu */}
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="archive"
                onClick={handleArchiveToggle}
                isDisabled={isArchiving || isDeleting}
              >
                {isArchiving 
                  ? 'Updating...'
                  : plan.archived 
                    ? 'Restore Plan' 
                    : 'Archive Plan'
                }
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
        </div>
      </CardHeader>

      {/* Enhanced training plan info - TODO: Implement with enhanced schema */}
      {/* <div className="grid grid-cols-2 gap-4 mb-4">
        {plan.race_id && (
          <div>
            <div className="text-xs text-gray-500">Target Race</div>
            <div className="text-sm font-medium text-gray-900">
              Race Information
            </div>
          </div>
        )}
        {plan.goal_type && (
          <div>
            <div className="text-xs text-gray-500">Goal Type</div>
            <div className="text-sm font-medium text-gray-900">
              {plan.goal_type}
            </div>
          </div>
        )}
      </div> */}

      <CardBody>
        {userRole === 'coach' && plan.runners && (
          <div>
            <div className="text-tiny text-foreground-400">Runner</div>
            <div className="text-small font-medium">
              {plan.runners.full_name}
            </div>
          </div>
        )}
        {userRole === 'runner' && plan.coaches && (
          <div>
            <div className="text-tiny text-foreground-400">Coach</div>
            <div className="text-small font-medium">
              {plan.coaches.full_name}
            </div>
          </div>
        )}
      </CardBody>

      <CardFooter className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Chip 
            size="sm" 
            variant="flat"
            color={plan.archived ? 'default' : 'primary'}
          >
            {plan.archived ? 'Archived' : 'Active'}
          </Chip>
        </div>
        <Button
          as={Link}
          href={`/training-plans/${plan.id}`}
          variant="light"
          color="primary"
          size="sm"
        >
          View Details →
        </Button>
      </CardFooter>
    </Card>
  )
}