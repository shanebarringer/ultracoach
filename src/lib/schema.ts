import {
  boolean,
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// Better Auth users table becomes the primary user table
export const better_auth_users = pgTable('better_auth_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  role: text('role').default('runner').$type<'runner' | 'coach'>(),
  fullName: text('full_name'),
})

export const training_plans = pgTable('training_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  // Updated to reference better_auth_users instead of users
  coach_id: text('coach_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  runner_id: text('runner_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  target_race_date: timestamp('target_race_date'),
  target_race_distance: text('target_race_distance'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  training_plan_id: uuid('training_plan_id')
    .notNull()
    .references(() => training_plans.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  planned_distance: decimal('planned_distance', { precision: 5, scale: 2 }),
  planned_duration: integer('planned_duration'),
  planned_type: text('planned_type'),
  actual_distance: decimal('actual_distance', { precision: 5, scale: 2 }),
  actual_duration: integer('actual_duration'),
  actual_type: text('actual_type'),
  injury_notes: text('injury_notes'),
  workout_notes: text('workout_notes'),
  coach_feedback: text('coach_feedback'),
  status: text('status').notNull().default('planned').$type<'planned' | 'completed' | 'skipped'>(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Updated to reference better_auth_users instead of users
  sender_id: text('sender_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  recipient_id: text('recipient_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  read: boolean('read').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  workout_id: uuid('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
  context_type: varchar('context_type', { length: 50 }).default('general'),
  conversation_id: uuid('conversation_id').references(() => conversations.id, {
    onDelete: 'set null',
  }),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Updated to reference better_auth_users instead of users
  user_id: text('user_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  type: text('type').notNull().$type<'message' | 'workout' | 'comment'>(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const message_workout_links = pgTable('message_workout_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  message_id: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  workout_id: uuid('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  link_type: varchar('link_type', { length: 50 }).default('reference'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Updated to reference better_auth_users instead of users
  coach_id: text('coach_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  runner_id: text('runner_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  training_plan_id: uuid('training_plan_id').references(() => training_plans.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 255 }),
  last_message_at: timestamp('last_message_at', { withTimezone: true }).defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const better_auth_accounts = pgTable('better_auth_accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const better_auth_sessions = pgTable('better_auth_sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => better_auth_users.id, { onDelete: 'cascade' }),
})

export const better_auth_verification_tokens = pgTable('better_auth_verification_tokens', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Enhanced training system tables
export const races = pgTable('races', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  date: timestamp('date', { withTimezone: true }),
  distanceMiles: decimal('distance_miles', { precision: 6, scale: 2 }).notNull(),
  distanceType: text('distance_type').notNull(),
  location: text('location').notNull(),
  elevationGainFeet: integer('elevation_gain_feet').default(0),
  terrainType: text('terrain_type').default('trail'),
  websiteUrl: text('website_url'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => better_auth_users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const training_phases = pgTable('training_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  focusAreas: text('focus_areas').array(),
  typicalDurationWeeks: integer('typical_duration_weeks'),
  phaseOrder: integer('phase_order'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const plan_templates = pgTable('plan_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  distanceType: text('distance_type').notNull(),
  durationWeeks: integer('duration_weeks').notNull(),
  difficultyLevel: text('difficulty_level').default('intermediate'),
  peakWeeklyMiles: decimal('peak_weekly_miles', { precision: 5, scale: 2 }),
  minBaseMiles: decimal('min_base_miles', { precision: 5, scale: 2 }),
  createdBy: text('created_by').references(() => better_auth_users.id, { onDelete: 'set null' }),
  isPublic: boolean('is_public').default(false),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const template_phases = pgTable('template_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => plan_templates.id, { onDelete: 'cascade' }),
  phaseId: uuid('phase_id')
    .notNull()
    .references(() => training_phases.id, { onDelete: 'cascade' }),
  phaseOrder: integer('phase_order').notNull(),
  durationWeeks: integer('duration_weeks').notNull(),
  targetWeeklyMiles: decimal('target_weekly_miles', { precision: 5, scale: 2 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
