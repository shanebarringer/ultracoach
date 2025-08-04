'use client'

import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Avatar, Button, Card, CardBody, Chip, Input } from '@heroui/react'
import { toast } from 'sonner'

import { useEffect, useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'

interface Runner {
  id: string
  name: string
  fullName: string | null
  email: string
  createdAt: string
}

interface RunnerSelectorProps {
  onRelationshipCreated?: () => void
}

export function RunnerSelector({ onRelationshipCreated }: RunnerSelectorProps) {
  const { data: session, status } = useSession()
  const [runners, setRunners] = useState<Runner[]>([])
  const [filteredRunners, setFilteredRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Only fetch when session is ready and user is a coach
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'coach') {
      setLoading(false)
      return
    }
    fetchAvailableRunners()
  }, [session, status])

  useEffect(() => {
    // Filter runners based on search term
    const filtered = runners.filter(
      runner =>
        runner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        runner.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        runner.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredRunners(filtered)
  }, [runners, searchTerm])

  const fetchAvailableRunners = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/runners/available', {
        credentials: 'include', // Ensure cookies are sent with the request
      })

      if (!response.ok) {
        console.error('RunnerSelector fetch error:', {
          status: response.status,
          statusText: response.statusText,
          requestUrl: '/api/runners/available',
        })
        throw new Error('Failed to fetch available runners')
      }

      const data = await response.json()
      setRunners(data.runners)
    } catch (error) {
      console.error('Error fetching runners:', error)
      toast.error('Failed to load available runners')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectToRunner = async (runnerId: string) => {
    // Verify session before attempting connection
    if (!session?.user || session.user.role !== 'coach') {
      toast.error('You must be logged in as a coach to connect with runners')
      return
    }

    setConnectingIds(prev => new Set(prev).add(runnerId))

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
        console.error('RunnerSelector connection error:', {
          status: response.status,
          statusText: response.statusText,
          error: error,
          runnerId,
          requestUrl: '/api/coach-runners',
        })
        throw new Error(error.error || 'Failed to connect to runner')
      }

      toast.success('Connection request sent to runner!')

      // Remove the runner from the available list
      setRunners(prev => prev.filter(runner => runner.id !== runnerId))

      // Notify parent component
      onRelationshipCreated?.()
    } catch (error) {
      console.error('Error connecting to runner:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect to runner')
    } finally {
      setConnectingIds(prev => {
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
