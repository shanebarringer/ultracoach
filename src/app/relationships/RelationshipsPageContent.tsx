'use client'

import { Card, CardBody } from '@heroui/react'
import { useSetAtom } from 'jotai'

import { useCallback } from 'react'

import { CoachSelector } from '@/components/relationships/CoachSelector'
import { InvitationsList } from '@/components/relationships/InvitationsList'
import { InviteRunnerModal } from '@/components/relationships/InviteRunnerModal'
import { RelationshipsList } from '@/components/relationships/RelationshipsList'
import { RunnerSelector } from '@/components/relationships/RunnerSelector'
import { api } from '@/lib/api-client'
import { relationshipsAtom } from '@/lib/atoms/index'
import type { User } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'
import type { RelationshipData } from '@/types/relationships'

const logger = createLogger('RelationshipsPageContent')

interface RelationshipsPageContentProps {
  user: User
}

/**
 * Main content component for the relationships page.
 * Displays coach-runner relationships and connection management UI.
 */
export function RelationshipsPageContent({ user }: RelationshipsPageContentProps) {
  const setRelationships = useSetAtom(relationshipsAtom)

  /**
   * Refreshes the relationships atom with fresh data from the API.
   * Called after relationship updates to keep the UI in sync.
   */
  const handleRelationshipChange = useCallback(async () => {
    try {
      const response = await api.get<{ relationships?: RelationshipData[] }>('/api/coach-runners')
      setRelationships(response.data.relationships || [])
    } catch (error) {
      logger.error('Failed to refresh relationships:', error)
    }
  }, [setRelationships])

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Existing Relationships */}
        <div className="space-y-6">
          <RelationshipsList onRelationshipUpdated={handleRelationshipChange} />
        </div>

        {/* Right Column - Find New Connections & Invitations */}
        <div className="space-y-6">
          {user.userType === 'runner' && (
            <CoachSelector onRelationshipCreated={handleRelationshipChange} user={user} />
          )}

          {user.userType === 'coach' && (
            <>
              {/* Invitations Section - Coaches can invite runners */}
              <InvitationsList onInvitationUpdated={handleRelationshipChange} />

              {/* Find existing runners */}
              <RunnerSelector onRelationshipCreated={handleRelationshipChange} user={user} />
            </>
          )}

          {/* Info Card */}
          <Card className="w-full">
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold mb-3">How it Works</h3>
              <div className="space-y-2 text-sm text-default-600">
                {user.userType === 'runner' ? (
                  <>
                    <p>• Browse available coaches and send connection requests</p>
                    <p>• Wait for coaches to accept your requests</p>
                    <p>• Once connected, start messaging and receive training plans</p>
                  </>
                ) : (
                  <>
                    <p>• Invite new runners via email - they&apos;ll receive a link to join</p>
                    <p>• Browse available runners and send connection requests</p>
                    <p>• Accept or decline incoming connection requests</p>
                    <p>• Create training plans and communicate with your runners</p>
                  </>
                )}
                <p>• All connections require mutual acceptance</p>
                <p>• You can manage your relationships anytime</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Invite Modal - Coaches only */}
      {user.userType === 'coach' && <InviteRunnerModal />}
    </>
  )
}
