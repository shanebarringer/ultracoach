import { db } from '../../src/lib/database'
import { createLogger } from '../../src/lib/logger'
import { onboarding_steps } from '../../src/lib/schema'

const logger = createLogger('seed-onboarding-steps')

const defaultOnboardingSteps = [
  // Step 1: Welcome
  {
    step_number: 1,
    role: 'both' as const,
    title: 'Welcome to UltraCoach',
    description: "Let's get started on your ultramarathon journey",
    step_type: 'welcome' as const,
    fields: [],
    is_required: true,
    is_active: true,
  },

  // Step 2: Profile Information
  {
    step_number: 2,
    role: 'both' as const,
    title: 'Tell Us About Yourself',
    description: 'Help us create your profile and understand your background',
    step_type: 'profile' as const,
    fields: [
      { name: 'firstName', type: 'text', label: 'First Name', required: true },
      { name: 'lastName', type: 'text', label: 'Last Name', required: true },
      { name: 'age', type: 'number', label: 'Age', required: false },
      { name: 'gender', type: 'select', label: 'Gender', required: false },
      { name: 'location', type: 'text', label: 'Location', required: false },
      { name: 'timeZone', type: 'select', label: 'Time Zone', required: false },
    ],
    is_required: true,
    is_active: true,
  },

  // Step 3: Goals and Experience
  {
    step_number: 3,
    role: 'both' as const,
    title: 'What Are Your Goals?',
    description: 'Define your objectives and tell us about your experience',
    step_type: 'goals' as const,
    fields: [
      { name: 'primaryGoal', type: 'select', label: 'Primary Goal', required: true },
      { name: 'experienceLevel', type: 'select', label: 'Experience Level', required: true },
      { name: 'weeklyMiles', type: 'select', label: 'Current Weekly Miles', required: false },
      { name: 'targetDistance', type: 'select', label: 'Target Race Distance', required: false },
      { name: 'additionalGoals', type: 'textarea', label: 'Additional Goals', required: false },
    ],
    is_required: true,
    is_active: true,
  },

  // Step 4: Training Preferences
  {
    step_number: 4,
    role: 'both' as const,
    title: 'Training Preferences',
    description: 'Let us know how you like to train and when',
    step_type: 'preferences' as const,
    fields: [
      {
        name: 'preferredTimes',
        type: 'checkbox-group',
        label: 'Preferred Training Times',
        required: false,
      },
      {
        name: 'preferredTerrain',
        type: 'checkbox-group',
        label: 'Preferred Terrain',
        required: false,
      },
      { name: 'trainingDays', type: 'select', label: 'Training Days per Week', required: false },
      { name: 'units', type: 'select', label: 'Preferred Units', required: false },
      { name: 'interests', type: 'checkbox-group', label: 'Areas of Interest', required: false },
    ],
    is_required: false,
    is_active: true,
  },

  // Step 5: Connections and Community
  {
    step_number: 5,
    role: 'both' as const,
    title: 'Connect with Others',
    description: 'Join the UltraCoach community and find your training partners',
    step_type: 'connections' as const,
    fields: [
      {
        name: 'connectionInterests',
        type: 'checkbox-group',
        label: 'Connection Interests',
        required: false,
      },
      { name: 'bio', type: 'textarea', label: 'About Yourself', required: false },
    ],
    is_required: false,
    is_active: true,
  },

  // Step 6: Completion
  {
    step_number: 6,
    role: 'both' as const,
    title: "You're All Set!",
    description: 'Welcome to the UltraCoach community',
    step_type: 'completion' as const,
    fields: [],
    is_required: true,
    is_active: true,
  },
]

async function seedOnboardingSteps() {
  try {
    logger.info('Starting onboarding steps seed...')

    // Clear existing steps
    await db.delete(onboarding_steps)
    logger.info('Cleared existing onboarding steps')

    // Insert new steps
    for (const step of defaultOnboardingSteps) {
      await db.insert(onboarding_steps).values(step)
      logger.info(`Created onboarding step: ${step.step_number} - ${step.title}`)
    }

    logger.info('✅ Onboarding steps seeding completed successfully!')
    logger.info(`Created ${defaultOnboardingSteps.length} onboarding steps`)
  } catch (error) {
    logger.error('❌ Error seeding onboarding steps:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedOnboardingSteps()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      logger.error('Seeding failed:', error)
      process.exit(1)
    })
}

export { seedOnboardingSteps }
