'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from '@heroui/react'
import { Check, ExternalLink, Plus, Settings, Trophy } from 'lucide-react'

import { useState } from 'react'

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('UltraSignupResults')

interface RaceResult {
  id: string
  race_name: string
  race_date: string
  distance: string
  finish_time: string
  overall_place: number
  gender_place?: number
  age_group_place?: number
  total_participants: number
  race_url?: string
  is_featured: boolean
}

interface UltraSignupConnection {
  id: string
  profile_url: string
  athlete_name?: string
  is_verified: boolean
  sync_enabled: boolean
  last_sync_at?: string
}

interface UltraSignupResultsProps {
  connection?: UltraSignupConnection | null
  results: RaceResult[]
  onConnectionChange: (connection: UltraSignupConnection | null) => void
  onResultsChange: (results: RaceResult[]) => void
  isEditable?: boolean
}

export default function UltraSignupResults({
  connection,
  results,
  onConnectionChange,
  onResultsChange,
  isEditable = true,
}: UltraSignupResultsProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [profileUrl, setProfileUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleConnectProfile = async () => {
    if (!profileUrl) {
      commonToasts.saveError('Please enter your UltraSignup profile URL')
      return
    }

    // Validate URL format
    if (!profileUrl.includes('ultrasignup.com')) {
      commonToasts.saveError('Please enter a valid UltraSignup profile URL')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/profile/ultrasignup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_url: profileUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to connect UltraSignup profile')
      }

      const newConnection = await response.json()
      onConnectionChange(newConnection)

      setProfileUrl('')
      onClose()

      commonToasts.saveSuccess()
      logger.info('UltraSignup profile connected', { profileUrl })

      // Automatically sync results after connecting
      handleSyncResults()
    } catch (error) {
      logger.error('Failed to connect UltraSignup profile:', error)
      commonToasts.saveError('Failed to connect UltraSignup profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncResults = async () => {
    if (!connection) return

    setIsSyncing(true)

    try {
      const response = await fetch('/api/profile/ultrasignup/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to sync race results')
      }

      const { results: newResults } = await response.json()
      onResultsChange(newResults)

      commonToasts.saveSuccess()
      logger.info('Race results synced', { resultCount: newResults.length })
    } catch (error) {
      logger.error('Failed to sync race results:', error)
      commonToasts.saveError('Failed to sync race results')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!connection) return

    try {
      const response = await fetch('/api/profile/ultrasignup', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect UltraSignup profile')
      }

      onConnectionChange(null)
      onResultsChange([])

      commonToasts.deleteSuccess()
      logger.info('UltraSignup profile disconnected')
    } catch (error) {
      logger.error('Failed to disconnect UltraSignup profile:', error)
      commonToasts.deleteError('Failed to disconnect UltraSignup profile')
    }
  }

  const formatTime = (time: string) => {
    // Convert time format if needed (e.g., "18:42:33" to "18h 42m")
    if (time.includes(':')) {
      const parts = time.split(':')
      if (parts.length === 3) {
        const hours = parseInt(parts[0])
        const minutes = parseInt(parts[1])
        return `${hours}h ${minutes}m`
      }
    }
    return time
  }

  const getPlaceColor = (place: number, total: number) => {
    const percentage = (place / total) * 100
    if (percentage <= 10) return 'success'
    if (percentage <= 25) return 'warning'
    return 'default'
  }

  const formatPlace = (place: number) => {
    const suffix = place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'
    return `${place}${suffix}`
  }

  return (
    <Card className="border border-divider">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold text-foreground">UltraSignup Results</h3>
            <Chip size="sm" variant="flat" color="secondary">
              Optional
            </Chip>
          </div>
          {isEditable && (
            <div className="flex items-center gap-2">
              {connection && (
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<Settings className="w-4 h-4" />}
                  onPress={handleSyncResults}
                  isLoading={isSyncing}
                >
                  Sync
                </Button>
              )}
              <Button
                size="sm"
                color="primary"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onOpen}
              >
                {connection ? 'Manage' : 'Connect'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        {connection && results.length > 0 ? (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">Profile Connected</p>
                  <p className="text-sm text-foreground-600">
                    {connection.athlete_name || 'UltraSignup Profile'}
                  </p>
                </div>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                as="a"
                href={connection.profile_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            {/* Recent Results */}
            <div>
              <h4 className="text-sm font-medium text-foreground-600 mb-3">Recent Results</h4>
              <div className="space-y-3">
                {results.slice(0, 3).map(result => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-default-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground">{result.race_name}</h5>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-foreground-600">{result.distance}</span>
                        <span className="text-sm text-foreground-600">
                          {new Date(result.race_date).getFullYear()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        {formatTime(result.finish_time)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Chip
                          size="sm"
                          color={getPlaceColor(result.overall_place, result.total_participants)}
                          variant="flat"
                        >
                          {formatPlace(result.overall_place)}
                        </Chip>
                        {result.race_url && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            as="a"
                            href={result.race_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {results.length > 3 && (
                <div className="text-center mt-4">
                  <Button
                    variant="flat"
                    size="sm"
                    as="a"
                    href={connection.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    endContent={<ExternalLink className="w-4 h-4" />}
                  >
                    View All Results
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : connection && results.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-foreground-300 mx-auto mb-4" />
            <p className="text-foreground-600 mb-4">Profile connected but no race results found</p>
            <Button
              color="primary"
              variant="flat"
              onPress={handleSyncResults}
              isLoading={isSyncing}
            >
              Sync Results
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-foreground-300 mx-auto mb-4" />
            <p className="text-foreground-600 mb-4">
              Connect your UltraSignup profile to showcase your race results and build credibility
              with potential athletes
            </p>
            {isEditable && (
              <Button
                color="primary"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onOpen}
              >
                Connect UltraSignup
              </Button>
            )}
          </div>
        )}
      </CardBody>

      {/* Connect/Manage Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader>
            {connection ? 'Manage UltraSignup Connection' : 'Connect UltraSignup Profile'}
          </ModalHeader>
          <ModalBody className="space-y-4">
            {!connection ? (
              <>
                <p className="text-foreground-600">
                  Enter your UltraSignup profile URL to automatically import your race results.
                </p>
                <Input
                  label="UltraSignup Profile URL"
                  placeholder="https://ultrasignup.com/results_participant.aspx?fname=John&lname=Doe"
                  value={profileUrl}
                  onChange={e => setProfileUrl(e.target.value)}
                  variant="bordered"
                  startContent={<ExternalLink className="w-4 h-4 text-foreground-400" />}
                />
                <div className="text-sm text-foreground-500">
                  <p className="mb-2">To find your profile URL:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to UltraSignup.com</li>
                    <li>Search for your name in race results</li>
                    <li>Click on your name to view your profile</li>
                    <li>Copy the URL from your browser</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-default-50 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Connected Profile</h4>
                  <p className="text-sm text-foreground-600 mb-2">
                    {connection.athlete_name || 'UltraSignup Profile'}
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    as="a"
                    href={connection.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    endContent={<ExternalLink className="w-4 h-4" />}
                  >
                    View Profile
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div>
                    <p className="text-sm font-medium text-warning-600">Disconnect Profile</p>
                    <p className="text-xs text-warning-500">
                      This will remove all synced race results
                    </p>
                  </div>
                  <Button size="sm" color="danger" variant="flat" onPress={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            {!connection && (
              <Button
                color="primary"
                onPress={handleConnectProfile}
                isLoading={isLoading}
                isDisabled={!profileUrl}
              >
                Connect Profile
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  )
}
