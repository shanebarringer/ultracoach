import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'

import KBarProvider from '@/components/kbar/KBarProvider'
import { ThemeWrapper } from '@/components/providers/ThemeWrapper'
import { Toaster } from '@/components/ui/toast'
import { auth } from '@/lib/better-auth'
import { BetterAuthProvider } from '@/providers/BetterAuthProvider'
import { HeroUIProvider } from '@/providers/HeroUIProvider'
import { JotaiProvider } from '@/providers/JotaiProvider'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
