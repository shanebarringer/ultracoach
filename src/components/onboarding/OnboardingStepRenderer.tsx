'use client'

import {
  Button,
  Card,
  CardBody,
  Checkbox,
  CheckboxGroup,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react'
import {
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  MountainIcon,
  RocketIcon,
  TargetIcon,
  TrophyIcon,
  UsersIcon,
} from 'lucide-react'

import { useEffect, useState } from 'react'

interface OnboardingField {
  name: string
  type: string
  label: string
  required?: boolean
}

interface OnboardingStep {
  id: string
  step_number: number
  role: 'runner' | 'coach' | 'both'
  title: string
  description: string
  step_type: 'welcome' | 'profile' | 'preferences' | 'goals' | 'connections' | 'completion'
  fields: OnboardingField[]
  is_required: boolean
}

interface OnboardingStepRendererProps {
  step: OnboardingStep
  answers: Record<string, unknown>
  onChange: (answers: Record<string, unknown>) => void
  onSubmit: (answers: Record<string, unknown>) => void
}

export default function OnboardingStepRenderer({
  step,
  answers,
  onChange,
  onSubmit,
}: OnboardingStepRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(answers)

  useEffect(() => {
    setFormData(answers)
  }, [answers])

  const handleInputChange = (field: string, value: unknown) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange(newData)
  }

  // Helper functions for type-safe access to form data
  const getString = (field: string): string => {
    const value = formData[field]
    return typeof value === 'string' ? value : ''
  }

  const getStringArray = (field: string): string[] => {
    const value = formData[field]
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  }

  const handleSubmit = () => {
    onSubmit(formData)
  }

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6 py-8">
      <div className="text-6xl mb-4">🏔️</div>
      <div>
        <h2 className="text-2xl font-bold mb-2">Welcome to UltraCoach!</h2>
        <p className="text-lg text-foreground-600 max-w-md mx-auto leading-relaxed">
          Your journey to peak performance starts here. We&apos;ll help you set up your profile and
          preferences to create the perfect training experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4">
          <CardBody className="text-center">
            <TrophyIcon className="w-8 h-8 text-warning mx-auto mb-2" />
            <h3 className="font-semibold">Achieve Goals</h3>
            <p className="text-sm text-foreground-500">Set and track your training objectives</p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardBody className="text-center">
            <UsersIcon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">Connect</h3>
            <p className="text-sm text-foreground-500">Find coaches or runners to train with</p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardBody className="text-center">
            <RocketIcon className="w-8 h-8 text-success mx-auto mb-2" />
            <h3 className="font-semibold">Improve</h3>
            <p className="text-sm text-foreground-500">Track progress and level up your training</p>
          </CardBody>
        </Card>
      </div>
    </div>
  )

  const renderProfileStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <HeartIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Tell us about yourself</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          placeholder="Enter your first name"
          value={getString('firstName')}
          onValueChange={value => handleInputChange('firstName', value)}
        />

        <Input
          label="Last Name"
          placeholder="Enter your last name"
          value={getString('lastName')}
          onValueChange={value => handleInputChange('lastName', value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          label="Age"
          placeholder="Your age"
          value={getString('age')}
          onValueChange={value => handleInputChange('age', value)}
        />

        <Select
          label="Gender"
          placeholder="Select gender"
          selectedKeys={getString('gender') ? [getString('gender')] : []}
          onSelectionChange={keys => {
            const value = Array.from(keys)[0] as string
            handleInputChange('gender', value || '')
          }}
        >
          <SelectItem key="male">Male</SelectItem>
          <SelectItem key="female">Female</SelectItem>
          <SelectItem key="non-binary">Non-binary</SelectItem>
          <SelectItem key="prefer-not-to-say">Prefer not to say</SelectItem>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Location"
          placeholder="City, State/Country"
          value={getString('location')}
          onValueChange={value => handleInputChange('location', value)}
          startContent={<MapPinIcon className="w-4 h-4 text-foreground-400" />}
        />

        <Select
          label="Time Zone"
          placeholder="Select your time zone"
          selectedKeys={getString('timeZone') ? [getString('timeZone')] : []}
          onSelectionChange={keys => {
            const value = Array.from(keys)[0] as string
            handleInputChange('timeZone', value || '')
          }}
        >
          <SelectItem key="Pacific/Honolulu">Hawaii (HST)</SelectItem>
          <SelectItem key="America/Anchorage">Alaska (AKST)</SelectItem>
          <SelectItem key="America/Los_Angeles">Pacific (PST)</SelectItem>
          <SelectItem key="America/Denver">Mountain (MST)</SelectItem>
          <SelectItem key="America/Chicago">Central (CST)</SelectItem>
          <SelectItem key="America/New_York">Eastern (EST)</SelectItem>
        </Select>
      </div>
    </div>
  )

  const renderGoalsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <TargetIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">What are your goals?</h3>
      </div>

      <div className="space-y-4">
        <Select
          label="Primary Goal"
          placeholder="What's your main objective?"
          selectedKeys={getString('primaryGoal') ? [getString('primaryGoal')] : []}
          onSelectionChange={keys => {
            const value = Array.from(keys)[0] as string
            handleInputChange('primaryGoal', value || '')
          }}
        >
          <SelectItem key="first-ultramarathon">Complete my first ultramarathon</SelectItem>
          <SelectItem key="improve-times">Improve my race times</SelectItem>
          <SelectItem key="increase-distance">Run longer distances</SelectItem>
          <SelectItem key="general-fitness">General fitness and health</SelectItem>
          <SelectItem key="weight-management">Weight management</SelectItem>
          <SelectItem key="mental-health">Mental health and well-being</SelectItem>
          <SelectItem key="competitive-racing">Competitive racing</SelectItem>
        </Select>

        <Select
          label="Experience Level"
          placeholder="How would you describe your running experience?"
          selectedKeys={getString('experienceLevel') ? [getString('experienceLevel')] : []}
          onSelectionChange={keys => {
            const value = Array.from(keys)[0] as string
            handleInputChange('experienceLevel', value || '')
          }}
        >
          <SelectItem key="beginner">Beginner (0-1 years)</SelectItem>
          <SelectItem key="intermediate">Intermediate (1-3 years)</SelectItem>
          <SelectItem key="advanced">Advanced (3-5 years)</SelectItem>
          <SelectItem key="expert">Expert (5+ years)</SelectItem>
        </Select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Current Weekly Miles"
            placeholder="Average miles per week"
            selectedKeys={getString('weeklyMiles') ? [getString('weeklyMiles')] : []}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleInputChange('weeklyMiles', value || '')
            }}
          >
            <SelectItem key="0-10">0-10 miles</SelectItem>
            <SelectItem key="10-25">10-25 miles</SelectItem>
            <SelectItem key="25-40">25-40 miles</SelectItem>
            <SelectItem key="40-60">40-60 miles</SelectItem>
            <SelectItem key="60+">60+ miles</SelectItem>
          </Select>

          <Select
            label="Target Race Distance"
            placeholder="What distance interests you?"
            selectedKeys={getString('targetDistance') ? [getString('targetDistance')] : []}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleInputChange('targetDistance', value || '')
            }}
          >
            <SelectItem key="50k">50K (31 miles)</SelectItem>
            <SelectItem key="50-mile">50 Mile</SelectItem>
            <SelectItem key="100k">100K (62 miles)</SelectItem>
            <SelectItem key="100-mile">100 Mile</SelectItem>
            <SelectItem key="multi-day">Multi-day events</SelectItem>
          </Select>
        </div>

        <Textarea
          label="Additional Goals (Optional)"
          placeholder="Tell us about any specific goals, challenges, or areas you'd like to focus on..."
          value={getString('additionalGoals')}
          onValueChange={value => handleInputChange('additionalGoals', value)}
          minRows={3}
        />
      </div>
    </div>
  )

  const renderPreferencesStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Training Preferences</h3>
      </div>

      <div className="space-y-6">
        <CheckboxGroup
          label="Preferred Training Times"
          value={getStringArray('preferredTimes')}
          onValueChange={value => handleInputChange('preferredTimes', value)}
          orientation="horizontal"
        >
          <Checkbox value="early-morning">Early Morning (5-8 AM)</Checkbox>
          <Checkbox value="morning">Morning (8-12 PM)</Checkbox>
          <Checkbox value="afternoon">Afternoon (12-5 PM)</Checkbox>
          <Checkbox value="evening">Evening (5-8 PM)</Checkbox>
          <Checkbox value="night">Night (8+ PM)</Checkbox>
        </CheckboxGroup>

        <CheckboxGroup
          label="Preferred Terrain"
          value={getStringArray('preferredTerrain')}
          onValueChange={value => handleInputChange('preferredTerrain', value)}
          orientation="horizontal"
        >
          <Checkbox value="road">Road</Checkbox>
          <Checkbox value="trail">Trail</Checkbox>
          <Checkbox value="track">Track</Checkbox>
          <Checkbox value="treadmill">Treadmill</Checkbox>
        </CheckboxGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Training Days per Week"
            placeholder="How many days do you want to train?"
            selectedKeys={getString('trainingDays') ? [getString('trainingDays')] : []}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleInputChange('trainingDays', value || '')
            }}
          >
            <SelectItem key="3">3 days</SelectItem>
            <SelectItem key="4">4 days</SelectItem>
            <SelectItem key="5">5 days</SelectItem>
            <SelectItem key="6">6 days</SelectItem>
            <SelectItem key="7">7 days</SelectItem>
          </Select>

          <Select
            label="Preferred Units"
            placeholder="Miles or kilometers?"
            selectedKeys={getString('units') ? [getString('units')] : []}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleInputChange('units', value || '')
            }}
          >
            <SelectItem key="miles">Miles</SelectItem>
            <SelectItem key="kilometers">Kilometers</SelectItem>
          </Select>
        </div>

        <CheckboxGroup
          label="Areas of Interest (Optional)"
          value={getStringArray('interests')}
          onValueChange={value => handleInputChange('interests', value)}
        >
          <Checkbox value="nutrition">Nutrition guidance</Checkbox>
          <Checkbox value="strength-training">Strength training</Checkbox>
          <Checkbox value="injury-prevention">Injury prevention</Checkbox>
          <Checkbox value="mental-training">Mental training</Checkbox>
          <Checkbox value="gear-advice">Gear recommendations</Checkbox>
          <Checkbox value="race-strategy">Race strategy</Checkbox>
        </CheckboxGroup>
      </div>
    </div>
  )

  const renderConnectionsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <UsersIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Connect with Others</h3>
      </div>

      <div className="space-y-6">
        <Card className="p-4 border border-primary-200 bg-primary-50/50">
          <CardBody>
            <p className="text-sm text-foreground-700 mb-4">
              UltraCoach is more than just training plans - it&apos;s about building connections
              that help you succeed. Connect with experienced coaches or fellow runners who share
              your goals.
            </p>

            <CheckboxGroup
              label="I'm interested in:"
              value={getStringArray('connectionInterests')}
              onValueChange={value => handleInputChange('connectionInterests', value)}
            >
              <Checkbox value="find-coach">Finding a coach to guide my training</Checkbox>
              <Checkbox value="training-partners">Connecting with training partners</Checkbox>
              <Checkbox value="mentor-others">Helping and mentoring other runners</Checkbox>
              <Checkbox value="join-groups">Joining training groups or challenges</Checkbox>
              <Checkbox value="share-progress">
                Sharing progress and celebrating achievements
              </Checkbox>
            </CheckboxGroup>
          </CardBody>
        </Card>

        <div>
          <Textarea
            label="Tell us about yourself (Optional)"
            placeholder="Share a bit about your running journey, what motivates you, or what kind of support you're looking for..."
            value={getString('bio')}
            onValueChange={value => handleInputChange('bio', value)}
            minRows={3}
            description="This will help others connect with you and understand your goals."
          />
        </div>

        <div className="p-4 bg-success-50 rounded-lg border border-success-200">
          <div className="flex items-start gap-2">
            <MountainIcon className="w-5 h-5 text-success-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-success-800 mb-1">Privacy & Safety</p>
              <p className="text-success-700">
                Your profile information will only be visible to verified coaches and runners. You
                control who can message you and what information you share.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCompletionStep = () => (
    <div className="text-center space-y-6 py-8">
      <div className="text-6xl mb-4">🎉</div>

      <div>
        <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
        <p className="text-lg text-foreground-600 max-w-md mx-auto leading-relaxed">
          Welcome to the UltraCoach community! Your profile is ready, and we&apos;re excited to help
          you achieve your ultramarathon goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card className="p-4 bg-primary-50 border-primary-200">
          <CardBody className="text-center">
            <TrophyIcon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">Start Training</h3>
            <p className="text-sm text-foreground-600">
              Access your personalized dashboard and begin your training journey
            </p>
          </CardBody>
        </Card>

        <Card className="p-4 bg-success-50 border-success-200">
          <CardBody className="text-center">
            <UsersIcon className="w-8 h-8 text-success mx-auto mb-2" />
            <h3 className="font-semibold">Find Your Tribe</h3>
            <p className="text-sm text-foreground-600">
              Connect with coaches and runners who share your passion
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (step.step_type) {
      case 'welcome':
        return renderWelcomeStep()
      case 'profile':
        return renderProfileStep()
      case 'goals':
        return renderGoalsStep()
      case 'preferences':
        return renderPreferencesStep()
      case 'connections':
        return renderConnectionsStep()
      case 'completion':
        return renderCompletionStep()
      default:
        return (
          <div className="text-center py-8">
            <p className="text-foreground-500">Unknown step type: {step.step_type}</p>
          </div>
        )
    }
  }

  return (
    <div>
      {renderStepContent()}

      {step.step_type !== 'welcome' && step.step_type !== 'completion' && (
        <div className="mt-8 pt-4 border-t border-default-200">
          <Button color="primary" onPress={handleSubmit} className="w-full md:w-auto">
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}
