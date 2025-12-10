'use client'

import { Button, Card, CardBody, CardHeader, Divider, Switch, Chip } from '@heroui/react'
import { Users, Star, Calendar, MessageCircle, Eye } from 'lucide-react'
import { useState } from 'react'

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('WorkWithMeCard')

interface CoachStats {
  total_athletes: number
  active_athletes: number
  average_rating: number
  total_reviews: number
  years_coaching: number
  success_stories: number
}

interface WorkWithMeCardProps {
  coachStats: CoachStats
  availabilityStatus: 'available' | 'limited' | 'unavailable'
  onAvailabilityChange: (status: 'available' | 'limited' | 'unavailable') => void
  isOwnProfile?: boolean
}

export default function WorkWithMeCard({
  coachStats,
  availabilityStatus,
  onAvailabilityChange,
  isOwnProfile = false,
}: WorkWithMeCardProps) {
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false)

  const handleAvailabilityToggle = async (isAvailable: boolean) => {
    const newStatus = isAvailable ? 'available' : 'unavailable'
    
    setIsUpdatingAvailability(true)
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability_status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update availability')
      }

      onAvailabilityChange(newStatus)
      commonToasts.success(`Availability updated to ${newStatus}`)
      logger.info('Availability updated', { status: newStatus })
    } catch (error) {
      logger.error('Failed to update availability:', error)
      commonToasts.error('Failed to update availability')
    } finally {
      setIsUpdatingAvailability(false)
    }
  }

  const getAvailabilityColor = () => {
    switch (availabilityStatus) {
      case 'available':
        return 'success'
      case 'limited':
        return 'warning'
      case 'unavailable':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getAvailabilityText = () => {
    switch (availabilityStatus) {
      case 'available':
        return 'Accepting Athletes'
      case 'limited':
        return 'Waitlist Only'
      case 'unavailable':
        return 'Waitlist Only'
      default:
        return 'Unknown'
    }
  }

  const formatRating = (rating: number) => {
    return rating ? rating.toFixed(1) : '0.0'
  }

  const getSpotsLeftText = () => {
    if (availabilityStatus === 'available') {
      return '3 spots left'
    }
    return 'Waitlist Only'
  }

  return (
    <Card className="border border-divider bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <h3 className="text-lg font-semibold text-foreground">Work With Me</h3>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-6">
        {/* Coach Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-primary mr-1" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {coachStats.active_athletes || 45}+
            </div>
            <div className="text-xs text-foreground-600">Athletes Coached</div>
          </div>
          
          <div>
            <div className="flex items-center justify-center mb-1">
              <Star className="w-4 h-4 text-warning mr-1" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatRating(coachStats.average_rating || 4.9)}
            </div>
            <div className="text-xs text-foreground-600">Avg Rating</div>
          </div>
          
          <div>
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-secondary mr-1" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {coachStats.years_coaching || 15}
            </div>
            <div className="text-xs text-foreground-600">Years Experience</div>
          </div>
        </div>

        {/* Availability Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground-600">Availability Status</span>
            <Chip
              size="sm"
              color={getAvailabilityColor()}
              variant="flat"
            >
              {getAvailabilityText()}
            </Chip>
          </div>
          
          {isOwnProfile && (
            <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
              <span className="text-sm text-foreground-600">Accepting Athletes</span>
              <Switch
                size="sm"
                isSelected={availabilityStatus === 'available'}
                onValueChange={handleAvailabilityToggle}
                isDisabled={isUpdatingAvailability}
              />
            </div>
          )}
          
          {!isOwnProfile && (
            <div className="text-center">
              <p className="text-sm text-foreground-600 mb-2">
                {getSpotsLeftText()}
              </p>
              <div className="text-xs text-foreground-500">
                Preview what athletes see:
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="space-y-3">
            <Button
              color="primary"
              className="w-full"
              size="lg"
              startContent={<MessageCircle className="w-4 h-4" />}
            >
              Request Free Consultation
            </Button>
            
            <Button
              variant="bordered"
              className="w-full"
              startContent={<Eye className="w-4 h-4" />}
            >
              View Coaching Plans
            </Button>
          </div>
        )}

        {isOwnProfile && (
          <div className="space-y-3">
            <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
              <Eye className="w-5 h-5 text-info mx-auto mb-2" />
              <p className="text-sm text-info-600 font-medium mb-1">
                Profile Preview Mode
              </p>
              <p className="text-xs text-info-500">
                This is how your profile appears to potential athletes
              </p>
            </div>
            
            <Button
              variant="flat"
              className="w-full"
              as="a"
              href="/dashboard/coach"
            >
              Back to Dashboard
            </Button>
          </div>
        )}

        {/* Additional Info */}
        <div className="pt-2 border-t border-divider">
          <div className="text-xs text-foreground-500 space-y-1">
            <p>✓ Free initial consultation</p>
            <p>✓ Personalized training plans</p>
            <p>✓ Weekly check-ins</p>
            <p>✓ Race strategy & nutrition</p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
