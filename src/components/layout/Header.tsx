'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useBetterSession'
import { useBetterSession } from '@/hooks/useBetterSession'
import Link from 'next/link'
import { 
  Button, 
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar
} from '@heroui/react'
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
    <Button 
      isIconOnly 
      variant="light" 
      onClick={toggleTheme} 
      aria-label="Toggle theme"
      className="hover:bg-primary/10 transition-colors"
    >
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
  const { signOut } = useBetterSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <Navbar 
      onMenuOpenChange={setIsMenuOpen} 
      isMenuOpen={isMenuOpen}
      className="bg-background/95 backdrop-blur-md border-b border-divider"
      height="4rem"
    >
      <NavbarContent>
        <NavbarMenuToggle 
          aria-label={isMenuOpen ? "Close menu" : "Open menu"} 
          className="md:hidden" 
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl">🏔️</span>
            <div className="flex flex-col">
              <span className="font-black text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
            <NavbarItem>
              <Link 
                href={session.user.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Dashboard
              </Link>
            </NavbarItem>
            {session.user.role === 'coach' && (
              <NavbarItem>
                <Link 
                  href="/training-plans"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  Training Plans
                </Link>
              </NavbarItem>
            )}
            {session.user.role === 'coach' && (
              <NavbarItem>
                <Link 
                  href="/runners"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  Runners
                </Link>
              </NavbarItem>
            )}
            {session.user.role === 'coach' && (
              <NavbarItem>
                <Link 
                  href="/races"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  Races
                </Link>
              </NavbarItem>
            )}
            {session.user.role === 'coach' && (
              <NavbarItem>
                <Link 
                  href="/weekly-planner"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  Weekly Planner
                </Link>
              </NavbarItem>
            )}
            <NavbarItem>
              <Link 
                href="/workouts"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Workouts
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link 
                href="/chat"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Messages
              </Link>
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
                    name={session.user.name || 'User'}
                    className="cursor-pointer bg-gradient-to-br from-primary to-secondary text-white"
                  />
                </DropdownTrigger>
                <DropdownMenu aria-label="User menu">
                  <DropdownItem key="profile" as={Link} href="/profile">
                    Profile
                  </DropdownItem>
                  <DropdownItem key="settings">
                    Settings
                  </DropdownItem>
                  <DropdownItem 
                    key="logout" 
                    color="danger"
                    onClick={handleSignOut}
                  >
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
                <Link href="/races" onClick={() => setIsMenuOpen(false)}>
                  Races
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