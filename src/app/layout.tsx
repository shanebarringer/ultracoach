import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { headers } from 'next/headers'

import KBarProvider from '@/components/kbar/KBarProvider'
import { ThemeWrapper } from '@/components/providers/ThemeWrapper'
import { Toaster } from '@/components/ui/toast'
import { auth } from '@/lib/better-auth'
import { BetterAuthProvider } from '@/providers/BetterAuthProvider'
import { HeroUIProvider } from '@/providers/HeroUIProvider'
import { JotaiProvider } from '@/providers/JotaiProvider'

import './globals.css'

// Use local Geist fonts for reliability (no Google Fonts API dependency)
// This ensures builds succeed even when external font services are unavailable
const geistSans = localFont({
  src: '../../public/fonts/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900', // Variable font supports full weight range
  display: 'swap',
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
})

const geistMono = localFont({
  src: '../../public/fonts/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
  fallback: ['Monaco', 'Courier New', 'monospace'],
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
