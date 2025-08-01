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
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from '@heroui/react'
import { useAtom } from 'jotai'

import { memo, useCallback, useMemo, useState } from 'react'

import Link from 'next/link'

import NotificationBell from '@/components/common/NotificationBell'
import { useBetterSession, useSession } from '@/hooks/useBetterSession'
import { themeModeAtom } from '@/lib/atoms'
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
  const { data: session } = useSession()
  const { signOut } = useBetterSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    logger.info('User signing out')
    await signOut()
    window.location.href = '/'
  }, [signOut])

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  // Memoize user navigation items to prevent unnecessary re-renders
  const userNavItems = useMemo(() => {
    if (!session) return []

    const baseItems = [
      {
        href: session.user.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner',
        label: 'Dashboard',
      },
      { href: '/workouts', label: 'Workouts' },
      { href: '/chat', label: 'Messages' },
    ]

    if (session.user.role === 'coach') {
      return [
        baseItems[0], // Dashboard
        { href: '/training-plans', label: 'Training Plans' },
        { href: '/runners', label: 'Runners' },
        { href: '/races', label: 'Races' },
        { href: '/weekly-planner', label: 'Weekly Planner' },
        ...baseItems.slice(1), // Workouts, Messages
      ]
    }

    return baseItems
  }, [session])

  return (
    <Navbar
      onMenuOpenChange={setIsMenuOpen}
      isMenuOpen={isMenuOpen}
      className="bg-background/95 backdrop-blur-md border-b border-divider"
      height="4rem"
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="md:hidden"
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl">🏔️</span>
            <div className="flex flex-col">
              <span className="font-black text-xl bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                UltraCoach
              </span>
              <span className="text-xs text-muted font-medium hidden md:block">
                Conquer Your Peaks
              </span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden md:flex gap-4" justify="center">
        {session ? (
          <>
            {userNavItems.map(item => (
              <NavbarItem key={item.href}>
                <Link
                  href={item.href}
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  {item.label}
                </Link>
              </NavbarItem>
            ))}
          </>
        ) : (
          <>
            <NavbarItem>
              <Link href="/auth/signin">Sign In</Link>
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
                  <DropdownItem key="settings">Settings</DropdownItem>
                  <DropdownItem key="logout" color="danger" onClick={handleSignOut}>
                    Sign Out
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      <NavbarMenu>
        {session ? (
          <>
            {userNavItems.map(item => (
              <NavbarMenuItem key={item.href}>
                <Link href={item.href} onClick={handleMenuClose}>
                  {item.label}
                </Link>
              </NavbarMenuItem>
            ))}
            <NavbarMenuItem>
              <Link href="/profile" onClick={handleMenuClose}>
                Profile
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Button
                onClick={() => {
                  handleSignOut()
                  handleMenuClose()
                }}
                className="w-full text-left"
                variant="light"
              >
                Sign Out
              </Button>
            </NavbarMenuItem>
          </>
        ) : (
          <>
            <NavbarMenuItem>
              <Link href="/auth/signin" onClick={handleMenuClose}>
                Sign In
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Button
                as={Link}
                href="/auth/signup"
                color="primary"
                className="w-full"
                onClick={handleMenuClose}
              >
                Sign Up
              </Button>
            </NavbarMenuItem>
          </>
        )}
      </NavbarMenu>
    </Navbar>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Header)
