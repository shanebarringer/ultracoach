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
import { CalendarDaysIcon, FlagIcon, TrendingUpIcon, UsersIcon } from 'lucide-react'

import { useEffect, useState } from 'react'
import { Suspense } from 'react'

import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import { useSession } from '@/hooks/useBetterSession'
import { connectedRunnersAtom } from '@/lib/atoms/index'
import type { User } from '@/lib/supabase'

export default function WeeklyPlannerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.userType === 'runner') {
      // Runners see their own weekly training view
      router.push(`/weekly-planner/${session.user.id}`)
      return
    }

    if (session.user.userType !== 'coach') {
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

  if (!session || session.user.userType !== 'coach') {
    return null
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 lg:py-8">
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner size="lg" color="secondary" label="Loading your expedition team..." />
            </div>
          }
        >
          <RunnersPanel />
        </Suspense>
      </div>
    </Layout>
  )
}

function RunnersPanel() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'grid' | 'dropdown'>('grid')
  const runners = useAtomValue(connectedRunnersAtom)
  const runnersArray = Array.isArray(runners) ? runners : []

  const handleRunnerSelection = (keys: 'all' | Set<React.Key>) => {
    if (keys !== 'all' && keys.size > 0) {
      const selectedRunnerId = Array.from(keys)[0] as string
      router.push(`/weekly-planner/${selectedRunnerId}`)
    }
  }

  return (
    <Card className="mb-4 lg:mb-6 bg-content1 border-l-4 border-l-primary">
      <CardHeader className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 w-full">
          {/* Header Row: Title and Action Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-4">
            {/* Left: Page Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <CalendarDaysIcon
                className="w-6 lg:w-8 h-6 lg:h-8 text-primary flex-shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h1 className="text-lg lg:text-2xl font-bold text-foreground">
                  🏔️ Weekly Planner
                </h1>
                <p className="text-foreground/70 text-xs lg:text-sm">
                  Select a training partner for weekly planning
                </p>
              </div>
            </div>

            {/* Right: Partner Count and View Mode Buttons - Right-aligned */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
              {/* Partner Count Badge */}
              <div className="flex items-center gap-2">
                <UsersIcon
                  className="w-4 lg:w-5 h-4 lg:h-5 text-secondary"
                  aria-hidden="true"
                />
                <span className="text-xs lg:text-sm font-medium text-foreground/70">
                  {runnersArray.length} Partner{runnersArray.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* View Mode Toggle Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'solid' : 'flat'}
                  color="secondary"
                  onPress={() => setViewMode('grid')}
                >
                  Grid View
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'dropdown' ? 'solid' : 'flat'}
                  color="secondary"
                  onPress={() => setViewMode('dropdown')}
                >
                  Quick Select
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Selection Dropdown - Full width when visible */}
          {viewMode === 'dropdown' && (
            <Select
              placeholder="Choose your training partner..."
              className="w-full sm:max-w-md"
              variant="bordered"
              size="md"
              onSelectionChange={handleRunnerSelection}
              startContent={<UsersIcon className="w-4 h-4" />}
            >
              {runnersArray.map((runner: User) => (
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
        {runnersArray.length === 0 ? (
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
          <div className="text-center py-8 lg:py-12">
            <div className="w-12 lg:w-16 h-12 lg:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-6 lg:w-8 h-6 lg:h-8 text-primary/50" />
            </div>
            <h3 className="text-base lg:text-lg font-semibold text-foreground mb-2">
              Quick Selection Mode
            </h3>
            <p className="text-foreground/70 text-sm lg:text-base px-4">
              Use the dropdown above to quickly jump to any training partner’s weekly planner.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {runnersArray.map((runner: User) => (
              <Card
                key={runner.id}
                isPressable
                onPress={() => router.push(`/weekly-planner/${runner.id}`)}
                className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer hover:bg-content2 border border-transparent hover:border-primary/20"
              >
                <CardBody className="p-3 lg:p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={runner.full_name || 'User'}
                      size="sm"
                      className="bg-primary text-white"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm lg:text-base truncate">
                        {runner.full_name || 'User'}
                      </h3>
                      <p className="text-xs lg:text-sm text-foreground/70 truncate">
                        {runner.email}
                      </p>
                      <div className="flex items-center gap-1 lg:gap-2 mt-2">
                        <Chip
                          size="sm"
                          variant="flat"
                          color="success"
                          startContent={<TrendingUpIcon className="w-3 h-3" />}
                          className="text-xs"
                        >
                          Active
                        </Chip>
                        <Chip
                          size="sm"
                          variant="flat"
                          color="secondary"
                          startContent={<FlagIcon className="w-3 h-3" />}
                          className="text-xs"
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
  )
}
