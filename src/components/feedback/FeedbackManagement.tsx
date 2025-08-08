'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react'
import { formatDistanceToNow } from 'date-fns'
import {
  BugIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  LightbulbIcon,
  MessageCircleIcon,
  PlayIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon,
} from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('FeedbackManagement')

interface UserWithRole {
  id: string
  name: string
  email: string
  role?: 'runner' | 'coach'
}

interface SessionWithRole {
  user?: UserWithRole
}

interface Feedback {
  id: string
  user_id: string
  feedback_type: 'bug_report' | 'feature_request' | 'general_feedback' | 'complaint' | 'compliment'
  category?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  user_email?: string
  browser_info?: {
    userAgent?: string
    screenWidth?: number
    screenHeight?: number
    language?: string
    timezone?: string
  }
  page_url?: string
  admin_notes?: string
  resolved_by?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  user?: {
    name: string
    email: string
  }
}

const feedbackTypeConfig = {
  bug_report: { icon: BugIcon, color: 'danger' as const, label: 'Bug Report' },
  feature_request: { icon: LightbulbIcon, color: 'warning' as const, label: 'Feature Request' },
  general_feedback: {
    icon: MessageCircleIcon,
    color: 'primary' as const,
    label: 'General Feedback',
  },
  complaint: { icon: ThumbsDownIcon, color: 'danger' as const, label: 'Complaint' },
  compliment: { icon: ThumbsUpIcon, color: 'success' as const, label: 'Compliment' },
}

const statusConfig = {
  open: { color: 'warning' as const, label: 'Open' },
  in_progress: { color: 'primary' as const, label: 'In Progress' },
  resolved: { color: 'success' as const, label: 'Resolved' },
  closed: { color: 'default' as const, label: 'Closed' },
}

const priorityConfig = {
  low: { color: 'default' as const, label: 'Low' },
  medium: { color: 'primary' as const, label: 'Medium' },
  high: { color: 'warning' as const, label: 'High' },
  urgent: { color: 'danger' as const, label: 'Urgent' },
}

export default function FeedbackManagement() {
  const { data: session } = useSession()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchFeedback = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/admin/feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback || [])
      } else {
        logger.error('Failed to fetch feedback')
      }
    } catch (error) {
      logger.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    const sessionWithRole = session as SessionWithRole
    const userRole = sessionWithRole?.user?.role || 'runner'
    if (userRole === 'coach') {
      fetchFeedback()
    }
  }, [session, fetchFeedback])

  const updateFeedbackStatus = async (feedbackId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackId,
          status,
          admin_notes: notes,
        }),
      })

      if (response.ok) {
        toast.success('✅ Updated', 'Feedback status updated successfully.')
        await fetchFeedback()
        setSelectedFeedback(null)
      } else {
        throw new Error('Failed to update feedback')
      }
    } catch (error) {
      logger.error('Error updating feedback:', error)
      toast.error('❌ Update Failed', 'Failed to update feedback status.')
    }
  }

  const filteredFeedback = feedback.filter(item => {
    if (statusFilter === 'all') return true
    return item.status === statusFilter
  })

  const sessionWithRole = session as SessionWithRole
  const userRole = sessionWithRole?.user?.role || 'runner'
  if (!session?.user || userRole !== 'coach') {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-foreground-600">Access denied. Coach privileges required.</p>
        </CardBody>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <div className="animate-pulse">Loading feedback...</div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <div>
              <h2 className="text-xl font-semibold">User Feedback Management</h2>
              <p className="text-sm text-foreground-600">
                Review and manage user feedback, bug reports, and feature requests
              </p>
            </div>
            <Select
              label="Filter by Status"
              selectedKeys={[statusFilter]}
              onSelectionChange={keys => {
                const value = Array.from(keys)[0] as string
                setStatusFilter(value)
              }}
              className="w-48"
            >
              <SelectItem key="all">All Status</SelectItem>
              <SelectItem key="open">Open</SelectItem>
              <SelectItem key="in_progress">In Progress</SelectItem>
              <SelectItem key="resolved">Resolved</SelectItem>
              <SelectItem key="closed">Closed</SelectItem>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {filteredFeedback.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8">
              <MessageCircleIcon className="w-12 h-12 text-foreground-300 mx-auto mb-2" />
              <p className="text-foreground-600">No feedback found</p>
              <p className="text-sm text-foreground-400">
                {statusFilter === 'all'
                  ? 'No feedback submissions yet'
                  : `No ${statusFilter} feedback`}
              </p>
            </CardBody>
          </Card>
        ) : (
          filteredFeedback.map(item => {
            const typeConfig = feedbackTypeConfig[item.feedback_type]
            const TypeIcon = typeConfig.icon

            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-${typeConfig.color}-100`}>
                    <TypeIcon className={`w-5 h-5 text-${typeConfig.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Chip size="sm" color={typeConfig.color}>
                            {typeConfig.label}
                          </Chip>
                          <Chip size="sm" color={statusConfig[item.status].color}>
                            {statusConfig[item.status].label}
                          </Chip>
                          <Chip size="sm" color={priorityConfig[item.priority].color}>
                            {priorityConfig[item.priority].label}
                          </Chip>
                          {item.category && (
                            <Chip size="sm" variant="flat">
                              {item.category.replace('_', ' ')}
                            </Chip>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<EyeIcon className="w-3 h-3" />}
                        onPress={() => {
                          setSelectedFeedback(item)
                          setAdminNotes(item.admin_notes || '')
                        }}
                      >
                        View Details
                      </Button>
                    </div>

                    <p className="text-foreground-600 mb-3 line-clamp-2">{item.description}</p>

                    <div className="flex items-center justify-between text-sm text-foreground-400">
                      <div className="flex items-center gap-4">
                        <span>By: {item.user?.name || 'Anonymous'}</span>
                        {item.user_email && <span>Email: {item.user_email}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Feedback Detail Modal */}
      <Modal
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {selectedFeedback && (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  {(() => {
                    const typeConfig = feedbackTypeConfig[selectedFeedback.feedback_type]
                    const TypeIcon = typeConfig.icon
                    return <TypeIcon className={`w-5 h-5 text-${typeConfig.color}`} />
                  })()}
                  <span>{selectedFeedback.title}</span>
                </div>
              </ModalHeader>

              <ModalBody className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Chip color={feedbackTypeConfig[selectedFeedback.feedback_type].color}>
                    {feedbackTypeConfig[selectedFeedback.feedback_type].label}
                  </Chip>
                  <Chip color={statusConfig[selectedFeedback.status].color}>
                    {statusConfig[selectedFeedback.status].label}
                  </Chip>
                  <Chip color={priorityConfig[selectedFeedback.priority].color}>
                    {priorityConfig[selectedFeedback.priority].label}
                  </Chip>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-foreground-700 whitespace-pre-wrap">
                    {selectedFeedback.description}
                  </p>
                </div>

                <Divider />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Submitted by:</span>{' '}
                    {selectedFeedback.user?.name || 'Anonymous'}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    {selectedFeedback.user_email || 'Not provided'}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {formatDistanceToNow(new Date(selectedFeedback.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                  <div>
                    <span className="font-medium">Page URL:</span>{' '}
                    {selectedFeedback.page_url ? (
                      <a
                        href={selectedFeedback.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {selectedFeedback.page_url.split('/').pop() || 'Link'}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>

                {selectedFeedback.browser_info && (
                  <>
                    <Divider />
                    <div>
                      <h4 className="font-medium mb-2">Technical Details</h4>
                      <div className="text-sm space-y-1 text-foreground-600">
                        <p>
                          <span className="font-medium">Screen:</span>{' '}
                          {selectedFeedback.browser_info.screenWidth}x
                          {selectedFeedback.browser_info.screenHeight}
                        </p>
                        <p>
                          <span className="font-medium">Language:</span>{' '}
                          {selectedFeedback.browser_info.language}
                        </p>
                        <p>
                          <span className="font-medium">Timezone:</span>{' '}
                          {selectedFeedback.browser_info.timezone}
                        </p>
                        <p>
                          <span className="font-medium">User Agent:</span>{' '}
                          {selectedFeedback.browser_info.userAgent}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Divider />

                <div>
                  <h4 className="font-medium mb-2">Admin Notes</h4>
                  <Textarea
                    placeholder="Add internal notes about this feedback..."
                    value={adminNotes}
                    onValueChange={setAdminNotes}
                    minRows={3}
                  />
                </div>
              </ModalBody>

              <ModalFooter>
                <Button variant="flat" onPress={() => setSelectedFeedback(null)}>
                  Cancel
                </Button>

                <div className="flex gap-2">
                  {selectedFeedback.status === 'open' && (
                    <Button
                      color="primary"
                      startContent={<PlayIcon className="w-4 h-4" />}
                      onPress={() =>
                        updateFeedbackStatus(selectedFeedback.id, 'in_progress', adminNotes)
                      }
                    >
                      Start Progress
                    </Button>
                  )}

                  {selectedFeedback.status !== 'resolved' &&
                    selectedFeedback.status !== 'closed' && (
                      <Button
                        color="success"
                        startContent={<CheckIcon className="w-4 h-4" />}
                        onPress={() =>
                          updateFeedbackStatus(selectedFeedback.id, 'resolved', adminNotes)
                        }
                      >
                        Mark Resolved
                      </Button>
                    )}

                  {selectedFeedback.status !== 'closed' && (
                    <Button
                      color="danger"
                      variant="flat"
                      startContent={<XIcon className="w-4 h-4" />}
                      onPress={() =>
                        updateFeedbackStatus(selectedFeedback.id, 'closed', adminNotes)
                      }
                    >
                      Close
                    </Button>
                  )}
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
