'use client'

import { Card, CardHeader } from '@heroui/react'
import { CalendarDaysIcon } from 'lucide-react'

import { useState } from 'react'

import WeeklyWorkoutOverview from '@/components/coach/WeeklyWorkoutOverview'
import Layout from '@/components/layout/Layout'
import { createLogger } from '@/lib/logger'

const logger = createLogger('WeeklyOverviewPageClient')

interface WeeklyOverviewPageClientProps {
  user: {
    id: string
    email: string
    name: string | null
    role: 'coach' | 'runner'
  }
}

export default function WeeklyOverviewPageClient({ user }: WeeklyOverviewPageClientProps) {
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Get current week's Monday
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday
  })

  logger.debug('WeeklyOverviewPageClient loaded', {
    userId: user.id,
    currentWeek: currentWeek.toISOString(),
  })

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                  🏔️ Weekly Expedition Overview
                </h1>
                <p className="text-foreground/70 mt-1 text-lg">
                  Monitor your athletes&apos; training progress and expedition achievements
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Weekly Overview Component */}
        <WeeklyWorkoutOverview
          coach={user}
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
        />
      </div>
    </Layout>
  )
}
