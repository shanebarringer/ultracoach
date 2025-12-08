'use client'

import { useAtom, useSetAtom } from 'jotai'
import {
  Action,
  KBarProvider as KBar,
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarResults,
  KBarSearch,
  useMatches,
} from 'kbar'
import {
  Activity,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  Compass,
  Home,
  MessageSquarePlus,
  Mountain,
  RefreshCw,
  Route,
  Target,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'

import { ReactNode, useMemo } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from '@/hooks/useBetterSession'
import { useNavigationItems } from '@/hooks/useNavigationItems'
import {
  chatUiStateAtom,
  stravaActivitiesRefreshableAtom,
  stravaConnectionStatusAtom,
  uiStateAtom,
  workoutStravaShowPanelAtom,
} from '@/lib/atoms/index'
import { shouldStartTourAtom } from '@/lib/atoms/tours'
import { createLogger } from '@/lib/logger'

const logger = createLogger('KBarProvider')

interface KBarProviderProps {
  children: ReactNode
}

function RenderResults() {
  const { results } = useMatches()

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        if (typeof item === 'string') {
          return (
            <div className="px-4 py-2 text-sm font-semibold text-foreground-600 uppercase tracking-wider">
              {item}
            </div>
          )
        }

        return (
          <div
            className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
              active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-content2'
            }`}
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              {item.subtitle && <div className="text-sm text-foreground-600">{item.subtitle}</div>}
            </div>
            {item.shortcut && (
              <div className="flex gap-1">
                {item.shortcut.map((sc: string, index: number) => (
                  <kbd
                    key={index}
                    className="px-2 py-1 text-xs font-medium bg-content3 rounded border"
                  >
                    {sc}
                  </kbd>
                ))}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}

interface ExtendedUser {
  id: string
  email: string
  name: string
  userType?: 'runner' | 'coach'
}

export default function KBarProvider({ children }: KBarProviderProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const navigationItems = useNavigationItems(session)

  // Strava state atoms
  const [connectionStatus] = useAtom(stravaConnectionStatusAtom)
  const [, refreshStravaActivities] = useAtom(stravaActivitiesRefreshableAtom)
  const setShowStravaPanel = useSetAtom(workoutStravaShowPanelAtom)

  // Tour trigger atom
  const setShouldStartTour = useSetAtom(shouldStartTourAtom)

  // Global UI state for cross-page workflows
  const setUiState = useSetAtom(uiStateAtom)
  const setChatUiState = useSetAtom(chatUiStateAtom)

  // Extract userType for dependency array
  const userType = (session?.user as ExtendedUser)?.userType

  const actions: Action[] = useMemo(() => {
    const navigationActions: Action[] = navigationItems.map(item => {
      const IconComponent = item.icon

      const id = `nav:${item.href}`
      const keywords = [item.label, item.description].filter(Boolean).join(' ')

      const shortcut =
        item.href === '/dashboard'
          ? ['g', 'd']
          : item.href === '/workouts'
            ? ['g', 'w']
            : item.href === '/calendar'
              ? ['g', 'c']
              : item.href === '/training-plans'
                ? ['g', 't']
                : item.href === '/chat'
                  ? ['g', 'm']
                  : item.href === '/runners'
                    ? ['g', 'r']
                    : item.href === '/weekly-planner'
                      ? ['g', 'y']
                      : undefined

      return {
        id,
        name: item.label,
        subtitle: item.description,
        keywords,
        shortcut,
        icon: IconComponent ? <IconComponent className="w-4 h-4" /> : <Home className="w-4 h-4" />,
        perform: () => router.push(item.href),
      }
    })

    const coreActions: Action[] = [
      // Profile & account
      {
        id: 'profile',
        name: 'Profile',
        subtitle: 'View and edit your profile',
        shortcut: ['g', 'p'],
        keywords: 'profile settings account',
        icon: <User className="w-4 h-4" />,
        perform: () => router.push('/profile'),
      },
      {
        id: 'find-coach',
        name: 'Find Coaches',
        subtitle: 'Browse the public coach directory',
        keywords: 'coaches directory find coach relationships',
        icon: <Users className="w-4 h-4" />,
        perform: () => router.push('/coaches'),
      },

      // Quick Actions
      {
        id: 'quick-actions',
        name: 'Quick Actions',
        subtitle: 'Common tasks and shortcuts',
      },
      {
        id: 'mark-workout-complete',
        name: 'Mark Workout Complete',
        subtitle: "Complete today's training session",
        shortcut: ['m', 'c'],
        keywords: 'mark complete workout finish done',
        icon: <CheckCircle className="w-4 h-4" />,
        parent: 'quick-actions',
        perform: () => {
          logger.info("Mark workout complete command triggered - navigating to today's workouts")
          router.push('/workouts?filter=today')
        },
      },
      {
        id: 'todays-workouts',
        name: "Today's Workouts",
        subtitle: 'View workouts scheduled for today',
        shortcut: ['t', 'd'],
        keywords: 'today workouts scheduled current',
        icon: <Clock className="w-4 h-4" />,
        parent: 'quick-actions',
        perform: () => {
          router.push('/workouts?filter=today')
        },
      },
      {
        id: 'new-workout',
        name: 'Log New Workout',
        subtitle: 'Create a new workout entry',
        keywords: 'new workout log training add session',
        icon: <Mountain className="w-4 h-4" />,
        parent: 'quick-actions',
        perform: () => {
          logger.info('New workout command triggered from K-bar')
          router.push('/workouts')
          setUiState(prev => ({
            ...prev,
            isAddWorkoutModalOpen: true,
          }))
        },
      },
      {
        id: 'start-new-conversation',
        name: 'Start New Conversation',
        subtitle: 'Message a coach or runner',
        keywords: 'messages chat conversation new coach runner',
        icon: <MessageSquarePlus className="w-4 h-4" />,
        parent: 'quick-actions',
        perform: () => {
          logger.info('Start new conversation command triggered from K-bar')
          router.push('/chat')
          setChatUiState(prev => ({
            ...prev,
            showNewMessage: true,
          }))
        },
      },

      // Strava Integration Commands
      {
        id: 'strava',
        name: 'Strava Integration',
        subtitle: 'Sync and manage Strava activities',
      },
      {
        id: 'sync-strava',
        name: 'Sync Strava Activities',
        subtitle: 'Import recent activities from Strava',
        shortcut: ['s', 's'],
        keywords: 'strava sync activities import',
        icon: <RefreshCw className="w-4 h-4" />,
        parent: 'strava',
        perform: async () => {
          logger.info('Strava sync command triggered - refreshing activities')
          try {
            await refreshStravaActivities()
            logger.info('Strava sync completed successfully')
          } catch (error) {
            logger.error('Failed to sync Strava activities:', error)
          }
        },
      },
      {
        id: 'strava-status',
        name: 'Strava Connection Status',
        subtitle:
          connectionStatus.status === 'loading'
            ? 'Checking connection...'
            : connectionStatus.connected
              ? '✅ Connected'
              : '❌ Not connected',
        shortcut: ['s', 'c'],
        keywords: 'strava connection status check',
        icon: <Activity className="w-4 h-4" />,
        parent: 'strava',
        perform: () => {
          logger.info('Strava status command triggered')
          if (!connectionStatus.connected) {
            // Use a full page redirect here because /api/strava/connect
            // performs a server-side redirect to the external Strava OAuth page.
            // router.push is intended for app routes, not OAuth handshakes.
            logger.info('Redirecting to Strava connect')
            window.location.href = '/api/strava/connect'
          } else {
            logger.info('Opening Strava panel for status details')
            setShowStravaPanel(true)
            router.push('/workouts')
          }
        },
      },
      {
        id: 'connect-strava',
        name: 'Connect Strava Account',
        subtitle: 'Link your Strava account for automatic sync',
        shortcut: ['s', 'n'],
        keywords: 'strava connect link account setup new',
        icon: <Activity className="w-4 h-4" />,
        parent: 'strava',
        perform: () => {
          logger.info('Strava connect command triggered')
          // See note above: this must be a hard redirect so the OAuth
          // provider can take over the browser session.
          window.location.href = '/api/strava/connect'
        },
      },
      {
        id: 'open-strava-panel',
        name: 'Open Strava Panel',
        subtitle: 'Show Strava integration sidebar',
        shortcut: ['s', 'p'],
        keywords: 'strava panel sidebar open show',
        icon: <Activity className="w-4 h-4" />,
        parent: 'strava',
        perform: () => {
          logger.info('Open Strava panel command triggered')
          setShowStravaPanel(true)
          router.push('/workouts')
        },
      },

      // Filter Commands (for workout page)
      {
        id: 'filters',
        name: 'Filters & Views',
        subtitle: 'Quick filtering and view options',
      },
      {
        id: 'show-completed',
        name: 'Show Completed Workouts',
        subtitle: 'Filter to completed workouts only',
        shortcut: ['f', 'c'],
        keywords: 'filter completed done finished',
        icon: <CheckCircle className="w-4 h-4" />,
        parent: 'filters',
        perform: () => {
          // This will apply the completed filter
          router.push('/workouts?status=completed')
        },
      },
      {
        id: 'show-planned',
        name: 'Show Planned Workouts',
        subtitle: 'Filter to planned workouts only',
        shortcut: ['f', 'p'],
        keywords: 'filter planned upcoming scheduled',
        icon: <Target className="w-4 h-4" />,
        parent: 'filters',
        perform: () => {
          router.push('/workouts?status=planned')
        },
      },
      {
        id: 'this-week',
        name: "This Week's Workouts",
        subtitle: 'Show workouts for current week',
        shortcut: ['f', 'w'],
        keywords: 'filter week current this week',
        icon: <Calendar className="w-4 h-4" />,
        parent: 'filters',
        perform: () => {
          router.push('/workouts?timeframe=this-week')
        },
      },

      // Help & Onboarding
      {
        id: 'help',
        name: 'Help & Onboarding',
        subtitle: 'Tutorials and guided tours',
      },
      {
        id: 'open-help-page',
        name: 'Open Help Center',
        subtitle: 'View Help & Support documentation',
        shortcut: ['g', 'h'],
        keywords: 'help support documentation faq',
        icon: <Compass className="w-4 h-4" />,
        parent: 'help',
        perform: () => {
          router.push('/help')
        },
      },
      {
        id: 'start-guided-tour',
        name: 'Start Guided Tour',
        subtitle: 'Take a tour of UltraCoach features',
        shortcut: ['t', 'g'],
        keywords: 'tour guide help onboarding tutorial walkthrough',
        icon: <Compass className="w-4 h-4" />,
        parent: 'help',
        perform: () => {
          logger.info('Starting guided tour from K-bar')
          // Navigate to dashboard first if not already there
          const dashboardUrl = userType === 'coach' ? '/dashboard/coach' : '/dashboard/runner'
          router.push(dashboardUrl)
          // Set the atom to trigger the tour
          setShouldStartTour(true)
        },
      },
    ]
    // Runner-specific actions
    if (userType === 'runner') {
      coreActions.push({
        id: 'weekly-planner-runner',
        name: 'My Weekly Planner',
        subtitle: 'View your weekly training schedule',
        keywords: 'weekly planner my training schedule',
        icon: <CalendarDays className="w-4 h-4" />,
        perform: () => router.push('/weekly-planner'),
      })
    }

    // Coach-specific actions
    if (userType === 'coach') {
      coreActions.push(
        {
          id: 'coach-actions',
          name: 'Coach Actions',
          subtitle: 'Coach-specific tools and features',
        },
        {
          id: 'view-runners',
          name: 'View Athletes',
          subtitle: 'Manage your athletes',
          shortcut: ['g', 'r'],
          keywords: 'athletes runners students',
          icon: <TrendingUp className="w-4 h-4" />,
          parent: 'coach-actions',
          perform: () => router.push('/runners'),
        },
        {
          id: 'weekly-planner',
          name: 'Weekly Planner',
          subtitle: 'Plan training sessions',
          keywords: 'weekly planner schedule training coach',
          icon: <Calendar className="w-4 h-4" />,
          parent: 'coach-actions',
          perform: () => router.push('/weekly-planner'),
        },
        {
          id: 'coach-weekly-overview',
          name: 'Weekly Overview',
          subtitle: 'View athlete progress overview',
          keywords: 'overview athletes progress coach weekly',
          icon: <TrendingUp className="w-4 h-4" />,
          parent: 'coach-actions',
          perform: () => router.push('/coach/weekly-overview'),
        },
        {
          id: 'create-training-plan',
          name: 'Create Training Plan',
          subtitle: 'Design a new plan for your athletes',
          keywords: 'training plans create expedition program coach',
          icon: <Route className="w-4 h-4" />,
          parent: 'coach-actions',
          perform: () => {
            logger.info('Create training plan command triggered from K-bar')
            router.push('/training-plans')
            setUiState(prev => ({
              ...prev,
              showCreateTrainingPlan: true,
            }))
          },
        }
      )
    }

    return [...navigationActions, ...coreActions]
  }, [
    router,
    navigationItems,
    userType,
    connectionStatus,
    refreshStravaActivities,
    setShowStravaPanel,
    setShouldStartTour,
    setUiState,
    setChatUiState,
  ])

  return (
    <KBar actions={actions}>
      <KBarPortal>
        <KBarPositioner className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm">
          <KBarAnimator className="max-w-2xl w-full mx-auto mt-[10vh] overflow-hidden rounded-xl bg-background border border-divider shadow-2xl">
            <div className="border-b border-divider">
              <KBarSearch
                className="w-full px-4 py-4 text-lg bg-transparent border-0 outline-none placeholder-foreground-500 text-foreground"
                placeholder="Type a command or search..."
              />
            </div>
            <div className="max-h-96 overflow-auto p-2">
              <RenderResults />
            </div>
            <div className="border-t border-divider px-4 py-2 text-xs text-foreground-500 bg-content1">
              <div className="flex justify-between items-center">
                <span>Navigate with ↑↓, select with ↵</span>
                <div className="flex gap-4">
                  <span>
                    <kbd className="px-1 py-0.5 bg-content3 rounded text-[10px]">ESC</kbd> to close
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 bg-content3 rounded text-[10px]">⌘K</kbd> to open
                  </span>
                </div>
              </div>
            </div>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBar>
  )
}
