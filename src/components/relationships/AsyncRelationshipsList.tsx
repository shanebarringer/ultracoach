'use client'

import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Avatar, Button, Card, CardBody, Chip, Tab, Tabs } from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { toast } from 'sonner'

import { useMemo, useState } from 'react'

import { relationshipsAsyncAtom, relationshipsAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { RelationshipData } from '@/types/relationships'

const logger = createLogger('AsyncRelationshipsList')

interface AsyncRelationshipsListProps {
  onRelationshipUpdated?: () => void
}

/**
 * Async RelationshipsList component that uses Suspense
 * This component reads from the async atom directly and throws promises
 */
export function AsyncRelationshipsList({ onRelationshipUpdated }: AsyncRelationshipsListProps) {
  // Read from async atom - this will suspend if data is loading
  const relationshipsData = useAtomValue(relationshipsAsyncAtom)
  const [relationships, setRelationships] = useAtom(relationshipsAtom)

  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'active' | 'inactive'>('all')

  // Use the fetched data or fallback to atom data
  const currentRelationships = relationshipsData.length > 0 ? relationshipsData : relationships

  // Refresh relationships function
  const refreshRelationships = async () => {
    try {
      const response = await fetch('/api/coach-runners')
      if (response.ok) {
        const data = await response.json()
        setRelationships(data.relationships || [])
      }
    } catch (error) {
      logger.error('Failed to refresh relationships:', error)
    }
  }

  const updateRelationshipStatus = async (
    relationshipId: string,
    newStatus: 'active' | 'inactive'
  ) => {
    setUpdatingIds(prev => new Set(prev).add(relationshipId))

    try {
      const response = await fetch(`/api/coach-runners/${relationshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update relationship')
      }

      // Refresh the relationships atom to get updated data
      refreshRelationships()

      toast.success(`Relationship ${newStatus === 'active' ? 'accepted' : 'declined'}!`)
      onRelationshipUpdated?.()
    } catch (error) {
      logger.error('Error updating relationship:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update relationship')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(relationshipId)
        return newSet
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'active':
        return 'success'
      case 'inactive':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />
      case 'active':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'inactive':
        return <XCircleIcon className="h-4 w-4" />
      default:
        return null
    }
  }

  // Use useMemo for filtered relationships for better performance
  const filteredRelationships = useMemo(() => {
    return currentRelationships.filter((rel: RelationshipData) => {
      if (selectedTab === 'all') return true
      return rel.status === selectedTab
    })
  }, [currentRelationships, selectedTab])

  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <UserGroupIcon className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold">My Relationships</h3>
          </div>

          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={key => setSelectedTab(key as typeof selectedTab)}
            variant="underlined"
            className="mb-4"
          >
            <Tab key="all" title="All" />
            <Tab key="pending" title="Pending" />
            <Tab key="active" title="Active" />
            <Tab key="inactive" title="Inactive" />
          </Tabs>

          {filteredRelationships.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-default-400">
                No {selectedTab === 'all' ? '' : selectedTab} relationships found.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRelationships.map((relationship: RelationshipData) => (
                <div
                  key={relationship.id}
                  className="flex items-center gap-4 p-4 bg-default-50 rounded-lg"
                >
                  <Avatar
                    name={relationship.other_party.name}
                    size="md"
                    className="flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {relationship.other_party.full_name || relationship.other_party.name}
                      </h4>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={relationship.other_party.role === 'coach' ? 'primary' : 'secondary'}
                      >
                        {relationship.other_party.role}
                      </Chip>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={getStatusColor(relationship.status)}
                        startContent={getStatusIcon(relationship.status)}
                      >
                        {relationship.status}
                      </Chip>
                    </div>
                    <p className="text-sm text-default-600 truncate">
                      {relationship.other_party.email}
                    </p>
                    {relationship.notes && (
                      <p className="text-xs text-default-500 mt-1 truncate">{relationship.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {relationship.status === 'pending' && (
                      <>
                        <Button
                          color="success"
                          size="sm"
                          onClick={() => updateRelationshipStatus(relationship.id, 'active')}
                          isLoading={updatingIds.has(relationship.id)}
                          disabled={updatingIds.has(relationship.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          color="danger"
                          variant="flat"
                          size="sm"
                          onClick={() => updateRelationshipStatus(relationship.id, 'inactive')}
                          isLoading={updatingIds.has(relationship.id)}
                          disabled={updatingIds.has(relationship.id)}
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {relationship.status === 'active' && (
                      <Button
                        color="primary"
                        variant="flat"
                        size="sm"
                        startContent={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
                        as="a"
                        href={`/chat/${relationship.other_party.id}`}
                      >
                        Message
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
