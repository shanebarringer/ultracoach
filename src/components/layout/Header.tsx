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
} from '@heroui/react'
import { useAtom } from 'jotai'
import { useKBar } from 'kbar'
import { Menu, Search } from 'lucide-react'

import { memo, useCallback } from 'react'

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

const SearchButton = memo(function SearchButton() {
  const { query } = useKBar()

  const openKBar = useCallback(() => {
    logger.debug('Opening K-Bar via search button')
    query.toggle()
  }, [query])

  return (
    <Button
      isIconOnly
      variant="light"
      onClick={openKBar}
      aria-label="Search (⌘K)"
      className="hover:bg-primary/10 transition-colors"
    >
      <Search className="h-5 w-5" />
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

  return (
    <Navbar className="bg-background/95 backdrop-blur-md border-b border-divider" height="4rem" maxWidth="full">
      <div className="max-w-7xl w-full mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Button
            isIconOnly
            variant="light"
            aria-label="Open menu"
            className="flex-shrink-0 text-foreground hover:text-primary transition-colors"
            onClick={() => setUiState(prev => ({ ...prev, isDrawerOpen: true }))}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <NavbarBrand className="flex-grow-0">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🏔️</span>
              <div className="flex flex-col">
                <span className="font-black text-lg text-foreground leading-tight">UltraCoach</span>
                <span className="text-xs text-muted font-medium hidden lg:block leading-none">
                  Conquer Your Peaks
                </span>
              </div>
            </Link>
          </NavbarBrand>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!session && status !== 'loading' && (
            <>
              <Button as={Link} href="/auth/signin" variant="light" size="sm">
                Sign In
              </Button>
              <Button as={Link} href="/auth/signup" color="primary" size="sm">
                Sign Up
              </Button>
            </>
          )}

          <SearchButton />

          {session && (
            <NotificationBell />
          )}

          <ThemeToggle />

          {session && (
            <Dropdown>
              <DropdownTrigger>
                <Avatar
                  name={(session.user?.name as string) || 'User'}
                  className="cursor-pointer bg-primary text-white"
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
          )}
        </div>
      </div>
    </Navbar>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Header)
