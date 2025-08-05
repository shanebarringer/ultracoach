import { Suspense } from 'react'

import { Metadata } from 'next'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { SuspenseBoundary } from '@/components/ui/SuspenseBoundary'

import { RelationshipsPageContent } from './RelationshipsPageContent'

export const metadata: Metadata = {
  title: 'Relationships - UltraCoach',
  description: 'Manage your coaching relationships and connect with coaches or runners',
}

export default function RelationshipsPage() {
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
              <RelationshipsPageContent />
            </Suspense>
          </SuspenseBoundary>
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
