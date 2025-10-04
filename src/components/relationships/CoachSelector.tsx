'use client'

import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Avatar, Button, Card, CardBody, Chip, Input } from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { toast } from 'sonner'

import { useMemo, useState } from 'react'

import { availableCoachesAtom, relationshipsAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { User } from '@/lib/supabase'

const logger = createLogger('CoachSelector')

interface CoachSelectorProps {
  onRelationshipCreated?: () => void
}

export function CoachSelector({ onRelationshipCreated }: CoachSelectorProps) {
  // Use Jotai atoms instead of local state
  const coaches = useAtomValue(availableCoachesAtom)
  const setRelationships = useSetAtom(relationshipsAtom)
  const [, refreshAvailableCoaches] = useAtom(availableCoachesAtom)

  const [searchTerm, setSearchTerm] = useState('')
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set())

  // Derive loading state from the atom's loadable state
  const loading = coaches.length === 0

  // Refresh function for relationships
  const refreshRelationshipData = async () => {
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

  // Use useMemo for filtered coaches for better performance
  const filteredCoaches = useMemo(() => {
    return coaches.filter(
      (coach: User) =>
        coach.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coach.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [coaches, searchTerm])

  // Remove fetchAvailableCoaches - the atom handles this automatically

  const handleConnectToCoach = async (coachId: string) => {
    setConnectingIds(prev => new Set(prev).add(coachId))

    try {
      const response = await fetch('/api/coach-runners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_user_id: coachId,
          relationship_type: 'standard',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to connect to coach')
      }

      toast.success('Connection request sent to coach!')

      // Refresh both available coaches and relationships atoms
      refreshRelationshipData()
      refreshAvailableCoaches()

      // Notify parent component
      onRelationshipCreated?.()
    } catch (error) {
      logger.error('Error connecting to coach:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect to coach')
    } finally {
      setConnectingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(coachId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-default-200 rounded animate-pulse" />
              <div className="h-6 w-32 bg-default-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-default-200 rounded animate-pulse" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-default-50 rounded-lg">
                <div className="h-12 w-12 bg-default-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-default-200 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-default-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-default-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlusIcon className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold" data-testid="find-coach-section">
              Find a Coach
            </h3>
          </div>

          <Input
            placeholder="Search coaches by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            startContent={<MagnifyingGlassIcon className="h-4 w-4 text-default-400" />}
            variant="bordered"
            className="mb-4"
          />

          {filteredCoaches.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-default-400 mb-2">
                {searchTerm
                  ? 'No coaches found matching your search.'
                  : 'No available coaches found.'}
              </div>
              {searchTerm && (
                <Button variant="flat" size="sm" onClick={() => setSearchTerm('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCoaches.map((coach: User) => (
                <div
                  key={coach.id}
                  className="flex items-center gap-4 p-4 bg-default-50 hover:bg-default-100 rounded-lg transition-colors"
                >
                  <Avatar
                    name={coach.full_name || coach.email}
                    size="md"
                    className="flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {coach.full_name || coach.email}
                      </h4>
                      <Chip size="sm" variant="flat" color="primary">
                        Coach
                      </Chip>
                    </div>
                    <p className="text-sm text-default-600 truncate">{coach.email}</p>
                  </div>

                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => handleConnectToCoach(coach.id)}
                    isLoading={connectingIds.has(coach.id)}
                    disabled={connectingIds.has(coach.id)}
                    data-testid="coach-connect-button"
                  >
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
