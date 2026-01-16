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
import { api, getApiErrorMessage } from '@/lib/api-client'
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
      const response = await api.get<{
        onboarding: OnboardingProgress
        steps: OnboardingStep[]
        currentStepData: OnboardingStep
      }>('/api/onboarding', { suppressGlobalToast: true })

      const data = response.data
      setOnboarding(data.onboarding)
      setSteps(data.steps || [])
      setCurrentStepData(data.currentStepData)

      // Load existing answers for current step with safe type checking
      // Always reset stepAnswers to prevent stale data from previous sessions
      if (data.onboarding?.step_data) {
        const currentStepKey = `step_${data.onboarding.current_step}`
        const stepData = data.onboarding.step_data[currentStepKey]
        // Validate that stepData is actually a plain object before using it
        if (stepData && typeof stepData === 'object' && !Array.isArray(stepData)) {
          setStepAnswers(stepData as Record<string, unknown>)
        } else {
          setStepAnswers({})
        }
      } else {
        // Reset to empty if no step_data exists to prevent stale answers
        setStepAnswers({})
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to load onboarding data.')
      logger.error('Error fetching onboarding data:', { error: errorMessage })
      toast.error('❌ Loading Failed', errorMessage)
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
      const response = await api.post<{ onboarding: OnboardingProgress }>(
        '/api/onboarding',
        {
          stepNumber: currentStepData.step_number,
          stepData,
          completed: false,
        },
        { suppressGlobalToast: true }
      )

      const result = response.data

      if (moveToNext) {
        // Check if we're on the last step - if so, complete onboarding
        const isLastStep = currentStepData.step_number >= onboarding.total_steps
        if (isLastStep) {
          await completeOnboarding()
          return
        }

        // Move to next step
        const nextStepNumber = currentStepData.step_number + 1
        const nextStep = steps.find(s => s.step_number === nextStepNumber)

        if (nextStep) {
          setCurrentStepData(nextStep)
          setStepAnswers({}) // Reset answers for next step
          setOnboarding(result.onboarding)
        } else {
          // Edge case: step not found but not on last step
          logger.warn('Next step not found, completing onboarding', { nextStepNumber })
          await completeOnboarding()
        }
      } else {
        setOnboarding(result.onboarding)
      }

      toast.success('✅ Progress Saved', 'Your progress has been saved.')
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to save progress. Please try again.')
      logger.error('Error saving step progress:', { error: errorMessage })
      toast.error('❌ Save Failed', errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const completeOnboarding = async () => {
    if (!onboarding) return

    setSaving(true)

    try {
      await api.post<void>(
        '/api/onboarding',
        {
          stepNumber: onboarding.current_step,
          stepData: stepAnswers,
          completed: true,
        },
        { suppressGlobalToast: true }
      )

      toast.success(
        '🎉 Welcome to UltraCoach!',
        'Your onboarding is complete. Let&apos;s start training!'
      )

      logger.info('Onboarding completed successfully')
      onComplete()
    } catch (error) {
      const errorMessage = getApiErrorMessage(
        error,
        'Failed to complete onboarding. Please try again.'
      )
      logger.error('Error completing onboarding:', { error: errorMessage })
      toast.error('❌ Completion Failed', errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const skipOnboarding = async () => {
    setSaving(true)

    try {
      await api.patch<void>('/api/onboarding', undefined, { suppressGlobalToast: true })

      toast.success('⏭️ Onboarding Skipped', 'You can always complete setup later in your profile.')

      logger.info('Onboarding skipped')
      setShowSkipConfirm(false)
      onComplete()
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to skip onboarding. Please try again.')
      logger.error('Error skipping onboarding:', { error: errorMessage })
      toast.error('❌ Skip Failed', errorMessage)
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

      // Load previous step answers
      const prevStepKey = `step_${prevStepNumber}`
      const prevStepData = (onboarding.step_data as Record<string, unknown>) || {}
      const prevAnswers = (prevStepData[prevStepKey] as Record<string, unknown>) || {}
      setStepAnswers(prevAnswers)
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

  // Calculate how many steps remain and completion percentage
  const remainingSteps = Math.max(
    0,
    onboarding ? onboarding.total_steps - (currentStepData?.step_number || 0) : 0
  )
  const completionPercentage = Math.round(progressPercentage)

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
            <div className="space-y-3">
              <p className="text-foreground-700">
                You&apos;re currently {completionPercentage}% complete with {remainingSteps} step
                {remainingSteps !== 1 ? 's' : ''} remaining.
              </p>
              <p className="text-foreground-700">
                Completing the onboarding helps us provide you with a better personalized
                experience. You can always finish setup later in your profile settings.
              </p>
              <div className="bg-warning-50 dark:bg-warning-100/10 border border-warning-200 dark:border-warning-200/20 rounded-lg p-3">
                <p className="text-sm text-warning-700 dark:text-warning-600">
                  <strong>⚠️ Note:</strong> Skipping may limit some personalized features until you
                  complete your profile.
                </p>
              </div>
            </div>
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
