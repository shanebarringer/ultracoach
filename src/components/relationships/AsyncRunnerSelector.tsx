'use client'

import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Avatar, Button, Card, CardBody, Chip, Input } from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { toast } from 'sonner'

import { useMemo } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import {
  availableRunnersAtom,
  connectedRunnersAtom,
  connectingRunnerIdsAtom,
  runnerSearchTermAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AsyncRunnerSelector')

interface AsyncRunnerSelectorProps {
  onRelationshipCreated?: () => void
}

/**
 * Async RunnerSelector component that uses Suspense
 * This component reads from the async atom directly and throws promises
 */
export function AsyncRunnerSelector({ onRelationshipCreated }: AsyncRunnerSelectorProps) {
  const { data: session, status } = useSession()

  // Read from async atom - this will suspend if data is loading
  const availableRunners = useAtomValue(availableRunnersAtom)
  const [searchTerm, setSearchTerm] = useAtom(runnerSearchTermAtom)
  const [connectingIds, setConnectingIds] = useAtom(connectingRunnerIdsAtom)
  const refreshConnectedRunners = useSetAtom(connectedRunnersAtom)
  const refreshAvailableRunners = useSetAtom(availableRunnersAtom)

  // Filter runners based on search term using useMemo for performance
  const filteredRunners = useMemo(() => {
    if (!Array.isArray(availableRunners)) return []

    interface Runner {
      id: string
      name?: string
      fullName?: string
      email?: string
    }

    return (availableRunners as Runner[]).filter(
      (runner: Runner) =>
        runner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        runner.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        runner.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [availableRunners, searchTerm])

  const handleConnectToRunner = async (runnerId: string) => {
    // Verify session before attempting connection
    if (!session?.user || session.user.role !== 'coach') {
      toast.error('You must be logged in as a coach to connect with runners')
      return
    }

    setConnectingIds((prev: Set<string>) => new Set(prev).add(runnerId))

    try {
      const response = await fetch('/api/coach-runners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent with the request
        body: JSON.stringify({
          target_user_id: runnerId,
          relationship_type: 'standard',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        logger.error('Failed to connect to runner:', {
          status: response.status,
          statusText: response.statusText,
          error: error,
          runnerId,
          requestUrl: '/api/coach-runners',
        })
        throw new Error(error.error || 'Failed to connect to runner')
      }

      logger.info('Connection request sent successfully', { runnerId })
      toast.success('Connection request sent to runner!')

      // Refresh the connected runners atom to update dashboard
      refreshConnectedRunners()

      // Also refresh available runners to remove the connected runner
      refreshAvailableRunners()

      // Notify parent component to refresh connected runners
      onRelationshipCreated?.()
    } catch (error) {
      logger.error('Error connecting to runner:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect to runner')
    } finally {
      setConnectingIds((prev: Set<string>) => {
        const newSet = new Set(prev)
        newSet.delete(runnerId)
        return newSet
      })
    }
  }

  // Show loading while session is being fetched
  if (status === 'loading') {
    return (
      <Card className="w-full">
        <CardBody className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="h-6 w-6 bg-primary-200 rounded animate-pulse mx-auto mb-2" />
              <p className="text-sm text-default-600">Checking authentication...</p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Show unauthorized message if not a coach
  if (!session?.user || session.user.role !== 'coach') {
    return (
      <Card className="w-full">
        <CardBody className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-sm text-default-600">Only coaches can browse for runners</p>
            </div>
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
            <UserPlusIcon className="h-6 w-6 text-secondary" />
            <h3 className="text-xl font-semibold">Find Runners</h3>
          </div>

          <Input
            placeholder="Search runners by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            startContent={<MagnifyingGlassIcon className="h-4 w-4 text-default-400" />}
            variant="bordered"
            className="mb-4"
          />

          {filteredRunners.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-default-400 mb-2">
                {searchTerm
                  ? 'No runners found matching your search.'
                  : 'No available runners found.'}
              </div>
              {searchTerm && (
                <Button variant="flat" size="sm" onClick={() => setSearchTerm('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRunners.map(runner => (
                <div
                  key={runner.id}
                  className="flex items-center gap-4 p-4 bg-default-50 hover:bg-default-100 rounded-lg transition-colors"
                >
                  <Avatar name={runner.name} size="md" className="flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {runner.fullName || runner.name}
                      </h4>
                      <Chip size="sm" variant="flat" color="secondary">
                        Runner
                      </Chip>
                    </div>
                    <p className="text-sm text-default-600 truncate">{runner.email}</p>
                  </div>

                  <Button
                    color="secondary"
                    size="sm"
                    onClick={() => handleConnectToRunner(runner.id)}
                    isLoading={connectingIds.has(runner.id)}
                    disabled={connectingIds.has(runner.id)}
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
