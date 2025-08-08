'use client'

import { Card, CardBody } from '@heroui/react'
import { useAtom } from 'jotai'

import { useCallback } from 'react'

import { CoachSelector } from '@/components/relationships/CoachSelector'
import { RelationshipsList } from '@/components/relationships/RelationshipsList'
import { RunnerSelector } from '@/components/relationships/RunnerSelector'
import { useBetterAuth } from '@/hooks/useBetterAuth'
import { relationshipsAtom } from '@/lib/atoms'

export function RelationshipsPageContent() {
  const { user } = useBetterAuth()
  const [, refreshRelationships] = useAtom(relationshipsAtom)

  const handleRelationshipChange = useCallback(() => {
    // Refresh relationships atom to get updated data
    refreshRelationships()
  }, [refreshRelationships])

  if (!user) {
    return (
      <Card className="w-full">
        <CardBody className="p-6 text-center">
          <p className="text-default-600">Please sign in to manage your relationships.</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Column - Existing Relationships */}
      <div className="space-y-6">
        <RelationshipsList onRelationshipUpdated={handleRelationshipChange} />
      </div>

      {/* Right Column - Find New Connections */}
      <div className="space-y-6">
        {user.role === 'runner' && (
          <CoachSelector onRelationshipCreated={handleRelationshipChange} />
        )}

        {user.role === 'coach' && (
          <RunnerSelector onRelationshipCreated={handleRelationshipChange} />
        )}

        {/* Info Card */}
        <Card className="w-full">
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold mb-3">How it Works</h3>
            <div className="space-y-2 text-sm text-default-600">
              {user.role === 'runner' ? (
                <>
                  <p>• Browse available coaches and send connection requests</p>
                  <p>• Wait for coaches to accept your requests</p>
                  <p>• Once connected, start messaging and receive training plans</p>
                </>
              ) : (
                <>
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
  )
}
