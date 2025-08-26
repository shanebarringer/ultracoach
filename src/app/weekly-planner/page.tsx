'use client'

import { Avatar, Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react'
// Removed classNames import since we're using dynamic routes
import { useAtomValue } from 'jotai'
import { loadable } from 'jotai/utils'
import {
  CalendarDaysIcon,
  FlagIcon,
  MapPinIcon,
  RouteIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'

import { useEffect } from 'react'

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
  // Remove selectedRunner since we're now using dynamic routes
  // Handle loading and error states from Jotai loadable
  const loading = runnersLoadable.state === 'loading'
  const runners = runnersLoadable.state === 'hasData' ? runnersLoadable.data : []
  const error = runnersLoadable.state === 'hasError' ? runnersLoadable.error : null

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
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Hero Section */}
          <Card className="lg:col-span-3 bg-content1 border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CalendarDaysIcon className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                    🏔️ Weekly Expedition Planner
                  </h1>
                  <p className="text-foreground/70 mt-1 text-base lg:text-lg">
                    Architect your team&apos;s weekly training summit - strategic workout planning
                    for peak performance
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Runner Selection */}
        <Card className="mb-6 bg-content1 border-t-4 border-t-secondary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UsersIcon className="w-6 h-6 text-secondary" />
              <h2 className="text-xl font-semibold text-foreground">
                Select Your Training Partner
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" color="secondary" label="Loading your expedition team..." />
              </div>
            ) : runners.length === 0 ? (
              <div className="text-center py-8">
                <RouteIcon className="mx-auto w-12 h-12 text-default-400 mb-4" />
                <p className="text-foreground/70 text-lg">
                  No training partners found. Create training plans to connect with runners.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {runners.map((runner: User) => (
                  <Card
                    key={runner.id}
                    isPressable
                    onPress={() => router.push(`/weekly-planner/${runner.id}`)}
                    className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer hover:bg-content2 border-l-4 border-l-transparent"
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

        {!loading && runners.length > 0 && (
          <Card className="bg-content1 border-t-4 border-t-default">
            <CardBody className="text-center py-12">
              <CalendarDaysIcon className="mx-auto w-16 h-16 text-default-400 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Ready to Plan Your Next Expedition?
              </h3>
              <p className="text-foreground/70 text-lg mb-4">
                Select a training partner from above to architect their weekly summit plan.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-foreground/60">
                <MapPinIcon className="w-4 h-4" />
                <span>Strategic weekly planning for peak performance</span>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </Layout>
  )
}
