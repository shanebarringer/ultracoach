'use client'

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
} from '@heroui/react'
import { useAtom } from 'jotai'

import { memo, useCallback, useMemo } from 'react'

import Link from 'next/link'

import NotificationBell from '@/components/common/NotificationBell'
import { useBetterSession, useSession } from '@/hooks/useBetterSession'
import { themeModeAtom, uiStateAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Header')

const ThemeToggle = memo(function ThemeToggle() {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)

  const toggleTheme = useCallback(() => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light'
    logger.debug('Toggling theme:', { from: themeMode, to: newTheme })
    setThemeMode(newTheme)
  }, [themeMode, setThemeMode])

  return (
    <Button
      isIconOnly
      variant="light"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="hover:bg-primary/10 transition-colors"
    >
      {themeMode === 'light' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </Button>
  )
})

function Header() {
  const { data: session, status } = useSession()
  const { signOut } = useBetterSession()
  const [, setUiState] = useAtom(uiStateAtom)

  const handleSignOut = useCallback(async () => {
    logger.info('User signing out')
    await signOut()
    window.location.href = '/'
  }, [signOut])

  // Memoize user navigation items to prevent unnecessary re-renders
  const userNavItems = useMemo(() => {
    if (!session) return []

    const baseItems = [
      {
        href: '/dashboard',
        label: 'Dashboard',
      },
      { href: '/relationships', label: 'Connections' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/workouts', label: 'Workouts' },
      { href: '/chat', label: 'Messages' },
    ]

    if (session.user.role === 'coach') {
      return [
        baseItems[0], // Dashboard
        baseItems[1], // Relationships
        { href: '/runners', label: 'Runners' },
        { href: '/races', label: 'Races' },
        baseItems[2], // Calendar
        { href: '/weekly-planner', label: 'Planner' },
        { href: '/coach/weekly-overview', label: 'Overview' },
        { href: '/training-plans', label: 'Plans' },
        ...baseItems.slice(3), // Workouts, Messages
      ]
    }

    return [
      ...baseItems.slice(0, 3), // Dashboard, Relationships, Calendar
      { href: '/weekly-planner', label: 'My Training' }, // Read-only weekly planner for runners
      ...baseItems.slice(3), // Workouts, Messages
    ]
  }, [session])

  return (
    <Navbar className="bg-background/95 backdrop-blur-md border-b border-divider" height="4rem">
      <NavbarContent justify="start" className="gap-3">
        <NavbarMenuToggle
          aria-label={'Open menu'}
          className="lg:hidden"
          onClick={() => setUiState(prev => ({ ...prev, isDrawerOpen: true }))}
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🏔️</span>
            <div className="flex flex-col">
              <span className="font-black text-lg bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight">
                UltraCoach
              </span>
              <span className="text-xs text-muted font-medium hidden lg:block leading-none">
                Conquer Your Peaks
              </span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden lg:flex gap-1 lg:gap-2" justify="center">
        {status === 'loading' ? (
          // Show nothing while loading to prevent flash
          <></>
        ) : session ? (
          <>
            {userNavItems.map(item => (
              <NavbarItem key={item.href}>
                <Link
                  href={item.href}
                  className="text-foreground hover:text-primary transition-colors font-medium text-sm lg:text-base px-1"
                >
                  {item.label}
                </Link>
              </NavbarItem>
            ))}
          </>
        ) : (
          <>
            <NavbarItem>
              <Button as={Link} href="/auth/signin" variant="light" size="sm">
                Sign In
              </Button>
            </NavbarItem>
            <NavbarItem>
              <Button as={Link} href="/auth/signup" color="primary" size="sm">
                Sign Up
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      <NavbarContent justify="end">
        {session && (
          <>
            <NavbarItem>
              <NotificationBell />
            </NavbarItem>
            <NavbarItem>
              <ThemeToggle />
            </NavbarItem>
            <NavbarItem>
              <Dropdown>
                <DropdownTrigger>
                  <Avatar
                    name={(session.user?.name as string) || 'User'}
                    className="cursor-pointer bg-linear-to-br from-primary to-secondary text-white"
                  />
                </DropdownTrigger>
                <DropdownMenu aria-label="User menu">
                  <DropdownItem key="profile" as={Link} href="/profile">
                    Profile
                  </DropdownItem>
                  <DropdownItem key="settings" as={Link} href="/settings">
                    Settings
                  </DropdownItem>
                  <DropdownItem key="logout" color="danger" onClick={handleSignOut}>
                    Sign Out
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>
          </>
        )}
      </NavbarContent>
    </Navbar>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Header)
