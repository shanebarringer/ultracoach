'use client'

import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Avatar, Button, Card, CardBody, Chip, Input } from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { toast } from 'sonner'

import { useMemo } from 'react'

import { api } from '@/lib/api-client'
import {
  availableRunnersAtom,
  connectedRunnersAtom,
  connectingRunnerIdsAtom,
  runnerSearchTermAtom,
} from '@/lib/atoms/index'
import type { User } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AsyncRunnerSelector')

// Define Runner type at module level for reuse and better type safety
interface AvailableRunner {
  id: string
  name?: string
  fullName?: string
  email?: string
}

// Type guard to validate runner objects from API responses
function isValidRunner(obj: unknown): obj is AvailableRunner {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as AvailableRunner).id === 'string'
  )
}

interface AsyncRunnerSelectorProps {
  onRelationshipCreated?: () => void
  user: User
}

/**
 * Async RunnerSelector component that uses Suspense
 * This component reads from the async atom directly and throws promises
 */
export function AsyncRunnerSelector({ onRelationshipCreated, user }: AsyncRunnerSelectorProps) {
  // Read from async atom - this will suspend if data is loading
  const availableRunners = useAtomValue(availableRunnersAtom)
  const [searchTerm, setSearchTerm] = useAtom(runnerSearchTermAtom)
  const [connectingIds, setConnectingIds] = useAtom(connectingRunnerIdsAtom)
  const refreshConnectedRunners = useSetAtom(connectedRunnersAtom)
  const refreshAvailableRunners = useSetAtom(availableRunnersAtom)

  // Filter runners based on search term using useMemo for performance
  // Uses type guard for safe runtime validation of API response data
  // Note: availableRunnersAtom returns User[] but API response has different shape
  const filteredRunners = useMemo((): AvailableRunner[] => {
    if (!Array.isArray(availableRunners)) return []

    // Cast to unknown first to bypass strict type checking, then validate with type guard
    // This is safe because isValidRunner performs runtime validation
    const runners = (availableRunners as unknown[]).filter(isValidRunner)

    // Apply search filter on validated runners
    return runners.filter(
      runner =>
        runner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        runner.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        runner.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [availableRunners, searchTerm])

  const handleConnectToRunner = async (runnerId: string) => {
    // Verify user before attempting connection
    if (!user || user.userType !== 'coach') {
      toast.error('You must be logged in as a coach to connect with runners')
      return
    }

    setConnectingIds((prev: Set<string>) => new Set(prev).add(runnerId))

    try {
      // Use environment-based timeout: 30s dev, 10s prod
      const timeout = process.env.NODE_ENV === 'development' ? 30000 : 10000

      await api.post(
        '/api/coach-runners',
        {
          target_user_id: runnerId,
          relationship_type: 'standard',
        },
        { suppressGlobalToast: true, timeout }
      )

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

  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlusIcon className="h-6 w-6 text-secondary" />
            <h3 className="text-xl font-semibold" data-testid="find-runners-heading">
              Find Runners
            </h3>
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
