import type { Metadata } from 'next'
import { headers } from 'next/headers'

import KBarProvider from '@/components/kbar/KBarProvider'
import { ThemeWrapper } from '@/components/providers/ThemeWrapper'
import { Toaster } from '@/components/ui/toast'
import { auth } from '@/lib/better-auth'
import { BetterAuthProvider } from '@/providers/BetterAuthProvider'
import { HeroUIProvider } from '@/providers/HeroUIProvider'
import { JotaiProvider } from '@/providers/JotaiProvider'

import './globals.css'

// Conditionally import Google Fonts only in non-CI environments
// In CI, we'll use system fonts to avoid network dependency
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

let fontVariables = ''

if (!isCI) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Geist, Geist_Mono } = require('next/font/google')

    const geistSans = Geist({
      variable: '--font-geist-sans',
      subsets: ['latin'],
      display: 'swap',
      fallback: ['system-ui', 'arial'],
    })

    const geistMono = Geist_Mono({
      variable: '--font-geist-mono',
      subsets: ['latin'],
      display: 'swap',
      fallback: ['ui-monospace', 'monospace'],
    })

    fontVariables = `${geistSans.variable} ${geistMono.variable}`
  } catch {
    console.warn('Failed to load Google Fonts, using system fonts')
  }
}

export const metadata: Metadata = {
  title: 'UltraCoach - Ultramarathon Training Platform',
  description: 'Connect with coaches and manage your ultramarathon training',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fetch session on server-side to prevent race conditions with client-side loading
  // This implements the Better Auth SSR optimization pattern
  // Note: server-side API returns session directly, not wrapped in { data, error }
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <html lang="en">
      <body
        className={`${fontVariables} antialiased`}
        style={{ fontFamily: isCI ? 'system-ui, arial' : undefined }}
      >
        <JotaiProvider>
          <BetterAuthProvider initialSession={session}>
            <HeroUIProvider>
              <ThemeWrapper>
                <KBarProvider>
                  {children}
                  <Toaster />
                </KBarProvider>
              </ThemeWrapper>
            </HeroUIProvider>
          </BetterAuthProvider>
        </JotaiProvider>
      </body>
    </html>
  )
}
