'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Chip, 
  Spinner, 
  Avatar 
} from '@heroui/react'
import { 
  UsersIcon, 
  MessageCircleIcon, 
  MapPinIcon, 
  TrendingUpIcon, 
  RouteIcon,
  FlagIcon
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import type { User } from '@/lib/supabase'

interface RunnerWithStats extends User {
  stats?: {
    trainingPlans: number
    completedWorkouts: number
    upcomingWorkouts: number
  }
}

export default function RunnersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [runners, setRunners] = useState<RunnerWithStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRunners = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/runners')
      
      if (!response.ok) {
        console.error('Failed to fetch runners:', response.statusText)
        return
      }

      const data = await response.json()
      setRunners(data.runners || [])
    } catch (error) {
      console.error('Error fetching runners:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

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

    fetchRunners()
  }, [session, status, router, fetchRunners])

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  🏔️ Expedition Team
                </h1>
                <p className="text-foreground-600 text-lg mt-1">
                  Guide your athletes on their summit journey
                </p>
              </div>
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
              <h3 className="text-lg font-semibold text-foreground mb-2">No team members yet</h3>
              <p className="text-foreground-600 mb-6">Start building your expedition team by creating training plans</p>
              <Button 
                as={Link}
                href="/training-plans"
                color="primary"
                size="lg"
                startContent={<RouteIcon className="w-5 h-5" />}
              >
                Create Your First Training Plan
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {runners.map((runner) => (
              <Card
                key={runner.id}
                className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-secondary/60"
              >
                <CardBody className="p-6">
                  {/* Runner Header */}
                  <div className="flex items-center mb-6">
                    <Avatar
                      name={runner.full_name}
                      size="lg"
                      className="bg-gradient-to-br from-primary to-secondary text-white font-semibold"
                    />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-foreground">{runner.full_name}</h3>
                      <p className="text-sm text-foreground-600">{runner.email}</p>
                      <Chip size="sm" color="primary" variant="flat" className="mt-1">
                        🏃 Trail Runner
                      </Chip>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="flex flex-col items-center">
                        <RouteIcon className="w-5 h-5 text-primary mb-1" />
                        <div className="text-2xl font-bold text-primary">{runner.stats?.trainingPlans || 0}</div>
                        <div className="text-xs text-foreground-600">Expeditions</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex flex-col items-center">
                        <FlagIcon className="w-5 h-5 text-success mb-1" />
                        <div className="text-2xl font-bold text-success">{runner.stats?.completedWorkouts || 0}</div>
                        <div className="text-xs text-foreground-600">Summits</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex flex-col items-center">
                        <TrendingUpIcon className="w-5 h-5 text-warning mb-1" />
                        <div className="text-2xl font-bold text-warning">{runner.stats?.upcomingWorkouts || 0}</div>
                        <div className="text-xs text-foreground-600">Ascents</div>
                      </div>
                    </div>
                  </div>

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
                      href="/training-plans"
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
    </Layout>
  )
}