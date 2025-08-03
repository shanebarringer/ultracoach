import { sql } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const betterAuthUsers = pgTable(
  'better_auth_users',
  {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    emailVerified: boolean('email_verified').default(false),
    name: text(),
    image: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    role: text().default('runner'),
    fullName: text('full_name'),
  },
  table => [
    unique('better_auth_users_email_key').on(table.email),
    pgPolicy('Users can manage their own data', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`(id = current_setting('app.current_user_id'::text, true))`,
    }),
  ]
)

export const betterAuthVerificationTokens = pgTable('better_auth_verification_tokens', {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  token: text().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

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
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    password: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'better_auth_accounts_user_id_fkey',
    }).onDelete('cascade'),
  ]
)

export const betterAuthSessions = pgTable(
  'better_auth_sessions',
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    token: text().notNull(),
    userId: text('user_id').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  table => [
    index('idx_better_auth_sessions_expires_at').using(
      'btree',
      table.expiresAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_better_auth_sessions_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'better_auth_sessions_user_id_fkey',
    }).onDelete('cascade'),
    unique('better_auth_sessions_token_key').on(table.token),
  ]
)

export const trainingPhases = pgTable(
  'training_phases',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    focusAreas: text('focus_areas').array(),
    typicalDurationWeeks: integer('typical_duration_weeks'),
    phaseOrder: integer('phase_order'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    index('idx_training_phases_phase_order').using(
      'btree',
      table.phaseOrder.asc().nullsLast().op('int4_ops')
    ),
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
    index('idx_conversations_coach_id').using(
      'btree',
      table.coachId.asc().nullsLast().op('text_ops')
    ),
    index('idx_conversations_runner_id').using(
      'btree',
      table.runnerId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.coachId],
      foreignColumns: [betterAuthUsers.id],
      name: 'conversations_coach_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.runnerId],
      foreignColumns: [betterAuthUsers.id],
      name: 'conversations_runner_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.trainingPlanId],
      foreignColumns: [trainingPlans.id],
      name: 'conversations_training_plan_id_fkey',
    }).onDelete('set null'),
    pgPolicy('Users can manage their conversations', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`((coach_id = current_setting('app.current_user_id'::text, true)) OR (runner_id = current_setting('app.current_user_id'::text, true)))`,
    }),
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
    index('idx_messages_conversation_id').using(
      'btree',
      table.conversationId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_messages_recipient_id').using(
      'btree',
      table.recipientId.asc().nullsLast().op('text_ops')
    ),
    index('idx_messages_sender_id').using('btree', table.senderId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: 'messages_conversation_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.recipientId],
      foreignColumns: [betterAuthUsers.id],
      name: 'messages_recipient_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [betterAuthUsers.id],
      name: 'messages_sender_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workouts.id],
      name: 'messages_workout_id_fkey',
    }).onDelete('set null'),
    pgPolicy('Users can manage their messages', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`((sender_id = current_setting('app.current_user_id'::text, true)) OR (recipient_id = current_setting('app.current_user_id'::text, true)))`,
    }),
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
    targetRaceDate: timestamp('target_race_date', { withTimezone: true, mode: 'string' }),
    targetRaceDistance: text('target_race_distance'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  table => [
    index('idx_training_plans_coach_id').using(
      'btree',
      table.coachId.asc().nullsLast().op('text_ops')
    ),
    index('idx_training_plans_runner_id').using(
      'btree',
      table.runnerId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.coachId],
      foreignColumns: [betterAuthUsers.id],
      name: 'training_plans_coach_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.runnerId],
      foreignColumns: [betterAuthUsers.id],
      name: 'training_plans_runner_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('Coaches can manage their training plans', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`(coach_id = current_setting('app.current_user_id'::text, true))`,
    }),
    pgPolicy('Runners can view their training plans', {
      as: 'permissive',
      for: 'select',
      to: ['public'],
    }),
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
    index('idx_notifications_read').using('btree', table.read.asc().nullsLast().op('bool_ops')),
    index('idx_notifications_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [betterAuthUsers.id],
      name: 'notifications_user_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('Users can manage their notifications', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`(user_id = current_setting('app.current_user_id'::text, true))`,
    }),
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
    index('idx_races_date').using('btree', table.date.asc().nullsLast().op('timestamptz_ops')),
    index('idx_races_distance_type').using(
      'btree',
      table.distanceType.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [betterAuthUsers.id],
      name: 'races_created_by_fkey',
    }).onDelete('set null'),
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
    index('idx_plan_templates_difficulty_level').using(
      'btree',
      table.difficultyLevel.asc().nullsLast().op('text_ops')
    ),
    index('idx_plan_templates_distance_type').using(
      'btree',
      table.distanceType.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [betterAuthUsers.id],
      name: 'plan_templates_created_by_fkey',
    }).onDelete('set null'),
  ]
)

export const workouts = pgTable(
  'workouts',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    trainingPlanId: uuid('training_plan_id').notNull(),
    date: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
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
  },
  table => [
    index('idx_workouts_date').using('btree', table.date.asc().nullsLast().op('timestamptz_ops')),
    index('idx_workouts_training_plan_id').using(
      'btree',
      table.trainingPlanId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.trainingPlanId],
      foreignColumns: [trainingPlans.id],
      name: 'workouts_training_plan_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('Users can manage workouts through training plans', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`(training_plan_id IN ( SELECT training_plans.id
   FROM training_plans
  WHERE ((training_plans.coach_id = current_setting('app.current_user_id'::text, true)) OR (training_plans.runner_id = current_setting('app.current_user_id'::text, true)))))`,
    }),
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
      name: 'message_workout_links_message_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workouts.id],
      name: 'message_workout_links_workout_id_fkey',
    }).onDelete('cascade'),
  ]
)

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
    index('idx_template_phases_phase_id').using(
      'btree',
      table.phaseId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_template_phases_template_id').using(
      'btree',
      table.templateId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.phaseId],
      foreignColumns: [trainingPhases.id],
      name: 'template_phases_phase_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [planTemplates.id],
      name: 'template_phases_template_id_fkey',
    }).onDelete('cascade'),
  ]
)
