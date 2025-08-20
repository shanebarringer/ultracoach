'use client'

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
import { useAtom } from 'jotai'
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  Home,
  MessageSquare,
  Mountain,
  RefreshCw,
  Route,
  Target,
  TrendingUp,
  User,
} from 'lucide-react'

import { ReactNode, useMemo } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from '@/hooks/useBetterSession'
import { stravaActivitiesRefreshableAtom, stravaConnectionStatusAtom, workoutStravaShowPanelAtom } from '@/lib/atoms'
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
  role: 'runner' | 'coach'
  userType?: 'runner' | 'coach'
}

export default function KBarProvider({ children }: KBarProviderProps) {
  const router = useRouter()
  const { data: session } = useSession()
  
  // Strava state atoms
  const [connectionStatus] = useAtom(stravaConnectionStatusAtom)
  const [, refreshStravaActivities] = useAtom(stravaActivitiesRefreshableAtom)
  const [, setShowStravaPanel] = useAtom(workoutStravaShowPanelAtom)

  // Extract userType for dependency array
  const userType = (session?.user as ExtendedUser)?.userType

  const actions: Action[] = useMemo(() => {
    const coreActions: Action[] = [
      // Navigation Commands
      {
        id: 'dashboard',
        name: 'Dashboard',
        subtitle: 'Go to your base camp',
        shortcut: ['g', 'd'],
        keywords: 'dashboard home base camp',
        icon: <Home className="w-4 h-4" />,
        perform: () => router.push('/dashboard'),
      },
      {
        id: 'workouts',
        name: 'Training Log',
        subtitle: 'View and manage your workouts',
        shortcut: ['g', 'w'],
        keywords: 'workouts training log ascents',
        icon: <Mountain className="w-4 h-4" />,
        perform: () => router.push('/workouts'),
      },
      {
        id: 'calendar',
        name: 'Calendar',
        subtitle: 'View your training calendar',
        shortcut: ['g', 'c'],
        keywords: 'calendar schedule plan',
        icon: <Calendar className="w-4 h-4" />,
        perform: () => router.push('/calendar'),
      },
      {
        id: 'training-plans',
        name: 'Training Plans',
        subtitle: 'Manage your expedition plans',
        shortcut: ['g', 't'],
        keywords: 'training plans expeditions routes',
        icon: <Route className="w-4 h-4" />,
        perform: () => router.push('/training-plans'),
      },
      {
        id: 'messages',
        name: 'Messages',
        subtitle: 'Chat with your guide or athletes',
        shortcut: ['g', 'm'],
        keywords: 'messages chat communication guide coach',
        icon: <MessageSquare className="w-4 h-4" />,
        perform: () => router.push('/chat'),
      },
      {
        id: 'profile',
        name: 'Profile',
        subtitle: 'View and edit your profile',
        shortcut: ['g', 'p'],
        keywords: 'profile settings account',
        icon: <User className="w-4 h-4" />,
        perform: () => router.push('/profile'),
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
        subtitle: connectionStatus === 'loading' ? 'Checking connection...' : 
                  connectionStatus === 'connected' ? '✅ Connected' : 
                  connectionStatus === 'disconnected' ? '❌ Not connected' : 'Check your Strava connection',
        shortcut: ['s', 'c'],
        keywords: 'strava connection status check',
        icon: <Activity className="w-4 h-4" />,
        parent: 'strava',
        perform: () => {
          logger.info('Strava status command triggered')
          if (connectionStatus === 'disconnected') {
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
    ]

    // Add role-specific actions
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
          shortcut: ['g', 'y'],
          keywords: 'weekly planner schedule training',
          icon: <Calendar className="w-4 h-4" />,
          parent: 'coach-actions',
          perform: () => router.push('/weekly-planner'),
        }
      )
    }

    return coreActions
  }, [router, userType, connectionStatus, refreshStravaActivities, setShowStravaPanel])

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
