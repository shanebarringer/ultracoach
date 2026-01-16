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
import {
  BugIcon,
  LightbulbIcon,
  MessageCircleIcon,
  SendIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from 'lucide-react'

import { useState } from 'react'

import { api } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('FeedbackModal')

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  defaultType?: 'bug_report' | 'feature_request' | 'general_feedback' | 'complaint' | 'compliment'
}

interface FeedbackForm {
  feedback_type: 'bug_report' | 'feature_request' | 'general_feedback' | 'complaint' | 'compliment'
  category: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  user_email: string
}

const feedbackTypes = [
  {
    value: 'bug_report',
    label: 'Bug Report',
    icon: BugIcon,
    color: 'danger' as const,
    description: 'Report a problem or error',
  },
  {
    value: 'feature_request',
    label: 'Feature Request',
    icon: LightbulbIcon,
    color: 'warning' as const,
    description: 'Suggest a new feature or improvement',
  },
  {
    value: 'general_feedback',
    label: 'General Feedback',
    icon: MessageCircleIcon,
    color: 'primary' as const,
    description: 'Share your thoughts or suggestions',
  },
  {
    value: 'complaint',
    label: 'Complaint',
    icon: ThumbsDownIcon,
    color: 'danger' as const,
    description: 'Report an issue or concern',
  },
  {
    value: 'compliment',
    label: 'Compliment',
    icon: ThumbsUpIcon,
    color: 'success' as const,
    description: 'Share positive feedback',
  },
] as const

const categories = [
  { value: 'ui_ux', label: 'User Interface & Experience' },
  { value: 'performance', label: 'Performance & Speed' },
  { value: 'functionality', label: 'Features & Functionality' },
  { value: 'content', label: 'Content & Information' },
  { value: 'mobile', label: 'Mobile Experience' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'other', label: 'Other' },
]

const priorities = [
  { value: 'low', label: 'Low - Minor issue or suggestion' },
  { value: 'medium', label: 'Medium - Moderate impact' },
  { value: 'high', label: 'High - Significant impact' },
  { value: 'urgent', label: 'Urgent - Critical issue' },
]

export default function FeedbackModal({ isOpen, onClose, defaultType }: FeedbackModalProps) {
  const [form, setForm] = useState<FeedbackForm>({
    feedback_type: defaultType || 'general_feedback',
    category: '',
    title: '',
    description: '',
    priority: 'medium',
    user_email: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Missing Information', 'Please fill in both title and description.')
      return
    }

    setIsSubmitting(true)

    try {
      // Collect browser information
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenWidth: screen.width,
        screenHeight: screen.height,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }

      const response = await api.post<{ feedback: { id: string } }>('/api/feedback', {
        ...form,
        browser_info: browserInfo,
        page_url: window.location.href,
      })

      toast.success(
        '✅ Feedback Submitted',
        `Thank you for your feedback! We'll review it and get back to you soon.`
      )

      logger.info('Feedback submitted successfully:', response.data.feedback.id)

      // Reset form and close modal
      setForm({
        feedback_type: 'general_feedback',
        category: '',
        title: '',
        description: '',
        priority: 'medium',
        user_email: '',
      })
      onClose()
    } catch (error) {
      logger.error('Error submitting feedback:', error)
      toast.error('❌ Submission Failed', 'Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FeedbackForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const selectedType = feedbackTypes.find(type => type.value === form.feedback_type)
  const TypeIcon = selectedType?.icon || MessageCircleIcon

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
        body: 'py-4',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TypeIcon className={`w-5 h-5 text-${selectedType?.color || 'primary'}`} />
            <h2 className="text-xl font-semibold">Share Your Feedback</h2>
          </div>
          <p className="text-sm text-foreground-600 font-normal">
            Help us improve UltraCoach by sharing your thoughts, reporting issues, or suggesting
            features.
          </p>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Feedback Type */}
          <Select
            label="Feedback Type"
            placeholder="Select feedback type"
            selectedKeys={[form.feedback_type]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleInputChange('feedback_type', value)
            }}
            classNames={{
              trigger: 'border-1',
            }}
          >
            {feedbackTypes.map(type => {
              const Icon = type.icon
              return (
                <SelectItem
                  key={type.value}
                  textValue={type.label}
                  startContent={<Icon className={`w-4 h-4 text-${type.color}`} />}
                >
                  <div className="flex flex-col">
                    <span className="text-small">{type.label}</span>
                    <span className="text-tiny text-foreground-400">{type.description}</span>
                  </div>
                </SelectItem>
              )
            })}
          </Select>

          {/* Category */}
          <Select
            label="Category (Optional)"
            placeholder="Select a category"
            selectedKeys={form.category ? [form.category] : []}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleInputChange('category', value || '')
            }}
            classNames={{
              trigger: 'border-1',
            }}
          >
            {categories.map(category => (
              <SelectItem key={category.value}>{category.label}</SelectItem>
            ))}
          </Select>

          {/* Title */}
          <Input
            label="Title"
            placeholder="Brief summary of your feedback"
            value={form.title}
            onValueChange={value => handleInputChange('title', value)}
            isRequired
            classNames={{
              input: 'border-1',
            }}
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Please provide detailed information about your feedback. For bug reports, include steps to reproduce the issue."
            value={form.description}
            onValueChange={value => handleInputChange('description', value)}
            minRows={4}
            maxRows={8}
            isRequired
            classNames={{
              input: 'border-1',
            }}
          />

          {/* Priority */}
          <Select
            label="Priority"
            placeholder="Select priority level"
            selectedKeys={[form.priority]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleInputChange('priority', value)
            }}
            classNames={{
              trigger: 'border-1',
            }}
          >
            {priorities.map(priority => (
              <SelectItem key={priority.value}>{priority.label}</SelectItem>
            ))}
          </Select>

          {/* Email for follow-up */}
          <Input
            label="Email (Optional)"
            placeholder="Enter your email if you'd like us to follow up"
            value={form.user_email}
            onValueChange={value => handleInputChange('user_email', value)}
            type="email"
            description="We'll only use this to follow up on your feedback"
            classNames={{
              input: 'border-1',
            }}
          />
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            startContent={!isSubmitting && <SendIcon className="w-4 h-4" />}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
