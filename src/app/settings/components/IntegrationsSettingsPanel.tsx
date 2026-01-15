'use client'

import { Card, CardBody, CardHeader } from '@heroui/react'
import { Activity } from 'lucide-react'

import StravaActivityList from '@/components/strava/StravaActivityList'
import StravaConnectionCard from '@/components/strava/StravaConnectionCard'

export default function IntegrationsSettingsPanel() {
  return (
    <Card className="w-full" data-testid="integrations-settings-panel">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Integrations</h2>
            <p className="text-sm text-default-500">
              Connect external services to enhance your training experience
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-6">
        <div data-testid="activity-tracking-section">
          <h3 className="text-lg font-medium mb-4">Activity Tracking</h3>
          <StravaConnectionCard />
        </div>

        <div data-testid="activity-sync-section">
          <h3 className="text-lg font-medium mb-4">Activity Sync</h3>
          <StravaActivityList />
        </div>

        {/* Future integrations */}
        <div className="text-center py-8 text-default-400" data-testid="future-integrations">
          <p>More integrations coming soon...</p>
          <p className="text-sm mt-1">Garmin Connect, Polar Flow, and more</p>
        </div>
      </CardBody>
    </Card>
  )
}
