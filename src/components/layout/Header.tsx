'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button, Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from '@heroui/react'
import NotificationBell from '@/components/common/NotificationBell'
import { useAtom } from 'jotai'
import { themeModeAtom } from '@/lib/atoms'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

function ThemeToggle() {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light')
  }

  return (
    <Button isIconOnly variant="light" onClick={toggleTheme} aria-label="Toggle theme">
      {themeMode === 'light' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </Button>
  )
}

export default function Header() {
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <Navbar onMenuOpenChange={setIsMenuOpen} isMenuOpen={isMenuOpen}>
      <NavbarContent>
        <NavbarMenuToggle aria-label={isMenuOpen ? "Close menu" : "Open menu"} className="md:hidden" />
        <NavbarBrand>
          <Link href="/" className="font-bold text-inherit text-2xl">
            UltraCoach
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden md:flex gap-4" justify="center">
        {session ? (
          <>
            <NavbarItem>
              <Link href={session.user.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'}>
                Dashboard
              </Link>
            </NavbarItem>
            {session.user.role === 'coach' && (
              <NavbarItem>
                <Link href="/training-plans">
                  Training Plans
                </Link>
              </NavbarItem>
            )}
            {session.user.role === 'coach' && (
              <NavbarItem>
                <Link href="/runners">
                  Runners
                </Link>
              </NavbarItem>
            )}
            {session.user.role === 'coach' && (
              <NavbarItem>
                <Link href="/weekly-planner">
                  Weekly Planner
                </Link>
              </NavbarItem>
            )}
            <NavbarItem>
              <Link href="/workouts">
                Workouts
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link href="/chat">
                Messages
              </Link>
            </NavbarItem>
            <NavbarItem>
              <NotificationBell />
            </NavbarItem>
            <NavbarItem>
              <ThemeToggle />
            </NavbarItem>
            <NavbarItem className="relative">
              <Button
                variant="light"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {session.user.name}
              </Button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </NavbarItem>
          </>
        ) : (
          <>
            <NavbarItem>
              <Link href="/auth/signin">
                Sign In
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Button
                as={Link}
                href="/auth/signup"
                color="primary"
                size="sm"
              >
                Sign Up
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      <NavbarMenu>
        {session ? (
          <>
            <NavbarMenuItem>
              <Link href={session.user.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'} onClick={() => setIsMenuOpen(false)}>
                Dashboard
              </Link>
            </NavbarMenuItem>
            {session.user.role === 'coach' && (
              <NavbarMenuItem>
                <Link href="/training-plans" onClick={() => setIsMenuOpen(false)}>
                  Training Plans
                </Link>
              </NavbarMenuItem>
            )}
            {session.user.role === 'coach' && (
              <NavbarMenuItem>
                <Link href="/runners" onClick={() => setIsMenuOpen(false)}>
                  Runners
                </Link>
              </NavbarMenuItem>
            )}
            {session.user.role === 'coach' && (
              <NavbarMenuItem>
                <Link href="/weekly-planner" onClick={() => setIsMenuOpen(false)}>
                  Weekly Planner
                </Link>
              </NavbarMenuItem>
            )}
            <NavbarMenuItem>
              <Link href="/workouts" onClick={() => setIsMenuOpen(false)}>
                Workouts
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Link href="/chat" onClick={() => setIsMenuOpen(false)}>
                Messages
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                Profile
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Button
                onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
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
              <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                Sign In
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Button
                as={Link}
                href="/auth/signup"
                color="primary"
                className="w-full"
                onClick={() => setIsMenuOpen(false)}
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