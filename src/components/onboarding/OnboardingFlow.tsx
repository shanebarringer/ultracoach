'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
} from '@heroui/react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  SkipForwardIcon,
  XIcon,
} from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

import OnboardingStepRenderer from './OnboardingStepRenderer'

const logger = createLogger('OnboardingFlow')

interface OnboardingField {
  name: string
  type: string
  label: string
  required?: boolean
}

interface OnboardingStep {
  id: string
  step_number: number
  role: 'runner' | 'coach' | 'both'
  title: string
  description: string
  step_type: 'welcome' | 'profile' | 'preferences' | 'goals' | 'connections' | 'completion'
  fields: OnboardingField[]
  is_required: boolean
}

interface OnboardingProgress {
  id: string
  user_id: string
  role: 'runner' | 'coach'
  current_step: number
  total_steps: number
  completed: boolean
  step_data: Record<string, unknown>
  started_at: string
  completed_at?: string
  skipped_at?: string
}

interface OnboardingFlowProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [onboarding, setOnboarding] = useState<OnboardingProgress | null>(null)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [currentStepData, setCurrentStepData] = useState<OnboardingStep | null>(null)
  const [stepAnswers, setStepAnswers] = useState<Record<string, unknown>>({})
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const fetchOnboardingData = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const response = await fetch('/api/onboarding')

      if (!response.ok) {
        throw new Error('Failed to fetch onboarding data')
      }

      const data = await response.json()
      setOnboarding(data.onboarding)
      setSteps(data.steps || [])
      setCurrentStepData(data.currentStepData)

      // Load existing answers for current step with type validation
      if (data.onboarding?.step_data) {
        const currentStepKey = `step_${data.onboarding.current_step}`
        const stepDataValue = data.onboarding.step_data[currentStepKey]
        // Validate that stepDataValue is a non-null object (not string, array, etc.)
        if (stepDataValue && typeof stepDataValue === 'object' && !Array.isArray(stepDataValue)) {
          setStepAnswers(stepDataValue as Record<string, unknown>)
        } else {
          setStepAnswers({})
        }
      }
    } catch (error) {
      logger.error('Error fetching onboarding data:', error)
      toast.error('❌ Loading Failed', 'Failed to load onboarding data.')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      fetchOnboardingData()
    }
  }, [isOpen, session?.user?.id, fetchOnboardingData])

  const saveStepProgress = async (stepData: Record<string, unknown>, moveToNext = true) => {
    if (!onboarding || !currentStepData) return

    setSaving(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepNumber: currentStepData.step_number,
          stepData,
          completed: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save step progress')
      }

      const result = await response.json()

      if (moveToNext) {
        // Move to next step
        const nextStepNumber = Math.min(currentStepData.step_number + 1, onboarding.total_steps)

        const nextStep = steps.find(s => s.step_number === nextStepNumber)

        if (nextStep) {
          setCurrentStepData(nextStep)
          setStepAnswers({}) // Reset answers for next step
          setOnboarding(result.onboarding)
        } else {
          // Completed all steps
          await completeOnboarding()
        }
      } else {
        setOnboarding(result.onboarding)
      }

      toast.success('✅ Progress Saved', 'Your progress has been saved.')
    } catch (error) {
      logger.error('Error saving step progress:', error)
      toast.error('❌ Save Failed', 'Failed to save progress. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const completeOnboarding = async () => {
    if (!onboarding) return

    setSaving(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepNumber: onboarding.current_step,
          stepData: stepAnswers,
          completed: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      toast.success(
        '🎉 Welcome to UltraCoach!',
        'Your onboarding is complete. Let&apos;s start training!'
      )

      logger.info('Onboarding completed successfully')
      onComplete()
    } catch (error) {
      logger.error('Error completing onboarding:', error)
      toast.error('❌ Completion Failed', 'Failed to complete onboarding. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const skipOnboarding = async () => {
    setSaving(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to skip onboarding')
      }

      toast.success('⏭️ Onboarding Skipped', 'You can always complete setup later in your profile.')

      logger.info('Onboarding skipped')
      setShowSkipConfirm(false)
      onComplete()
    } catch (error) {
      logger.error('Error skipping onboarding:', error)
      toast.error('❌ Skip Failed', 'Failed to skip onboarding. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const goToPreviousStep = () => {
    if (!onboarding || !currentStepData || currentStepData.step_number <= 1) return

    const prevStepNumber = currentStepData.step_number - 1
    const prevStep = steps.find(s => s.step_number === prevStepNumber)

    if (prevStep) {
      setCurrentStepData(prevStep)

      // Load previous step answers with type validation
      const prevStepKey = `step_${prevStepNumber}`
      const prevStepData = onboarding.step_data
      if (prevStepData && typeof prevStepData === 'object' && !Array.isArray(prevStepData)) {
        const prevAnswersValue = (prevStepData as Record<string, unknown>)[prevStepKey]
        // Validate that prevAnswersValue is a non-null object
        if (
          prevAnswersValue &&
          typeof prevAnswersValue === 'object' &&
          !Array.isArray(prevAnswersValue)
        ) {
          setStepAnswers(prevAnswersValue as Record<string, unknown>)
        } else {
          setStepAnswers({})
        }
      } else {
        setStepAnswers({})
      }
    }
  }

  const handleStepDataChange = (data: Record<string, unknown>) => {
    setStepAnswers(data)
  }

  const isFirstStep = currentStepData?.step_number === 1
  const isLastStep = currentStepData?.step_number === onboarding?.total_steps
  const progressPercentage = onboarding
    ? ((currentStepData?.step_number || 1) / onboarding.total_steps) * 100
    : 0

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" hideCloseButton isDismissable={false}>
        <ModalContent>
          <ModalBody className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-foreground-600">Loading your onboarding...</p>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    )
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        hideCloseButton
        isDismissable={false}
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">🏔️ Welcome to UltraCoach</h2>
                <p className="text-sm text-foreground-600 font-normal">
                  Let&apos;s get you set up for success
                </p>
              </div>
              <Button
                variant="light"
                isIconOnly
                onPress={() => setShowSkipConfirm(true)}
                className="text-foreground-400 hover:text-foreground-600"
                aria-label="Skip onboarding"
              >
                <XIcon className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-foreground-500">
                <span>
                  Step {currentStepData?.step_number || 1} of {onboarding?.total_steps || 5}
                </span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress
                value={progressPercentage}
                color="primary"
                classNames={{
                  track: 'drop-shadow-md border border-default',
                  indicator: 'bg-gradient-to-r from-primary-500 to-secondary-500',
                  label: 'tracking-wider font-medium text-default-600',
                  value: 'text-foreground/60',
                }}
              />
            </div>
          </ModalHeader>

          <ModalBody className="py-4">
            {currentStepData && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div>
                    <h3 className="text-xl font-semibold">{currentStepData.title}</h3>
                    <p className="text-sm text-foreground-600">{currentStepData.description}</p>
                  </div>
                </CardHeader>
                <CardBody>
                  <OnboardingStepRenderer
                    step={currentStepData}
                    answers={stepAnswers}
                    onChange={handleStepDataChange}
                    onSubmit={data => saveStepProgress(data, true)}
                  />
                </CardBody>
              </Card>
            )}
          </ModalBody>

          <ModalFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="flat"
                onPress={goToPreviousStep}
                isDisabled={isFirstStep}
                startContent={<ArrowLeftIcon className="w-4 h-4" />}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="flat"
                  onPress={() => setShowSkipConfirm(true)}
                  startContent={<SkipForwardIcon className="w-4 h-4" />}
                >
                  Skip
                </Button>

                {isLastStep ? (
                  <Button
                    color="success"
                    onPress={() => saveStepProgress(stepAnswers, true)}
                    isLoading={saving}
                    startContent={!saving && <CheckCircle2Icon className="w-4 h-4" />}
                  >
                    {saving ? 'Completing...' : 'Complete Setup'}
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    onPress={() => saveStepProgress(stepAnswers, true)}
                    isLoading={saving}
                    startContent={!saving && <ArrowRightIcon className="w-4 h-4" />}
                  >
                    {saving ? 'Saving...' : 'Next'}
                  </Button>
                )}
              </div>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Skip Confirmation Modal */}
      <Modal isOpen={showSkipConfirm} onClose={() => setShowSkipConfirm(false)} size="md">
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-semibold">Skip Onboarding?</h3>
          </ModalHeader>

          <ModalBody>
            <p className="text-foreground-700">
              Are you sure you want to skip the setup process? You can always complete it later in
              your profile settings, but it helps us provide you with a better experience.
            </p>
          </ModalBody>

          <ModalFooter>
            <Button variant="flat" onPress={() => setShowSkipConfirm(false)}>
              Continue Setup
            </Button>
            <Button color="warning" variant="flat" onPress={skipOnboarding} isLoading={saving}>
              {saving ? 'Skipping...' : 'Skip for Now'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
