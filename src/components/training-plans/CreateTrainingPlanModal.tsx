'use client'

import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createTrainingPlanFormAtom, racesAtom, planTemplatesAtom } from '@/lib/atoms'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea } from '@heroui/react'
import type { PlanTemplate, Race } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CreateTrainingPlanModal')

// Zod schema for form validation
const createTrainingPlanSchema = z.object({
  title: z.string().min(1, 'Plan title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  runnerEmail: z.string().email('Please enter a valid email address'),
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
  onSuccess
}: CreateTrainingPlanModalProps) {
  const [formState, setFormState] = useAtom(createTrainingPlanFormAtom)
  const [races, setRaces] = useAtom(racesAtom)
  const [planTemplates, setPlanTemplates] = useAtom(planTemplatesAtom)

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting }
  } = useForm<CreateTrainingPlanForm>({
    resolver: zodResolver(createTrainingPlanSchema),
    defaultValues: {
      title: '',
      description: '',
      runnerEmail: '',
      race_id: null,
      goal_type: null,
      plan_type: null,
      targetRaceDate: '',
      targetRaceDistance: '',
      template_id: null,
    }
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

  useEffect(() => {
    if (isOpen) {
      const fetchInitialData = async () => {
        if (races.length === 0) {
          try {
            const response = await fetch('/api/races')
            if (response.ok) {
              const data = await response.json()
              setRaces(data.races)
            } else {
              console.error('Failed to fetch races', response.statusText)
            }
          } catch (err) {
            console.error('Error fetching races:', err)
          }
        }
        if (planTemplates.length === 0) {
          try {
            const response = await fetch('/api/training-plans/templates')
            if (response.ok) {
              const data = await response.json()
              setPlanTemplates(data.templates)
            } else {
              console.error('Failed to fetch plan templates', response.statusText)
            }
          } catch (err) {
            console.error('Error fetching plan templates:', err)
          }
        }
      }
      fetchInitialData()
    }
  }, [isOpen, races.length, setRaces, planTemplates.length, setPlanTemplates])

  const onSubmit = async (data: CreateTrainingPlanForm) => {
    setFormState(prev => ({ ...prev, loading: true, error: '' }))

    try {
      const payload = {
        ...data,
        targetRaceDate: data.race_id ? undefined : data.targetRaceDate,
        targetRaceDistance: data.race_id ? undefined : data.targetRaceDistance,
        template_id: data.template_id || undefined,
      }

      logger.info('Submitting training plan creation:', { payload })

      const response = await fetch('/api/training-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        logger.info('Training plan created successfully')
        setFormState(prev => ({ ...prev, loading: false, error: '' }))
        reset() // Reset form with react-hook-form
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        logger.error('Failed to create training plan:', errorData)
        setFormState(prev => ({ 
          ...prev, 
          loading: false,
          error: errorData.error || 'Failed to create training plan'
        }))
      }
    } catch (error) {
      logger.error('Error creating training plan:', error)
      setFormState(prev => ({ 
        ...prev, 
        loading: false,
        error: 'An error occurred. Please try again.'
      }))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Create Training Plan</ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody className="space-y-4">
            {formState.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
                  onSelectionChange={(keys) => {
                    const selectedTemplateId = Array.from(keys).join('');
                    field.onChange(selectedTemplateId || null);
                    setValue('template_id', selectedTemplateId || null);
                    handleTemplateSelect(selectedTemplateId);
                  }}
                  placeholder="Choose a plan template..."
                  items={[{ id: '', name: 'Start from scratch' }, ...planTemplates]}
                >
                  {(item) => (
                    <SelectItem key={item.id}>
                      {item.name} {item.id !== '' && (item as PlanTemplate).distance_category && (item as PlanTemplate).difficulty_level && `(${(item as PlanTemplate).distance_category} - ${(item as PlanTemplate).difficulty_level})`}
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
              name="runnerEmail"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="email"
                  label="Runner Email"
                  placeholder="runner@example.com"
                  isRequired
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />

            <Select
              label="Plan Type"
              name="plan_type"
              selectedKeys={formData.plan_type ? [formData.plan_type] : []}
              onSelectionChange={(keys) => {
                const selectedPlanType = Array.from(keys).join('') as 'race_specific' | 'base_building' | 'bridge' | 'recovery' | '';
                setValue('plan_type', selectedPlanType === '' ? null : selectedPlanType);
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
              onSelectionChange={(keys) => {
                const selectedRaceId = Array.from(keys).join('');
                setValue('race_id', selectedRaceId === '' ? null : selectedRaceId);
              }}
              placeholder="Select a target race..."
              items={[{ id: '', name: 'No specific race' }, ...races]}
            >
              {(item) => (
                <SelectItem key={item.id}>
                  {item.name} {item.id !== '' && (item as Race).date && `(${new Date((item as Race).date).toLocaleDateString()})`}
                </SelectItem>
              )}
            </Select>

            {!formData.race_id && (
              <Controller
                name="targetRaceDate"
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    label="Target Race Date (Optional)"
                    {...field}
                  />
                )}
              />
            )}

            {!formData.race_id && (
              <Select
                label="Target Race Distance (Optional)"
                name="targetRaceDistance"
                selectedKeys={formData.targetRaceDistance ? [formData.targetRaceDistance] : []}
                onSelectionChange={(keys) => {
                  const selectedDistance = Array.from(keys).join('');
                  setValue('targetRaceDistance', selectedDistance);
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
                {(item) => (
                  <SelectItem key={item.id}>
                    {item.name}
                  </SelectItem>
                )}
              </Select>
            )}

            <Select
              label="Goal Type (Optional)"
              name="goal_type"
              selectedKeys={formData.goal_type ? [formData.goal_type] : []}
              onSelectionChange={(keys) => {
                const selectedGoalType = Array.from(keys).join('') as 'completion' | 'time' | 'placement' | '';
                setValue('goal_type', selectedGoalType === '' ? null : selectedGoalType);
              }}
              placeholder="Select goal type..."
              items={[
                { id: '', name: 'No specific goal' },
                { id: 'completion', name: 'Completion' },
                { id: 'time', name: 'Time Goal' },
                { id: 'placement', name: 'Placement Goal' },
              ]}
            >
              {(item) => (
                <SelectItem key={item.id}>
                  {item.name}
                </SelectItem>
              )}
            </Select>

          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting || formState.loading}>
              {(isSubmitting || formState.loading) ? 'Creating...' : 'Create Plan'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}