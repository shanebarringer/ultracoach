'use client'

import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { createTrainingPlanFormAtom, racesAtom, planTemplatesAtom } from '@/lib/atoms'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea } from '@heroui/react'
import type { PlanTemplate, Race } from '@/lib/supabase'

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
  const [formData, setFormData] = useAtom(createTrainingPlanFormAtom)
  const [races, setRaces] = useAtom(racesAtom)
  const [planTemplates, setPlanTemplates] = useAtom(planTemplatesAtom)

  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = planTemplates.find(t => t.id === templateId)
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        title: selectedTemplate.name,
        description: selectedTemplate.description || '',
        plan_type: 'race_specific', // Assuming templates are race-specific
        targetRaceDistance: selectedTemplate.distance_category,
        // Clear race_id and targetRaceDate if a template is selected
        race_id: null,
        targetRaceDate: '',
      }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormData(prev => ({ ...prev, loading: true, error: '' }))

    try {
      const payload = {
        ...formData,
        targetRaceDate: formData.race_id ? undefined : formData.targetRaceDate,
        targetRaceDistance: formData.race_id ? undefined : formData.targetRaceDistance,
        template_id: formData.template_id || undefined, // Add template_id
      }

      const response = await fetch('/api/training-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setFormData({
          title: '',
          description: '',
          runnerEmail: '',
          race_id: null,
          goal_type: null,
          plan_type: null,
          targetRaceDate: '',
          targetRaceDistance: '',
          template_id: null,
          loading: false,
          error: '',
        })
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        setFormData(prev => ({ 
          ...prev, 
          loading: false,
          error: data.error || 'Failed to create training plan'
        }))
      }
    } catch {
      setFormData(prev => ({ 
        ...prev, 
        loading: false,
        error: 'An error occurred. Please try again.'
      }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Create Training Plan</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            {formData.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {formData.error}
              </div>
            )}

            <Select
              label="Select Template (Optional)"
              name="template_id"
              selectedKeys={formData.template_id ? [formData.template_id] : []}
              onSelectionChange={(keys) => {
                const selectedTemplateId = Array.from(keys).join('');
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

            <Input
              type="text"
              label="Plan Title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., 100-Mile Ultra Training Plan"
            />

            <Textarea
              label="Description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the training plan goals and approach..."
            />

            <Input
              type="email"
              label="Runner Email"
              name="runnerEmail"
              required
              value={formData.runnerEmail}
              onChange={handleChange}
              placeholder="runner@example.com"
            />

            <Select
              label="Plan Type"
              name="plan_type"
              selectedKeys={formData.plan_type ? [formData.plan_type] : []}
              onSelectionChange={(keys) => {
                const selectedPlanType = Array.from(keys).join('') as 'race_specific' | 'base_building' | 'bridge' | 'recovery' | '';
                setFormData(prev => ({ ...prev, plan_type: selectedPlanType === '' ? null : selectedPlanType }));
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
                setFormData(prev => ({ ...prev, race_id: selectedRaceId === '' ? null : selectedRaceId }));
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
              <Input
                type="date"
                label="Target Race Date (Optional)"
                name="targetRaceDate"
                value={formData.targetRaceDate}
                onChange={handleChange}
              />
            )}

            {!formData.race_id && (
              <Select
                label="Target Race Distance (Optional)"
                name="targetRaceDistance"
                selectedKeys={formData.targetRaceDistance ? [formData.targetRaceDistance] : []}
                onSelectionChange={(keys) => {
                  const selectedDistance = Array.from(keys).join('');
                  setFormData(prev => ({ ...prev, targetRaceDistance: selectedDistance }));
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
                setFormData(prev => ({ ...prev, goal_type: selectedGoalType === '' ? null : selectedGoalType }));
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
            <Button type="submit" color="primary" disabled={formData.loading}>
              {formData.loading ? 'Creating...' : 'Create Plan'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}