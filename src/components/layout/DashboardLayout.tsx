'use client'

import { useSession } from 'next-auth/react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen dashboard-bg">
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {session?.user?.role === 'coach' ? 'Coach Dashboard' : 'Runner Dashboard'}
            </h1>
            <p className="text-lg text-gray-600">Welcome back, {session?.user?.name}!</p>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
