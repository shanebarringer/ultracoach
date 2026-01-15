'use client'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { Button, ButtonGroup, Card, CardBody, CardHeader, Chip, Input } from '@heroui/react'
import classNames from 'classnames'
import { useAtom, useAtomValue } from 'jotai'

import { memo, useCallback, useMemo } from 'react'

import Link from 'next/link'

import {
  type AthleteStatusFilter,
  athleteCurrentPageAtom,
  athleteSearchTermAtom,
  athleteStatusCountsAtom,
  athleteStatusFilterAtom,
  athleteViewModeAtom,
  coachDashboardStateAtom,
  paginatedAthletesAtom,
} from '@/lib/atoms/dashboard'

import { AthleteCard } from './AthleteCard'

/**
 * Athletes grid component with search, filter, pagination, and view mode toggle.
 * Designed for coaches to manage and view their athletes efficiently.
 */
function AthletesGridComponent() {
  const [searchTerm, setSearchTerm] = useAtom(athleteSearchTermAtom)
  const [statusFilter, setStatusFilter] = useAtom(athleteStatusFilterAtom)
  const [viewMode, setViewMode] = useAtom(athleteViewModeAtom)
  const [currentPage, setCurrentPage] = useAtom(athleteCurrentPageAtom)
  const statusCounts = useAtomValue(athleteStatusCountsAtom)
  const paginatedData = useAtomValue(paginatedAthletesAtom)
  const { athletesPerPage } = useAtomValue(coachDashboardStateAtom)

  // Search handler - updates search term immediately (atom handles page reset)
  const handleSearchChange = useCallback(
    (value: string) => {
      // Simple immediate update - the atom handles page reset
      setSearchTerm(value)
    },
    [setSearchTerm]
  )

  // Filter chip data
  const filterChips: Array<{ key: AthleteStatusFilter; label: string; count: number }> = useMemo(
    () => [
      { key: 'all', label: 'All', count: statusCounts.all },
      { key: 'active', label: 'Active', count: statusCounts.active },
      { key: 'pending', label: 'Pending', count: statusCounts.pending },
      { key: 'needs-attention', label: 'Needs Attention', count: statusCounts.needsAttention },
    ],
    [statusCounts]
  )

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (paginatedData.hasNextPage) {
      setCurrentPage(currentPage + 1)
    }
  }, [paginatedData.hasNextPage, currentPage, setCurrentPage])

  const handlePreviousPage = useCallback(() => {
    if (paginatedData.hasPreviousPage) {
      setCurrentPage(currentPage - 1)
    }
  }, [paginatedData.hasPreviousPage, currentPage, setCurrentPage])

  return (
    <Card shadow="sm" data-testid="athletes-grid">
      <CardHeader className="flex flex-col gap-4 pb-2">
        {/* Title and Connect Button */}
        <div className="flex justify-between items-center w-full">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Your Athletes</h3>
            <p className="text-sm text-foreground-600">
              {paginatedData.totalCount} {paginatedData.totalCount === 1 ? 'runner' : 'runners'} on
              their summit journey
            </p>
          </div>
          <Button
            as={Link}
            href="/relationships"
            size="sm"
            color="primary"
            className="bg-primary text-white font-medium"
            data-testid="connect-athletes-button"
          >
            Connect
          </Button>
        </div>

        {/* Search and View Toggle Row */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* Search Input */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search athletes..."
              value={searchTerm}
              onValueChange={handleSearchChange}
              startContent={<MagnifyingGlassIcon className="w-4 h-4 text-foreground-400" />}
              size="sm"
              classNames={{
                input: 'text-sm',
                inputWrapper: 'bg-content2',
              }}
              data-testid="athlete-search-input"
            />
          </div>

          {/* View Mode Toggle */}
          <ButtonGroup size="sm" variant="flat">
            <Button
              isIconOnly
              color={viewMode === 'grid' ? 'primary' : 'default'}
              onPress={() => setViewMode('grid')}
              aria-label="Grid view"
              data-testid="view-mode-grid"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </Button>
            <Button
              isIconOnly
              color={viewMode === 'list' ? 'primary' : 'default'}
              onPress={() => setViewMode('list')}
              aria-label="List view"
              data-testid="view-mode-list"
            >
              <ListBulletIcon className="w-4 h-4" />
            </Button>
          </ButtonGroup>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 w-full">
          {filterChips.map(chip => (
            <Chip
              key={chip.key}
              variant={statusFilter === chip.key ? 'solid' : 'flat'}
              color={statusFilter === chip.key ? 'primary' : 'default'}
              className={classNames(
                'cursor-pointer transition-all',
                statusFilter === chip.key ? '' : 'hover:bg-content3'
              )}
              onClick={() => setStatusFilter(chip.key)}
              data-testid={`filter-${chip.key}`}
            >
              {chip.label}
              <span
                className={classNames(
                  'ml-1 text-xs',
                  statusFilter === chip.key ? 'opacity-80' : 'text-foreground-500'
                )}
              >
                ({chip.count})
              </span>
            </Chip>
          ))}
        </div>
      </CardHeader>

      <CardBody className="pt-2">
        {/* Empty State */}
        {paginatedData.totalCount === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 bg-default-100 rounded-full flex items-center justify-center mb-4">
              <UsersIcon className="h-8 w-8 text-default-400" />
            </div>
            {searchTerm || statusFilter !== 'all' ? (
              <>
                <p className="text-foreground font-medium mb-1">No athletes found</p>
                <p className="text-sm text-foreground-500 mb-4">
                  Try adjusting your search or filters
                </p>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium mb-1">No athletes connected</p>
                <p className="text-sm text-foreground-500 mb-4">
                  Connect with runners to start coaching
                </p>
                <Button
                  as={Link}
                  href="/relationships"
                  color="primary"
                  size="sm"
                  data-testid="find-athletes-button"
                >
                  Find Athletes to Coach
                </Button>
              </>
            )}
          </div>
        )}

        {/* Athletes Grid/List */}
        {paginatedData.athletes.length > 0 && (
          <>
            <div
              className={classNames(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'flex flex-col gap-2'
              )}
              data-testid="athletes-list"
            >
              {paginatedData.athletes.map(athlete => (
                <AthleteCard key={athlete.relationship.id} athlete={athlete} viewMode={viewMode} />
              ))}
            </div>

            {/* Pagination */}
            {paginatedData.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-divider">
                <p className="text-sm text-foreground-500">
                  Showing {(currentPage - 1) * athletesPerPage + 1}-
                  {Math.min(currentPage * athletesPerPage, paginatedData.totalCount)} of{' '}
                  {paginatedData.totalCount}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    isIconOnly
                    isDisabled={!paginatedData.hasPreviousPage}
                    onPress={handlePreviousPage}
                    aria-label="Previous page"
                    data-testid="pagination-prev"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </Button>

                  <span className="text-sm text-foreground-600 min-w-[80px] text-center">
                    Page {currentPage} of {paginatedData.totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="flat"
                    isIconOnly
                    isDisabled={!paginatedData.hasNextPage}
                    onPress={handleNextPage}
                    aria-label="Next page"
                    data-testid="pagination-next"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}

// Memoize to prevent unnecessary re-renders
export const AthletesGrid = memo(AthletesGridComponent)
export default AthletesGrid
