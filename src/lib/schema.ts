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

// ===================================
// BETTER AUTH TABLES (Primary Auth System)
// ===================================

// Better Auth user table - this is the primary user table
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
  role: text('role').default('runner').notNull(),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  fullName: text('full_name'),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by'),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
})

// ===================================
// ULTRACOACH BUSINESS LOGIC TABLES
// ===================================

// Training Plans
export const training_plans = pgTable('training_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  // Reference Better Auth user table
  coach_id: text('coach_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  runner_id: text('runner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  target_race_date: timestamp('target_race_date'),
  target_race_distance: text('target_race_distance'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Workouts
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
  status: text('status').default('planned').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Conversations
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  coach_id: text('coach_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  runner_id: text('runner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  training_plan_id: uuid('training_plan_id').references(() => training_plans.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 255 }),
  last_message_at: timestamp('last_message_at', { withTimezone: true }).defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sender_id: text('sender_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  recipient_id: text('recipient_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  read: boolean('read').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  workout_id: uuid('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
  context_type: varchar('context_type', { length: 50 }).default('general'),
  conversation_id: uuid('conversation_id').references(() => conversations.id, {
    onDelete: 'set null',
  }),
})

// Message Workout Links
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

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Training Phases
export const training_phases = pgTable('training_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  focus_areas: text('focus_areas').array(),
  typical_duration_weeks: integer('typical_duration_weeks'),
  phase_order: integer('phase_order'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Plan Templates
export const plan_templates = pgTable('plan_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  distance_type: text('distance_type').notNull(),
  duration_weeks: integer('duration_weeks').notNull(),
  difficulty_level: text('difficulty_level').default('intermediate'),
  peak_weekly_miles: decimal('peak_weekly_miles', { precision: 5, scale: 2 }),
  min_base_miles: decimal('min_base_miles', { precision: 5, scale: 2 }),
  created_by: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  is_public: boolean('is_public').default(false),
  tags: text('tags').array(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Template Phases
export const template_phases = pgTable('template_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  template_id: uuid('template_id')
    .notNull()
    .references(() => plan_templates.id, { onDelete: 'cascade' }),
  phase_id: uuid('phase_id')
    .notNull()
    .references(() => training_phases.id, { onDelete: 'cascade' }),
  phase_order: integer('phase_order').notNull(),
  duration_weeks: integer('duration_weeks').notNull(),
  target_weekly_miles: decimal('target_weekly_miles', { precision: 5, scale: 2 }),
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Races
export const races = pgTable('races', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  date: timestamp('date', { withTimezone: true }),
  distance_miles: decimal('distance_miles', { precision: 6, scale: 2 }).notNull(),
  distance_type: text('distance_type').notNull(),
  location: text('location').notNull(),
  elevation_gain_feet: integer('elevation_gain_feet').default(0),
  terrain_type: text('terrain_type').default('trail'),
  website_url: text('website_url'),
  notes: text('notes'),
  created_by: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ===================================
// LEGACY ALIASES (For Better Auth compatibility)
// ===================================

// Better Auth expects these exact table names
export const better_auth_users = user
export const better_auth_accounts = account
export const better_auth_sessions = session
export const better_auth_verification_tokens = verification