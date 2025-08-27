'use client'

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Select,
  SelectItem,
  Spinner,
} from '@heroui/react'
// Removed classNames import since we're using dynamic routes
import { useAtomValue } from 'jotai'
import { loadable } from 'jotai/utils'
import { CalendarDaysIcon, FlagIcon, TrendingUpIcon, UsersIcon } from 'lucide-react'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import { useSession } from '@/hooks/useBetterSession'
import { connectedRunnersAtom } from '@/lib/atoms'
import type { User } from '@/lib/supabase'

// Create loadable atom for better UX
const connectedRunnersLoadableAtom = loadable(connectedRunnersAtom)

export default function WeeklyPlannerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const runnersLoadable = useAtomValue(connectedRunnersLoadableAtom)
  const [viewMode, setViewMode] = useState<'grid' | 'dropdown'>('grid')

  // Handle loading and error states from Jotai loadable
  const loading = runnersLoadable.state === 'loading'
  const runners = runnersLoadable.state === 'hasData' ? runnersLoadable.data : []
  const error = runnersLoadable.state === 'hasError' ? runnersLoadable.error : null

  const handleRunnerSelection = (keys: 'all' | Set<React.Key>) => {
    if (keys !== 'all' && keys.size > 0) {
      const selectedRunnerId = Array.from(keys)[0] as string
      router.push(`/weekly-planner/${selectedRunnerId}`)
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role === 'runner') {
      // Runners see their own weekly training view
      router.push(`/weekly-planner/${session.user.id}`)
      return
    }

    if (session.user.role !== 'coach') {
      router.push('/dashboard')
      return
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading expedition planning..." />
        </div>
      </Layout>
    )
  }

  if (!session || session.user.role !== 'coach') {
    return null
  }

  // Handle error state
  if (error) {
    return (
      <Layout>
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <Card className="border-danger-200 bg-danger-50">
            <CardBody className="text-center py-12">
              <div className="text-danger-600 mb-4">Failed to load runners</div>
              <Button color="primary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardBody>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Consolidated Header */}
        <Card className="mb-6 bg-content1 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-3">
                <CalendarDaysIcon className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    🏔️ Weekly Expedition Planner
                  </h1>
                  <p className="text-foreground/70 text-sm">
                    Select a training partner to architect their weekly summit plan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-secondary" />
                <span className="text-sm font-medium text-foreground/70">
                  {runners.length} Training Partner{runners.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* View Mode Toggle and Quick Selection */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'solid' : 'flat'}
                  color="secondary"
                  onClick={() => setViewMode('grid')}
                >
                  Grid View
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'dropdown' ? 'solid' : 'flat'}
                  color="secondary"
                  onClick={() => setViewMode('dropdown')}
                >
                  Quick Select
                </Button>
              </div>

              {viewMode === 'dropdown' && runners.length > 0 && (
                <Select
                  placeholder="Choose your training partner..."
                  className="max-w-sm"
                  variant="bordered"
                  size="sm"
                  onSelectionChange={handleRunnerSelection}
                  startContent={<UsersIcon className="w-4 h-4" />}
                >
                  {runners.map((runner: User) => (
                    <SelectItem key={runner.id} textValue={runner.full_name || runner.email}>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={runner.full_name || 'User'}
                          size="sm"
                          className="bg-primary text-white"
                        />
                        <div>
                          <div className="font-medium">{runner.full_name || 'User'}</div>
                          <div className="text-xs text-foreground/60">{runner.email}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" color="secondary" label="Loading your expedition team..." />
              </div>
            ) : runners.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-8 h-8 text-secondary/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Training Partners</h3>
                <p className="text-foreground/70">
                  Create training plans to connect with runners and start expedition planning.
                </p>
              </div>
            ) : viewMode === 'dropdown' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-8 h-8 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Quick Selection Mode</h3>
                <p className="text-foreground/70">
                  Use the dropdown above to quickly jump to any training partner&apos;s weekly
                  planner.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {runners.map((runner: User) => (
                  <Card
                    key={runner.id}
                    isPressable
                    onPress={() => router.push(`/weekly-planner/${runner.id}`)}
                    className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer hover:bg-content2 border border-transparent hover:border-primary/20"
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={runner.full_name || 'User'}
                          size="md"
                          className="bg-primary text-white"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {runner.full_name || 'User'}
                          </h3>
                          <p className="text-sm text-foreground/70">{runner.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Chip
                              size="sm"
                              variant="flat"
                              color="success"
                              startContent={<TrendingUpIcon className="w-3 h-3" />}
                            >
                              Active
                            </Chip>
                            <Chip
                              size="sm"
                              variant="flat"
                              color="secondary"
                              startContent={<FlagIcon className="w-3 h-3" />}
                            >
                              Training
                            </Chip>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Layout>
  )
}
