'use client'

import React, { useState } from 'react'
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Chip,
  Card,
  CardBody,
  Input
} from '@heroui/react'
import { Link2, Calendar, MapPin, Target } from 'lucide-react'
import { useWorkouts } from '@/hooks/useWorkouts'
import { Workout } from '@/lib/supabase'

interface WorkoutLinkSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectWorkout: (workout: Workout, linkType: string) => void
  recipientId: string
}

const LINK_TYPES = [
  { key: 'reference', label: 'Reference', description: 'Mention this workout' },
  { key: 'feedback', label: 'Feedback', description: 'Provide feedback on workout' },
  { key: 'question', label: 'Question', description: 'Ask about this workout' },
  { key: 'update', label: 'Update', description: 'Share workout update' },
  { key: 'plan_change', label: 'Plan Change', description: 'Suggest plan modification' }
]

export default function WorkoutLinkSelector({
  isOpen,
  onClose,
  onSelectWorkout,
}: WorkoutLinkSelectorProps) {
  const { workouts, loading } = useWorkouts()
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [linkType, setLinkType] = useState('reference')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter workouts for the current conversation context
  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = searchTerm === '' || 
      workout.planned_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workout.date?.includes(searchTerm)
    return matchesSearch
  })

  // Group workouts by date (recent first)
  const groupedWorkouts = filteredWorkouts
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
    .slice(0, 20) // Limit to recent 20 workouts

  const getWorkoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'planned': return 'primary'
      case 'skipped': return 'warning'
      default: return 'default'
    }
  }

  const handleSelectWorkout = () => {
    if (selectedWorkout) {
      onSelectWorkout(selectedWorkout, linkType)
      onClose()
      setSelectedWorkout(null)
      setLinkType('reference')
      setSearchTerm('')
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedWorkout(null)
    setLinkType('reference')
    setSearchTerm('')
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary-500" />
          Link Message to Workout
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Search and filter */}
          <Input
            placeholder="Search workouts by type or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Target className="h-4 w-4 text-default-400" />}
            classNames={{
              input: "text-small",
              inputWrapper: "bg-background"
            }}
          />

          {/* Link type selector */}
          <Select
            label="Link Type"
            placeholder="Select how this message relates to the workout"
            selectedKeys={[linkType]}
            onSelectionChange={(keys) => setLinkType(Array.from(keys)[0] as string)}
            classNames={{
              trigger: "bg-background"
            }}
          >
            {LINK_TYPES.map((type) => (
              <SelectItem key={type.key}>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-small text-default-500">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </Select>

          {/* Workout list */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto" />
                <p className="text-small text-default-500 mt-2">Loading workouts...</p>
              </div>
            ) : groupedWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-default-300 mx-auto mb-2" />
                <p className="text-default-500">No workouts found</p>
                <p className="text-small text-default-400">Try adjusting your search</p>
              </div>
            ) : (
              groupedWorkouts.map((workout) => (
                <Card 
                  key={workout.id}
                  isPressable
                  onPress={() => setSelectedWorkout(workout)}
                  className={`transition-all duration-200 cursor-pointer ${
                    selectedWorkout?.id === workout.id 
                      ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-950' 
                      : 'hover:bg-default-50 dark:hover:bg-default-900'
                  }`}
                >
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-default-400" />
                          <span className="text-small font-medium">
                            {new Date(workout.date || '').toLocaleDateString()}
                          </span>
                          <Chip 
                            size="sm" 
                            color={getWorkoutStatusColor(workout.status || 'planned')}
                            variant="flat"
                          >
                            {workout.status || 'planned'}
                          </Chip>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {workout.planned_type || 'Training Run'}
                          </p>
                          {workout.planned_distance && (
                            <div className="flex items-center gap-1 text-small text-default-600">
                              <MapPin className="h-3 w-3" />
                              {workout.planned_distance} miles
                              {workout.planned_duration && (
                                <span className="ml-2">• {workout.planned_duration} min</span>
                              )}
                            </div>
                          )}
                          {workout.workout_notes && (
                            <p className="text-small text-default-500 line-clamp-2">
                              {workout.workout_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button 
            variant="light" 
            onPress={handleClose}
          >
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleSelectWorkout}
            isDisabled={!selectedWorkout}
            startContent={<Link2 className="h-4 w-4" />}
          >
            Link Workout
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}