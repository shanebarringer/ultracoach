import { Suspense } from 'react'

import { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { SuspenseBoundary } from '@/components/ui/SuspenseBoundary'
import type { User } from '@/lib/better-auth-client'
import { getServerSession } from '@/utils/auth-server'

import { RelationshipsPageContent } from './RelationshipsPageContent'

export const metadata: Metadata = {
  title: 'Relationships - UltraCoach',
  description: 'Manage your coaching relationships and connect with coaches or runners',
}

// Force dynamic rendering for this authenticated route
export const dynamic = 'force-dynamic'

export default async function RelationshipsPage() {
  // Force dynamic rendering prior to auth check
  await headers()

  // Server-side authentication - forces dynamic rendering
  const session = await getServerSession()
  if (!session) redirect('/auth/signin')

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Relationships</h1>
            <p className="text-default-600">
              Manage your coaching relationships and discover new connections
            </p>
          </div>

          <SuspenseBoundary
            fallback={
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="h-8 w-48 bg-default-200 rounded animate-pulse" />
                  <div className="h-64 bg-default-100 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-4">
                  <div className="h-8 w-48 bg-default-200 rounded animate-pulse" />
                  <div className="h-64 bg-default-100 rounded-lg animate-pulse" />
                </div>
              </div>
            }
          >
            <Suspense fallback={<div>Loading relationships...</div>}>
              <RelationshipsPageContent user={session.user as unknown as User} />
            </Suspense>
          </SuspenseBoundary>
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
