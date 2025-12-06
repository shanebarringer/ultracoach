import {
  boolean,
  decimal,
  foreignKey,
  integer,
  json,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import type { NotificationData } from '@/types/notifications'

// ===================================
// BETTER AUTH TABLES (Primary Auth System)
// ===================================

// Better Auth user table - this is the primary user table
export const user = pgTable(
  'better_auth_users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
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
    role: text('role').default('user').notNull(),
    userType: text('user_type').default('runner').notNull(),
    banned: boolean('banned'),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
    fullName: text('full_name'),
    notification_preferences: json('notification_preferences').$defaultFn(() => ({
      messages: true,
      workouts: true,
      training_plans: true,
      races: true,
      reminders: true,
      toast_notifications: true,
      email_notifications: false,
    })),
  },
  table => [unique('user_email_unique').on(table.email)]
)

export const session = pgTable(
  'better_auth_sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull(),
    impersonatedBy: text('impersonated_by'),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'session_user_id_user_id_fk',
    }).onDelete('cascade'),
    unique('session_token_unique').on(table.token),
  ]
)

export const account = pgTable('better_auth_accounts', {
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

export const verification = pgTable('better_auth_verification_tokens', {
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
  training_plan_id: uuid('training_plan_id').references(() => training_plans.id, {
    onDelete: 'cascade',
  }),
  user_id: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
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
  // Enhanced workout fields
  category: text('category'), // 'easy', 'tempo', 'interval', 'long_run', etc.
  intensity: integer('intensity'), // 1-10 scale
  terrain: text('terrain'), // 'road', 'trail', 'track', 'treadmill'
  elevation_gain: integer('elevation_gain'), // feet
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

// Typing Status
export const typing_status = pgTable(
  'typing_status',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    recipient_id: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    is_typing: boolean('is_typing').default(false).notNull(),
    last_updated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
  },
  t => ({
    userRecipientUnique: unique().on(t.user_id, t.recipient_id),
  })
)

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
  data: json('data').$type<NotificationData>(),
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

// Coach-Runner Relationships
export const coach_runners = pgTable(
  'coach_runners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coach_id: text('coach_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    runner_id: text('runner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'active', 'inactive'] })
      .default('pending')
      .notNull(),
    relationship_type: text('relationship_type', { enum: ['standard', 'invited'] })
      .default('standard')
      .notNull(),
    invited_by: text('invited_by', { enum: ['coach', 'runner'] }),
    relationship_started_at: timestamp('relationship_started_at', {
      withTimezone: true,
    }).defaultNow(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  table => ({
    unique_coach_runner: unique().on(table.coach_id, table.runner_id),
  })
)

// ===================================
// COACH CONNECTIONS (Coach-to-Coach Relationships)
// ===================================

// Coach Connections - for coach-to-coach professional relationships
export const coach_connections = pgTable(
  'coach_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // First coach in the connection (the inviter)
    coach_a_id: text('coach_a_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Second coach in the connection (the invited coach)
    coach_b_id: text('coach_b_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Connection status
    status: text('status', { enum: ['pending', 'active', 'inactive'] })
      .default('active')
      .notNull(),
    // When the connection was established
    connection_started_at: timestamp('connection_started_at', { withTimezone: true }).defaultNow(),
    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  table => ({
    // Note: Bidirectional uniqueness enforced at DB level via:
    // idx_coach_connections_bidirectional_unique using LEAST/GREATEST
    // This additional constraint helps Drizzle tooling
    unique_coach_connection: unique().on(table.coach_a_id, table.coach_b_id),
  })
)

// ===================================
// COACH INVITATIONS
// ===================================

// Coach Invitations - for inviting new users to join UltraCoach via email
export const coach_invitations = pgTable(
  'coach_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Who sent the invitation
    inviter_user_id: text('inviter_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Email address being invited
    invitee_email: text('invitee_email').notNull(),
    // Optional: Name of the person being invited (for email personalization and signup pre-fill)
    invitee_name: text('invitee_name'),
    // What role they're invited as
    invited_role: text('invited_role', { enum: ['runner', 'coach'] })
      .default('runner')
      .notNull(),
    // Optional personal message from coach
    personal_message: text('personal_message'),
    // SHA-256 hash of token (for secure validation)
    // SECURITY: Raw token is NOT stored - only the hash for validation
    token_hash: text('token_hash').notNull(),
    // Invitation status
    status: text('status', { enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'] })
      .default('pending')
      .notNull(),
    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    accepted_at: timestamp('accepted_at', { withTimezone: true }),
    declined_at: timestamp('declined_at', { withTimezone: true }),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
    // When accepted, link to the user who accepted
    invitee_user_id: text('invitee_user_id').references(() => user.id, { onDelete: 'set null' }),
    // When accepted, link to the created relationship (coach_runners or coach_connections)
    coach_runner_relationship_id: uuid('coach_runner_relationship_id').references(
      () => coach_runners.id,
      { onDelete: 'set null' }
    ),
    // For coach-to-coach invitations, link to coach_connections
    coach_connection_id: uuid('coach_connection_id').references(() => coach_connections.id, {
      onDelete: 'set null',
    }),
    // Resend tracking
    resend_count: integer('resend_count').default(0).notNull(),
    last_resent_at: timestamp('last_resent_at', { withTimezone: true }),
    // Optional decline reason
    decline_reason: text('decline_reason'),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  }
  // Note: Unique constraint on (inviter_user_id, invitee_email) is handled via
  // partial unique index in the database (WHERE status = 'pending') to allow
  // re-invitations after decline/expiry/revoke
)

// User Onboarding
export const user_onboarding = pgTable('user_onboarding', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(),
  role: text('role', { enum: ['runner', 'coach'] }).notNull(),
  current_step: integer('current_step').default(1).notNull(),
  total_steps: integer('total_steps').default(5).notNull(),
  completed: boolean('completed').default(false).notNull(),
  step_data: json('step_data').$defaultFn(() => ({})), // Store answers and progress for each step
  started_at: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  skipped_at: timestamp('skipped_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Product tour tracking (NextStep.js integration)
  coach_tour_completed: boolean('coach_tour_completed').default(false).notNull(),
  runner_tour_completed: boolean('runner_tour_completed').default(false).notNull(),
  last_tour_started_at: timestamp('last_tour_started_at', { withTimezone: true }),
  last_tour_completed_at: timestamp('last_tour_completed_at', { withTimezone: true }),
})

// Onboarding Steps Template
export const onboarding_steps = pgTable('onboarding_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  step_number: integer('step_number').notNull(),
  role: text('role', { enum: ['runner', 'coach', 'both'] }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  step_type: text('step_type', {
    enum: ['welcome', 'profile', 'preferences', 'goals', 'connections', 'completion'],
  }).notNull(),
  fields: json('fields').$defaultFn(() => []), // Form fields configuration
  is_required: boolean('is_required').default(true).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// User Feedback
export const user_feedback = pgTable('user_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  feedback_type: text('feedback_type', {
    enum: ['bug_report', 'feature_request', 'general_feedback', 'complaint', 'compliment'],
  }).notNull(),
  category: text('category'), // 'ui_ux', 'performance', 'functionality', 'content', 'other'
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium'),
  status: text('status', { enum: ['open', 'in_progress', 'resolved', 'closed'] }).default('open'),
  user_email: text('user_email'), // In case user wants follow-up
  browser_info: json('browser_info'), // User agent, screen size, etc.
  page_url: text('page_url'), // Where the feedback was submitted from
  screenshots: text('screenshots').array(), // URLs to uploaded screenshots
  admin_notes: text('admin_notes'), // Internal notes for admins
  resolved_by: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// User Settings - Comprehensive user preferences and account settings
export const user_settings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(),

  // Notification Preferences
  notification_preferences: json('notification_preferences').$defaultFn(() => ({
    // In-app notifications
    messages: true,
    workouts: true,
    training_plans: true,
    races: true,
    reminders: true,
    system_updates: true,

    // Email notifications
    email_enabled: false,
    email_frequency: 'daily', // 'immediate', 'daily', 'weekly', 'never'
    email_messages: false,
    email_workouts: false,
    email_training_plans: false,
    email_races: false,
    email_reminders: false,
    email_weekly_summary: false,

    // Push notifications (for future mobile app)
    push_enabled: false,
    push_messages: false,
    push_workouts: false,
    push_reminders: false,
  })),

  // Display Preferences
  display_preferences: json('display_preferences').$defaultFn(() => ({
    theme: 'system', // 'light', 'dark', 'system'
    density: 'comfortable', // 'compact', 'comfortable', 'spacious'
    sidebar_collapsed: false,
    show_tips: true,
    animations_enabled: true,
    reduced_motion: false,
  })),

  // Unit Preferences
  unit_preferences: json('unit_preferences').$defaultFn(() => ({
    distance: 'miles', // 'miles', 'kilometers'
    elevation: 'feet', // 'feet', 'meters'
    temperature: 'fahrenheit', // 'fahrenheit', 'celsius'
    pace_format: 'min_per_mile', // 'min_per_mile', 'min_per_km', 'mph', 'kmh'
    time_format: '12h', // '12h', '24h'
    date_format: 'MM/dd/yyyy', // 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'
  })),

  // Privacy Settings
  privacy_settings: json('privacy_settings').$defaultFn(() => ({
    profile_visibility: 'coaches_only', // 'public', 'coaches_only', 'private'
    show_activity_stats: true,
    show_training_calendar: true,
    allow_coach_invitations: true,
    allow_runner_connections: true,
    show_location: true,
    show_age: true,
    data_sharing_analytics: true,
  })),

  // Communication Settings
  communication_settings: json('communication_settings').$defaultFn(() => ({
    auto_responses_enabled: false,
    auto_response_message: '',
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    weekend_quiet_mode: false,
    message_sound_enabled: true,
    typing_indicators_enabled: true,
  })),

  // Workout & Training Preferences
  training_preferences: json('training_preferences').$defaultFn(() => ({
    default_workout_view: 'calendar', // 'calendar', 'list', 'timeline'
    show_completed_workouts: true,
    auto_sync_devices: false,
    preferred_training_times: [],
    rest_day_preferences: ['sunday'],
    workout_reminder_time: 60, // minutes before workout
    show_weather_info: true,
    track_heart_rate: true,
    track_cadence: false,
    track_power: false,
  })),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ===================================
// BETTER AUTH TABLE ALIASES
// ===================================

// Aliases for Better Auth tables (now using correct table names directly)
export const better_auth_users = user
export const better_auth_accounts = account
export const better_auth_sessions = session
export const better_auth_verification_tokens = verification

// ===================================
// STRAVA INTEGRATION TABLES
// ===================================

// Strava connections - links UltraCoach users to Strava accounts
export const strava_connections = pgTable(
  'strava_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: text('user_id').notNull(),
    strava_athlete_id: integer('strava_athlete_id').notNull(),
    access_token: text('access_token').notNull(),
    refresh_token: text('refresh_token').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    scope: json('scope').$type<string[]>().notNull(),
    athlete_data: json('athlete_data').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userRef: foreignKey({
      columns: [table.user_id],
      foreignColumns: [user.id],
      name: 'strava_connections_user_id_fkey',
    }),
    stravaAthleteUnique: unique('strava_connections_athlete_id_unique').on(table.strava_athlete_id),
    userStravaUnique: unique('strava_connections_user_strava_unique').on(
      table.user_id,
      table.strava_athlete_id
    ),
  })
)

// Strava activity sync - tracks synced activities between Strava and UltraCoach
export const strava_activity_syncs = pgTable(
  'strava_activity_syncs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    connection_id: uuid('connection_id').notNull(),
    strava_activity_id: text('strava_activity_id').notNull(),
    ultracoach_workout_id: uuid('ultracoach_workout_id'),
    activity_data: json('activity_data').notNull(),
    sync_type: text('sync_type', {
      enum: ['manual', 'automatic', 'webhook'],
    })
      .default('manual')
      .notNull(),
    sync_status: text('sync_status', {
      enum: ['pending', 'synced', 'failed', 'ignored'],
    })
      .default('pending')
      .notNull(),
    match_confidence: real('match_confidence'),
    sync_error: text('sync_error'),
    synced_at: timestamp('synced_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    connectionRef: foreignKey({
      columns: [table.connection_id],
      foreignColumns: [strava_connections.id],
      name: 'strava_activity_syncs_connection_id_fkey',
    }),
    workoutRef: foreignKey({
      columns: [table.ultracoach_workout_id],
      foreignColumns: [workouts.id],
      name: 'strava_activity_syncs_workout_id_fkey',
    }),
    stravaActivityUnique: unique('strava_activity_syncs_strava_activity_unique').on(
      table.strava_activity_id
    ),
  })
)

// Strava webhooks - for real-time activity updates
export const strava_webhooks = pgTable('strava_webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscription_id: integer('subscription_id').notNull(),
  callback_url: text('callback_url').notNull(),
  verify_token: text('verify_token').notNull(),
  active: boolean('active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Strava webhook events - log of received webhook events
export const strava_webhook_events = pgTable(
  'strava_webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    webhook_id: uuid('webhook_id').notNull(),
    object_type: text('object_type', { enum: ['activity', 'athlete'] }).notNull(),
    object_id: integer('object_id').notNull(),
    aspect_type: text('aspect_type', { enum: ['create', 'update', 'delete'] }).notNull(),
    updates: json('updates'),
    owner_id: integer('owner_id').notNull(),
    event_time: timestamp('event_time', { withTimezone: true }).notNull(),
    processed: boolean('processed').default(false).notNull(),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    webhookRef: foreignKey({
      columns: [table.webhook_id],
      foreignColumns: [strava_webhooks.id],
      name: 'strava_webhook_events_webhook_id_fkey',
    }),
  })
)
