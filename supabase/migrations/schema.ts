import { sql } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  integer,
  json,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const betterAuthVerificationTokens = pgTable('better_auth_verification_tokens', {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
})

export const betterAuthUsers = pgTable(
  'better_auth_users',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean('email_verified').notNull(),
    image: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    role: text().default('runner').notNull(),
    banned: boolean(),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires', { mode: 'string' }),
    fullName: text('full_name'),
    notificationPreferences: json('notification_preferences'),
    userType: text('user_type').default('runner').notNull(),
  },
  table => [unique('user_email_unique').on(table.email)]
)

export const betterAuthSessions = pgTable(
  'better_auth_sessions',
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    token: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull(),
    impersonatedBy: text('impersonated_by'),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'session_user_id_user_id_fk',
    }).onDelete('cascade'),
    unique('session_token_unique').on(table.token),
  ]
)

export const conversations = pgTable(
  'conversations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    coachId: text('coach_id').notNull(),
    runnerId: text('runner_id').notNull(),
    trainingPlanId: uuid('training_plan_id'),
    title: varchar({ length: 255 }),
    lastMessageAt: timestamp('last_message_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.trainingPlanId],
      foreignColumns: [trainingPlans.id],
      name: 'conversations_training_plan_id_training_plans_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.coachId],
      foreignColumns: [betterAuthUsers.id],
      name: 'conversations_coach_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.runnerId],
      foreignColumns: [betterAuthUsers.id],
      name: 'conversations_runner_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
  ]
)

export const trainingPlans = pgTable(
  'training_plans',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: text().notNull(),
    description: text(),
    coachId: text('coach_id').notNull(),
    runnerId: text('runner_id').notNull(),
    targetRaceDate: timestamp('target_race_date', { mode: 'string' }),
    targetRaceDistance: text('target_race_distance'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.coachId],
      foreignColumns: [betterAuthUsers.id],
      name: 'training_plans_coach_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.runnerId],
      foreignColumns: [betterAuthUsers.id],
      name: 'training_plans_runner_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
  ]
)

export const messages = pgTable(
  'messages',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    senderId: text('sender_id').notNull(),
    recipientId: text('recipient_id').notNull(),
    content: text().notNull(),
    read: boolean().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    workoutId: uuid('workout_id'),
    contextType: varchar('context_type', { length: 50 }).default('general'),
    conversationId: uuid('conversation_id'),
  },
  table => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: 'messages_conversation_id_conversations_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workouts.id],
      name: 'messages_workout_id_workouts_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [betterAuthUsers.id],
      name: 'messages_sender_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.recipientId],
      foreignColumns: [betterAuthUsers.id],
      name: 'messages_recipient_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
  ]
)

export const races = pgTable(
  'races',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    date: timestamp({ withTimezone: true, mode: 'string' }),
    distanceMiles: numeric('distance_miles', { precision: 6, scale: 2 }).notNull(),
    distanceType: text('distance_type').notNull(),
    location: text().notNull(),
    elevationGainFeet: integer('elevation_gain_feet').default(0),
    terrainType: text('terrain_type').default('trail'),
    websiteUrl: text('website_url'),
    notes: text(),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [betterAuthUsers.id],
      name: 'races_created_by_better_auth_users_id_fk',
    }).onDelete('set null'),
  ]
)

export const trainingPhases = pgTable('training_phases', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  focusAreas: text('focus_areas').array(),
  typicalDurationWeeks: integer('typical_duration_weeks'),
  phaseOrder: integer('phase_order'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const templatePhases = pgTable(
  'template_phases',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    templateId: uuid('template_id').notNull(),
    phaseId: uuid('phase_id').notNull(),
    phaseOrder: integer('phase_order').notNull(),
    durationWeeks: integer('duration_weeks').notNull(),
    targetWeeklyMiles: numeric('target_weekly_miles', { precision: 5, scale: 2 }),
    description: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.phaseId],
      foreignColumns: [trainingPhases.id],
      name: 'template_phases_phase_id_training_phases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [planTemplates.id],
      name: 'template_phases_template_id_plan_templates_id_fk',
    }).onDelete('cascade'),
  ]
)

export const planTemplates = pgTable(
  'plan_templates',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    distanceType: text('distance_type').notNull(),
    durationWeeks: integer('duration_weeks').notNull(),
    difficultyLevel: text('difficulty_level').default('intermediate'),
    peakWeeklyMiles: numeric('peak_weekly_miles', { precision: 5, scale: 2 }),
    minBaseMiles: numeric('min_base_miles', { precision: 5, scale: 2 }),
    createdBy: text('created_by'),
    isPublic: boolean('is_public').default(false),
    tags: text().array(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [betterAuthUsers.id],
      name: 'plan_templates_created_by_better_auth_users_id_fk',
    }).onDelete('set null'),
  ]
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    type: text().notNull(),
    title: text().notNull(),
    message: text().notNull(),
    read: boolean().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'notifications_user_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
  ]
)

export const betterAuthAccounts = pgTable(
  'better_auth_accounts',
  {
    id: text().primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'string' }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'string' }),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'better_auth_accounts_user_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
  ]
)

export const messageWorkoutLinks = pgTable(
  'message_workout_links',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    messageId: uuid('message_id').notNull(),
    workoutId: uuid('workout_id').notNull(),
    linkType: varchar('link_type', { length: 50 }).default('reference'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [messages.id],
      name: 'message_workout_links_message_id_messages_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workouts.id],
      name: 'message_workout_links_workout_id_workouts_id_fk',
    }).onDelete('cascade'),
  ]
)

export const coachRunners = pgTable(
  'coach_runners',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    coachId: text('coach_id').notNull(),
    runnerId: text('runner_id').notNull(),
    status: text().default('pending').notNull(),
    relationshipType: text('relationship_type').default('standard').notNull(),
    invitedBy: text('invited_by'),
    relationshipStartedAt: timestamp('relationship_started_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.coachId],
      foreignColumns: [betterAuthUsers.id],
      name: 'coach_runners_coach_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.runnerId],
      foreignColumns: [betterAuthUsers.id],
      name: 'coach_runners_runner_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    unique('coach_runners_coach_id_runner_id_unique').on(table.coachId, table.runnerId),
  ]
)

export const typingStatus = pgTable(
  'typing_status',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    recipientId: text('recipient_id').notNull(),
    isTyping: boolean('is_typing').default(false).notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'typing_status_user_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.recipientId],
      foreignColumns: [betterAuthUsers.id],
      name: 'typing_status_recipient_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    unique('typing_status_user_id_recipient_id_unique').on(table.userId, table.recipientId),
  ]
)

export const userFeedback = pgTable(
  'user_feedback',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    feedbackType: text('feedback_type').notNull(),
    category: text(),
    title: text().notNull(),
    description: text().notNull(),
    priority: text().default('medium'),
    status: text().default('open'),
    userEmail: text('user_email'),
    browserInfo: json('browser_info'),
    pageUrl: text('page_url'),
    screenshots: text().array(),
    adminNotes: text('admin_notes'),
    resolvedBy: text('resolved_by'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'user_feedback_user_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.resolvedBy],
      foreignColumns: [betterAuthUsers.id],
      name: 'user_feedback_resolved_by_better_auth_users_id_fk',
    }).onDelete('set null'),
  ]
)

export const onboardingSteps = pgTable('onboarding_steps', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  stepNumber: integer('step_number').notNull(),
  role: text().notNull(),
  title: text().notNull(),
  description: text().notNull(),
  stepType: text('step_type').notNull(),
  fields: json(),
  isRequired: boolean('is_required').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const userOnboarding = pgTable(
  'user_onboarding',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    role: text().notNull(),
    currentStep: integer('current_step').default(1).notNull(),
    totalSteps: integer('total_steps').default(5).notNull(),
    completed: boolean().default(false).notNull(),
    stepData: json('step_data'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    skippedAt: timestamp('skipped_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'user_onboarding_user_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    unique('user_onboarding_user_id_unique').on(table.userId),
  ]
)

export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    notificationPreferences: json('notification_preferences'),
    displayPreferences: json('display_preferences'),
    unitPreferences: json('unit_preferences'),
    privacySettings: json('privacy_settings'),
    communicationSettings: json('communication_settings'),
    trainingPreferences: json('training_preferences'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'user_settings_user_id_better_auth_users_id_fk',
    }).onDelete('cascade'),
    unique('user_settings_user_id_unique').on(table.userId),
  ]
)

export const workouts = pgTable(
  'workouts',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    trainingPlanId: uuid('training_plan_id'),
    date: timestamp({ mode: 'string' }).notNull(),
    plannedDistance: numeric('planned_distance', { precision: 5, scale: 2 }),
    plannedDuration: integer('planned_duration'),
    plannedType: text('planned_type'),
    actualDistance: numeric('actual_distance', { precision: 5, scale: 2 }),
    actualDuration: integer('actual_duration'),
    actualType: text('actual_type'),
    injuryNotes: text('injury_notes'),
    workoutNotes: text('workout_notes'),
    coachFeedback: text('coach_feedback'),
    status: text().default('planned').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    category: text(),
    intensity: integer(),
    terrain: text(),
    elevationGain: integer('elevation_gain'),
  },
  table => [
    foreignKey({
      columns: [table.trainingPlanId],
      foreignColumns: [trainingPlans.id],
      name: 'workouts_training_plan_id_training_plans_id_fk',
    }).onDelete('cascade'),
  ]
)
