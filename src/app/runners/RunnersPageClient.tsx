'use client'

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Skeleton,
  Spinner,
  Tab,
  Tabs,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import {
  FlagIcon,
  MapPinIcon,
  MessageCircleIcon,
  PlusIcon,
  RouteIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'

import { Suspense, useEffect } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import { RunnerSelector } from '@/components/relationships/RunnerSelector'
import { connectedRunnersAtom, runnersPageTabAtom } from '@/lib/atoms/index'
import type { User as BetterAuthUser } from '@/lib/better-auth-client'
import type { User as SupabaseUser } from '@/lib/supabase'
import { formatDateConsistent } from '@/lib/utils/date'
import { getDisplayNameFromEmail } from '@/lib/utils/user-names'

// Extended User type with runner-specific fields that may be returned from API
interface RunnerWithStats extends SupabaseUser {
  stats?: {
    trainingPlans: number
    completedWorkouts: number
    upcomingWorkouts: number
  }
  connected_at?: string | null
}

interface RunnersPageClientProps {
  user: BetterAuthUser
}

export default function RunnersPageClient({ user }: RunnersPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useAtom(runnersPageTabAtom)

  // Set initial tab from URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && ['connected', 'discover'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as 'connected' | 'discover')
    }
  }, [searchParams, setActiveTab])

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab)
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [activeTab, router, searchParams])

  const handleMessageRunner = (runnerId: string) => {
    router.push(`/chat/${runnerId}`)
  }

  const handlePlanWorkouts = (runnerId: string) => {
    router.push(`/weekly-planner/${runnerId}`)
  }

  const renderRunnerCard = (runner: RunnerWithStats) => {
    const displayName = runner.full_name || getDisplayNameFromEmail(runner.email)

    return (
      <Card key={runner.id} className="border border-divider hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Avatar
                size="lg"
                name={displayName}
                showFallback
                className="bg-gradient-to-r from-primary to-secondary text-white"
              />
              <div>
                <h3 className="text-xl font-semibold text-foreground">{displayName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Chip
                    variant="flat"
                    color="primary"
                    size="sm"
                    startContent={<UsersIcon size={14} />}
                  >
                    Runner
                  </Chip>
                  {runner.connected_at && (
                    <Chip variant="flat" color="success" size="sm">
                      Connected {formatDateConsistent(runner.connected_at)}
                    </Chip>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                color="primary"
                startContent={<MessageCircleIcon size={16} />}
                onPress={() => handleMessageRunner(runner.id)}
              >
                Message
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={<RouteIcon size={16} />}
                onPress={() => handlePlanWorkouts(runner.id)}
              >
                Plan Workouts
              </Button>
            </div>
          </div>
        </CardHeader>

        <Divider />

        <CardBody>
          {runner.stats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                  <TrendingUpIcon size={16} />
                  <span className="text-sm font-medium">Training Plans</span>
                </div>
                <div className="text-2xl font-bold">{runner.stats.trainingPlans}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-success mb-1">
                  <FlagIcon size={16} />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <div className="text-2xl font-bold">{runner.stats.completedWorkouts}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-warning mb-1">
                  <MapPinIcon size={16} />
                  <span className="text-sm font-medium">Upcoming</span>
                </div>
                <div className="text-2xl font-bold">{runner.stats.upcomingWorkouts}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-foreground-500">No stats available</p>
            </div>
          )}
        </CardBody>
      </Card>
    )
  }

  const renderConnectedRunners = (runners: SupabaseUser[]) => {
    if (runners.length === 0) {
      return (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-foreground-300 mb-4">
                <UsersIcon className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Connected Runners</h3>
              <p className="text-foreground-500 max-w-md mx-auto mb-6">
                You haven&apos;t connected with any runners yet. Use the &quot;Discover&quot; tab to
                find and connect with runners.
              </p>
              <Button
                color="primary"
                variant="flat"
                startContent={<UserPlusIcon size={16} />}
                onPress={() => setActiveTab('discover')}
              >
                Find Runners
              </Button>
            </div>
          </CardBody>
        </Card>
      )
    }

    return <div className="grid gap-4">{runners.map(renderRunnerCard)}</div>
  }

  function ConnectedRunnersCountChip() {
    const connected = useAtomValue(connectedRunnersAtom)
    const count = connected.length
    return (
      <Chip size="sm" variant="flat" data-testid="connected-runners-count">
        {count}
      </Chip>
    )
  }

  function ConnectedRunnersContent() {
    const connected = useAtomValue(connectedRunnersAtom)
    return renderConnectedRunners(connected)
  }

  const renderAvailableRunners = () => (
    <Card>
      <CardHeader className="bg-gradient-to-r from-success/10 to-primary/10">
        <div className="flex items-center gap-2">
          <UserPlusIcon className="w-5 h-5 text-success" />
          <h2 className="text-xl font-semibold">Connect with Runners</h2>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="p-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          }
        >
          <RunnerSelector user={user} />
        </Suspense>
      </CardBody>
    </Card>
  )

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Your Runners</h1>
              <p className="text-foreground-600">Manage your connected runners and find new ones</p>
            </div>
            <Button
              color="primary"
              startContent={<PlusIcon size={16} />}
              onPress={() => setActiveTab('discover')}
            >
              Connect Runner
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={key => setActiveTab(key as 'connected' | 'discover')}
          className="mb-6"
          classNames={{
            tabList: 'bg-content1 border border-divider',
            cursor: 'bg-primary',
            tab: 'data-[selected=true]:text-primary-foreground',
          }}
        >
          <Tab
            key="connected"
            title={
              <div className="flex items-center gap-2">
                <UsersIcon size={16} />
                <span>Connected Runners</span>
                <Suspense
                  fallback={
                    <Chip size="sm" variant="flat">
                      0
                    </Chip>
                  }
                >
                  <ConnectedRunnersCountChip />
                </Suspense>
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="space-y-4" data-testid="connected-runners-skeleton">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border border-divider">
                      <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-40 rounded" />
                              <Skeleton className="h-4 w-28 rounded" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-24 rounded" />
                            <Skeleton className="h-8 w-28 rounded" />
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              }
            >
              <ConnectedRunnersContent />
            </Suspense>
          </Tab>

          <Tab
            key="discover"
            title={
              <div className="flex items-center gap-2">
                <UserPlusIcon size={16} />
                <span>Discover Runners</span>
              </div>
            }
          >
            {renderAvailableRunners()}
          </Tab>
        </Tabs>
      </div>
    </Layout>
  )
}
