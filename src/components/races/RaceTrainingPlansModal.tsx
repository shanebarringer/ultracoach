'use client'

import {
  Button,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  User,
} from '@heroui/react'
import { FlagIcon } from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'
import type { Race } from '@/lib/supabase'

const logger = createLogger('RaceTrainingPlansModal')

interface TrainingPlanForRace {
  id: string
  title: string
  description?: string
  created_at: string
  runner_name?: string
  runner_email: string
  runner_id: string
}

interface RaceTrainingPlansModalProps {
  isOpen: boolean
  onClose: () => void
  race: Race | null
}

export default function RaceTrainingPlansModal({
  isOpen,
  onClose,
  race,
}: RaceTrainingPlansModalProps) {
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlanForRace[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTrainingPlans = useCallback(async () => {
    if (!race?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/races/${race.id}/training-plans`, {
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch training plans')
      }

      const data = await response.json()
      setTrainingPlans(data.training_plans || [])
      logger.info('Training plans for race fetched', {
        raceId: race.id,
        count: data.training_plans?.length || 0,
      })
    } catch (error) {
      logger.error('Error fetching training plans for race:', error)
      setTrainingPlans([])
    } finally {
      setLoading(false)
    }
  }, [race?.id])

  useEffect(() => {
    if (isOpen && race?.id) {
      fetchTrainingPlans()
    }
  }, [isOpen, race?.id, fetchTrainingPlans])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <FlagIcon className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Training Plans for {race?.name}</h3>
            <p className="text-sm text-foreground-600 font-normal">
              Athletes targeting this race expedition
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" color="primary" label="Loading training plans..." />
            </div>
          ) : trainingPlans.length === 0 ? (
            <Card className="bg-warning/5 border-warning/20">
              <CardBody className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="bg-warning/10 rounded-full p-4">
                    <FlagIcon className="h-8 w-8 text-warning" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Training Plans Yet
                </h3>
                <p className="text-foreground-600">
                  No athletes are currently targeting this race. Create a training plan to get
                  started!
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Chip color="primary" variant="flat" size="sm">
                  {trainingPlans.length} {trainingPlans.length === 1 ? 'Athlete' : 'Athletes'}
                </Chip>
                <span className="text-sm text-foreground-600">targeting this expedition</span>
              </div>

              {trainingPlans.map(plan => (
                <Card key={plan.id} className="border-l-4 border-l-primary/60">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{plan.title}</h4>
                        {plan.description && (
                          <p className="text-sm text-foreground-600 mb-2">{plan.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <User
                        name={plan.runner_name || 'Unknown Runner'}
                        description={plan.runner_email}
                        avatarProps={{
                          size: 'sm',
                          name: plan.runner_name || plan.runner_email,
                        }}
                      />
                      <time
                        className="text-xs text-foreground-500"
                        dateTime={plan.created_at}
                        suppressHydrationWarning
                      >
                        Created {new Date(plan.created_at).toLocaleDateString()}
                      </time>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
