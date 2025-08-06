'use client'

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Spinner,
  Tab,
  Tabs,
} from '@heroui/react'
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
import { useAtomValue } from 'jotai'
import { loadable } from 'jotai/utils'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import { RunnerSelector } from '@/components/relationships/RunnerSelector'
import { useSession } from '@/hooks/useBetterSession'
import { connectedRunnersAtom } from '@/lib/atoms'
import type { User } from '@/lib/supabase'

// Extended User type with runner-specific fields that may be returned from API
interface RunnerWithStats extends User {
  stats?: {
    trainingPlans: number
    completedWorkouts: number
    upcomingWorkouts: number
  }
  connected_at?: string | null
}

// Create loadable atom for better UX
const connectedRunnersLoadableAtom = loadable(connectedRunnersAtom)

export default function RunnersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const runnersLoadable = useAtomValue(connectedRunnersLoadableAtom)
  const [activeTab, setActiveTab] = useState('connected')

  // Handle loading and error states from Jotai loadable
  const loading = runnersLoadable.state === 'loading'
  const runners = (runnersLoadable.state === 'hasData' ? runnersLoadable.data : []) as RunnerWithStats[]
  const error = runnersLoadable.state === 'hasError' ? runnersLoadable.error : null

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'coach') {
      router.push('/dashboard/runner')
      return
    }
  }, [status, session, router])

  // Handle refresh for RunnerSelector
  const handleRelationshipCreated = () => {
    // Force refresh of connected runners atom
    // The atom will automatically refresh on next access
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading your expedition team..." />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UsersIcon className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                    🏔️ Expedition Team
                  </h1>
                  <p className="text-foreground-600 text-lg mt-1">
                    Guide your athletes on their summit journey
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveTab('discover')}
                color="primary"
                variant="bordered"
                startContent={<PlusIcon className="w-4 h-4" />}
              >
                Connect Runners
              </Button>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" color="primary" label="Loading expedition team..." />
          </div>
        ) : runners.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardBody className="text-center py-12">
              <div className="flex justify-center mb-6">
                <div className="bg-primary/10 rounded-full p-6">
                  <UsersIcon className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No connected runners yet
              </h3>
              <p className="text-foreground-600 mb-6">
                Connect with runners to start building your expedition team
              </p>
              <div className="space-y-3">
                <Button
                  as={Link}
                  href="/dashboard/coach"
                  color="primary"
                  size="lg"
                  startContent={<UsersIcon className="w-5 h-5" />}
                >
                  Discover Available Runners
                </Button>
                <Button
                  as={Link}
                  href="/training-plans"
                  variant="bordered"
                  size="lg"
                  startContent={<RouteIcon className="w-5 h-5" />}
                >
                  View Training Plans
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={key => setActiveTab(key as string)}
            className="w-full"
            variant="underlined"
            color="primary"
          >
            <Tab key="connected" title={`My Runners (${runners.length})`}>
              <div className="mt-6">
                {runners.length === 0 ? (
                  <Card className="max-w-md mx-auto">
                    <CardBody className="text-center py-12">
                      <div className="flex justify-center mb-6">
                        <div className="bg-primary/10 rounded-full p-6">
                          <UsersIcon className="h-12 w-12 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No connected runners yet
                      </h3>
                      <p className="text-foreground-600 mb-6">
                        Connect with runners to start building your expedition team
                      </p>
                      <Button
                        onClick={() => setActiveTab('discover')}
                        color="primary"
                        size="lg"
                        startContent={<UserPlusIcon className="w-5 h-5" />}
                      >
                        Discover Runners
                      </Button>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {runners.map((runner: RunnerWithStats) => (
                      <Card
                        key={runner.id}
                        className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-secondary/60"
                      >
                        <CardBody className="p-6">
                          {/* Runner Header */}
                          <div className="flex items-center mb-6">
                            <Avatar
                              name={runner.full_name || 'User'}
                              size="lg"
                              className="bg-linear-to-br from-primary to-secondary text-white font-semibold"
                            />
                            <div className="ml-4">
                              <h3 className="text-lg font-semibold text-foreground">
                                {runner.full_name || 'User'}
                              </h3>
                              <p className="text-sm text-foreground-600">{runner.email}</p>
                              <div className="flex gap-2 mt-1">
                                <Chip size="sm" color="primary" variant="flat">
                                  🏃 Trail Runner
                                </Chip>
                                <Chip size="sm" color="success" variant="flat">
                                  ✅ Connected
                                </Chip>
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center">
                              <div className="flex flex-col items-center">
                                <RouteIcon className="w-5 h-5 text-primary mb-1" />
                                <div className="text-2xl font-bold text-primary">
                                  {runner.stats?.trainingPlans || 0}
                                </div>
                                <div className="text-xs text-foreground-600">Expeditions</div>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="flex flex-col items-center">
                                <FlagIcon className="w-5 h-5 text-success mb-1" />
                                <div className="text-2xl font-bold text-success">
                                  {runner.stats?.completedWorkouts || 0}
                                </div>
                                <div className="text-xs text-foreground-600">Summits</div>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="flex flex-col items-center">
                                <TrendingUpIcon className="w-5 h-5 text-warning mb-1" />
                                <div className="text-2xl font-bold text-warning">
                                  {runner.stats?.upcomingWorkouts || 0}
                                </div>
                                <div className="text-xs text-foreground-600">Ascents</div>
                              </div>
                            </div>
                          </div>

                          {/* Connection Info */}
                          {runner.connected_at && (
                            <div className="mb-4 p-3 bg-success/10 rounded-lg border border-success/20">
                              <p className="text-xs text-success-600">
                                Connected since {new Date(runner.connected_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              as={Link}
                              href={`/chat/${runner.id}`}
                              color="primary"
                              size="sm"
                              className="flex-1"
                              startContent={<MessageCircleIcon className="w-4 h-4" />}
                            >
                              Message
                            </Button>
                            <Button
                              as={Link}
                              href={`/training-plans?runner=${runner.id}`}
                              variant="bordered"
                              size="sm"
                              className="flex-1"
                              startContent={<MapPinIcon className="w-4 h-4" />}
                            >
                              View Plans
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
            <Tab key="discover" title="Discover Runners">
              <div className="mt-6">
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <UserPlusIcon className="w-6 h-6 text-primary" />
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">
                          Connect with New Runners
                        </h2>
                        <p className="text-foreground-600">
                          Find available runners to expand your coaching team
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <RunnerSelector onRelationshipCreated={handleRelationshipCreated} />
                  </CardBody>
                </Card>
              </div>
            </Tab>
          </Tabs>
        )}
      </div>
    </Layout>
  )
}
