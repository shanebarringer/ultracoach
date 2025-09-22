'use client'

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom, useAtomValue } from 'jotai'
import { z } from 'zod'

import { useCallback, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { api } from '@/lib/api-client'
import {
  connectedRunnersDataAtom,
  connectedRunnersLoadingAtom,
  createTrainingPlanFormAtom,
  planTemplatesAtom,
  racesAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { PlanTemplate, User } from '@/lib/supabase'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('CreateTrainingPlanModal')

// Zod schema for form validation
const createTrainingPlanSchema = z.object({
  title: z
    .string()
    .min(1, 'Plan title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  runnerId: z.string().min(1, 'Please select a runner'),
  race_id: z.string().nullable(),
  goal_type: z.enum(['completion', 'time', 'placement']).nullable(),
  plan_type: z.enum(['race_specific', 'base_building', 'bridge', 'recovery']).nullable(),
  targetRaceDate: z.string().optional(),
  targetRaceDistance: z.string().optional(),
  template_id: z.string().nullable(),
})

type CreateTrainingPlanForm = z.infer<typeof createTrainingPlanSchema>

interface CreateTrainingPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateTrainingPlanModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTrainingPlanModalProps) {
  const [formState, setFormState] = useAtom(createTrainingPlanFormAtom)
  const [races, setRaces] = useAtom(racesAtom)
  const [planTemplates, setPlanTemplates] = useAtom(planTemplatesAtom)
  // Use separate atoms for data and loading state
  const connectedRunners = useAtomValue(connectedRunnersDataAtom)
  const loadingRunners = useAtomValue(connectedRunnersLoadingAtom)

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<CreateTrainingPlanForm>({
    resolver: zodResolver(createTrainingPlanSchema),
    defaultValues: {
      title: '',
      description: '',
      runnerId: '',
      race_id: null,
      goal_type: null,
      plan_type: null,
      targetRaceDate: '',
      targetRaceDistance: '',
      template_id: null,
    },
  })

  // Watch all form values for conditional rendering
  const formData = watch()

  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = planTemplates.find(t => t.id === templateId)
    if (selectedTemplate) {
      setValue('title', selectedTemplate.name)
      setValue('description', selectedTemplate.description || '')
      setValue('plan_type', 'race_specific') // Assuming templates are race-specific
      setValue('targetRaceDistance', selectedTemplate.distance_category)
      // Clear race_id and targetRaceDate if a template is selected
      setValue('race_id', null)
      setValue('targetRaceDate', '')
    }
  }

  const fetchInitialData = useCallback(
    async (signal: AbortSignal) => {
      // Fetch races using Axios
      if (races.length === 0) {
        try {
          const response = await api.get<unknown[]>('/api/races', { signal })
          setRaces(Array.isArray(response.data) ? (response.data as typeof races) : [])
        } catch (err: unknown) {
          const error = err as Error
          if (error.name !== 'AbortError' && (error as { code?: string }).code !== 'ERR_CANCELED') {
            logger.error('Error fetching races:', { message: error.message })
          }
        }
      }

      // Fetch plan templates using Axios
      if (planTemplates.length === 0) {
        try {
          const response = await api.get<{ templates: unknown[] }>(
            '/api/training-plans/templates',
            { signal }
          )
          const templatesData = response.data
          setPlanTemplates((templatesData.templates || []) as typeof planTemplates)
          logger.info(`Loaded ${(templatesData.templates || []).length} plan templates`)
        } catch (err: unknown) {
          const error = err as Error & { code?: string; response?: { status?: number } }
          if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
            logger.error('Error fetching plan templates:', {
              message: error.message,
              status: error.response?.status,
            })
          }
        }
      }
    },
    [races.length, setRaces, planTemplates.length, setPlanTemplates]
  )

  useEffect(() => {
    if (isOpen) {
      const controller = new AbortController()
      fetchInitialData(controller.signal)

      // Cleanup function to abort in-flight requests
      return () => {
        controller.abort()
      }
    }
  }, [isOpen, fetchInitialData])

  const onSubmit = async (data: CreateTrainingPlanForm) => {
    setFormState(prev => ({ ...prev, loading: true, error: '' }))

    try {
      const payload = {
        ...data,
        targetRaceDate: data.race_id ? undefined : data.targetRaceDate,
        targetRaceDistance: data.race_id ? undefined : data.targetRaceDistance,
        template_id: data.template_id || undefined,
      }

      logger.debug('Submitting training plan creation', {
        hasTemplate: Boolean(payload.template_id),
        planType: payload.plan_type,
        raceAttached: Boolean(payload.race_id),
      })

      const response = await api.post<{ id: string }>('/api/training-plans', payload)

      // Success case
      const responseData = response.data
      logger.info('Training plan created successfully', { planId: responseData?.id })
      setFormState(prev => ({ ...prev, loading: false, error: '' }))
      reset() // Reset form with react-hook-form

      // Show success toast
      commonToasts.trainingPlanCreated()

      onSuccess()
      onClose()
    } catch (error: unknown) {
      // Handle Axios error responses with robust JSON parsing
      let errorMessage = 'An error occurred. Please try again.'

      const axiosError = error as {
        response?: { status: number; headers: Record<string, string>; data: unknown }
        message?: string
      }

      if (axiosError.response) {
        // Server responded with error status
        const response = axiosError.response
        const ct = response.headers['content-type'] || ''

        if (ct.includes('application/json') && response.data && typeof response.data === 'object') {
          const data = response.data as { error?: string; message?: string }
          errorMessage = data.error || data.message || errorMessage
        } else if (typeof response.data === 'string') {
          errorMessage = response.data
        }

        logger.error('Failed to create training plan:', {
          status: response.status,
          errorMessage,
        })
      } else {
        logger.error('Error creating training plan:', {
          message: axiosError.message || 'Unknown error',
        })
      }

      setFormState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))

      // Show error toast
      commonToasts.trainingPlanError(errorMessage)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Create Training Plan</ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody className="space-y-4 max-h-[70svh] overflow-y-auto sm:max-h-[75svh]">
            {formState.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm">
                {formState.error}
              </div>
            )}

            <Controller
              name="template_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Select Template (Optional)"
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={keys => {
                    const selectedTemplateId = Array.from(keys).join('')
                    field.onChange(selectedTemplateId || null)
                    setValue('template_id', selectedTemplateId || null)
                    handleTemplateSelect(selectedTemplateId)
                  }}
                  placeholder="Choose a plan template..."
                  items={[{ id: '', name: 'Start from scratch' }, ...planTemplates]}
                >
                  {item => (
                    <SelectItem key={item.id}>
                      {item.name}{' '}
                      {item.id !== '' &&
                        (item as PlanTemplate).distance_category &&
                        (item as PlanTemplate).difficulty_level &&
                        `(${(item as PlanTemplate).distance_category} - ${(item as PlanTemplate).difficulty_level})`}
                    </SelectItem>
                  )}
                </Select>
              )}
            />

            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="text"
                  label="Plan Title"
                  placeholder="e.g., 100-Mile Ultra Training Plan"
                  isRequired
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  {...field}
                  label="Description"
                  rows={3}
                  placeholder="Describe the training plan goals and approach..."
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="runnerId"
              control={control}
              render={({ field, fieldState }) => (
                <Select
                  name={field.name}
                  ref={field.ref}
                  label="Select Runner"
                  placeholder={loadingRunners ? 'Loading connected runners...' : 'Choose a runner'}
                  isRequired
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                  isLoading={loadingRunners}
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={keys => {
                    const selectedKey = Array.from(keys)[0] as string
                    field.onChange(selectedKey || '')
                  }}
                >
                  {connectedRunners.map((runner: User) => (
                    <SelectItem key={runner.id}>
                      {runner.full_name ? `${runner.full_name} (${runner.email})` : runner.email}
                    </SelectItem>
                  ))}
                </Select>
              )}
            />

            <Select
              label="Plan Type"
              name="plan_type"
              selectedKeys={formData.plan_type ? [formData.plan_type] : []}
              onSelectionChange={keys => {
                const selectedPlanType = Array.from(keys).join('') as
                  | 'race_specific'
                  | 'base_building'
                  | 'bridge'
                  | 'recovery'
                  | ''
                setValue('plan_type', selectedPlanType === '' ? null : selectedPlanType)
              }}
              placeholder="Select plan type..."
            >
              <SelectItem key="race_specific">Race Specific</SelectItem>
              <SelectItem key="base_building">Base Building</SelectItem>
              <SelectItem key="bridge">Bridge Plan</SelectItem>
              <SelectItem key="recovery">Recovery Plan</SelectItem>
            </Select>

            <Select
              label="Target Race (Optional)"
              name="race_id"
              selectedKeys={formData.race_id ? [formData.race_id] : []}
              onSelectionChange={keys => {
                const selectedRaceId = Array.from(keys).join('')
                setValue('race_id', selectedRaceId === '' ? null : selectedRaceId)
              }}
              placeholder="Select a target race expedition..."
              description="Choose a race to tailor your training plan"
              items={[
                {
                  id: '',
                  name: 'No specific race',
                  distance_type: '',
                  location: '',
                  date: '',
                  terrain_type: '',
                  elevation_gain_feet: 0,
                  distance_miles: 0,
                },
                ...(Array.isArray(races) ? races : []),
              ]}
            >
              {item => (
                <SelectItem key={item.id} textValue={item.name}>
                  <div className="flex flex-col py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{item.name}</span>
                      {item.id !== '' && item.distance_type && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {item.distance_type}
                        </span>
                      )}
                    </div>
                    {item.id !== '' && (item.location || item.date) && (
                      <div className="flex items-center gap-3 text-xs text-foreground-500">
                        {item.location && (
                          <span className="flex items-center gap-1">📍 {item.location}</span>
                        )}
                        {item.date && (
                          <span className="flex items-center gap-1">
                            📅{' '}
                            {new Date(item.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        {item.elevation_gain_feet > 0 && (
                          <span className="flex items-center gap-1">
                            ⛰️ {item.elevation_gain_feet.toLocaleString()}ft
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </SelectItem>
              )}
            </Select>

            {!formData.race_id && (
              <Controller
                name="targetRaceDate"
                control={control}
                render={({ field }) => (
                  <Input type="date" label="Target Race Date (Optional)" {...field} />
                )}
              />
            )}

            {!formData.race_id && (
              <Select
                label="Target Race Distance (Optional)"
                name="targetRaceDistance"
                selectedKeys={formData.targetRaceDistance ? [formData.targetRaceDistance] : []}
                onSelectionChange={keys => {
                  const selectedDistance = Array.from(keys).join('')
                  setValue('targetRaceDistance', selectedDistance)
                }}
                placeholder="Select distance..."
                items={[
                  { id: '', name: 'Select distance...' },
                  { id: '50K', name: '50K (31 miles)' },
                  { id: '50M', name: '50 Miles' },
                  { id: '100K', name: '100K (62 miles)' },
                  { id: '100M', name: '100 Miles' },
                  { id: 'Other', name: 'Other' },
                ]}
              >
                {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
            )}

            <Select
              label="Goal Type (Optional)"
              name="goal_type"
              selectedKeys={formData.goal_type ? [formData.goal_type] : []}
              onSelectionChange={keys => {
                const selectedGoalType = Array.from(keys).join('') as
                  | 'completion'
                  | 'time'
                  | 'placement'
                  | ''
                setValue('goal_type', selectedGoalType === '' ? null : selectedGoalType)
              }}
              placeholder="Select goal type..."
              items={[
                { id: '', name: 'No specific goal' },
                { id: 'completion', name: 'Completion' },
                { id: 'time', name: 'Time Goal' },
                { id: 'placement', name: 'Placement Goal' },
              ]}
            >
              {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting || formState.loading}>
              {isSubmitting || formState.loading ? 'Creating...' : 'Create Plan'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
