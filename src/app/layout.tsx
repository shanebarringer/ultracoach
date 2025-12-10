import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'

import type { Metadata } from 'next'
import { headers } from 'next/headers'

import KBarProvider from '@/components/kbar/KBarProvider'
import { PostHogErrorBoundary } from '@/components/providers/PostHogErrorBoundary'
import { ThemeWrapper } from '@/components/providers/ThemeWrapper'
import NextStepWrapper from '@/components/tours/NextStepWrapper'
import { Toaster } from '@/components/ui/toast'
import { auth } from '@/lib/better-auth'
import { BetterAuthProvider } from '@/providers/BetterAuthProvider'
import { HeroUIProvider } from '@/providers/HeroUIProvider'
import { JotaiProvider } from '@/providers/JotaiProvider'
import { PostHogProvider } from '@/providers/posthog'

import './globals.css'

export const metadata: Metadata = {
  title: 'UltraCoach - Ultramarathon Training Platform',
  description: 'Connect with coaches and manage your ultramarathon training',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Extract nonce from middleware for CSP compliance
  // The nonce is generated per-request in middleware and passed via x-nonce header
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? undefined

  // Fetch session on server-side to prevent race conditions with client-side loading
  // This implements the Better Auth SSR optimization pattern
  // Note: server-side API returns session directly, not wrapped in { data, error }
  const session = await auth.api.getSession({
    headers: headersList,
  })

  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <PostHogProvider nonce={nonce}>
          <PostHogErrorBoundary>
            <JotaiProvider>
              <BetterAuthProvider initialSession={session}>
                <HeroUIProvider>
                  <ThemeWrapper>
                    <KBarProvider>
                      <NextStepWrapper>
                        {children}
                        <Toaster />
                      </NextStepWrapper>
                    </KBarProvider>
                  </ThemeWrapper>
                </HeroUIProvider>
              </BetterAuthProvider>
            </JotaiProvider>
          </PostHogErrorBoundary>
        </PostHogProvider>
      </body>
    </html>
  )
}
