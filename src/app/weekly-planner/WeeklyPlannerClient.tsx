'use client'

import { Avatar, Button, Card, CardBody, CardHeader, Chip, Select, SelectItem } from '@heroui/react'
import { useAtomValue } from 'jotai'
import { CalendarDaysIcon, FlagIcon, TrendingUpIcon, UsersIcon } from 'lucide-react'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import { connectedRunnersAtom } from '@/lib/atoms/index'
import type { User } from '@/lib/supabase'

export default function WeeklyPlannerClient() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'grid' | 'dropdown'>('grid')
  const runners = useAtomValue(connectedRunnersAtom)
  const runnersArray = Array.isArray(runners) ? runners : []

  const handleRunnerSelection = (keys: 'all' | Set<React.Key>) => {
    if (keys !== 'all' && keys.size > 0) {
      const selectedRunnerId = Array.from(keys)[0] as string
      if (typeof selectedRunnerId !== 'string') return
      router.push(`/weekly-planner/${selectedRunnerId}`)
    }
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 lg:py-8">
        <Card
          className="mb-4 lg:mb-6 bg-content1 border-l-4 border-l-primary"
          data-testid="weekly-planner-selection"
        >
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
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 flex-shrink-0">
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
                      aria-pressed={viewMode === 'grid'}
                      className="focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                    >
                      Grid View
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'dropdown' ? 'solid' : 'flat'}
                      color="secondary"
                      onPress={() => setViewMode('dropdown')}
                      aria-pressed={viewMode === 'dropdown'}
                      className="focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
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
                  startContent={<UsersIcon className="w-4 h-4" aria-hidden="true" />}
                  aria-label="Select training partner"
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
                  Use the dropdown above to quickly jump to any training partner&apos;s weekly
                  planner.
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
                    data-testid="runner-card"
                  >
                    <CardBody className="p-3 lg:p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={runner.full_name || 'User'}
                          size="sm"
                          className="bg-primary text-white"
                        />
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold text-foreground text-sm lg:text-base truncate"
                            data-testid="runner-name"
                          >
                            {runner.full_name || 'User'}
                          </h3>
                          <p
                            className="text-xs lg:text-sm text-foreground/70 truncate"
                            data-testid="runner-email"
                          >
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
      </div>
    </Layout>
  )
}
