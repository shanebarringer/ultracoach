import { relations } from 'drizzle-orm/relations'

import {
  betterAuthAccounts,
  betterAuthSessions,
  betterAuthUsers,
  coachRunners,
  conversations,
  messageWorkoutLinks,
  messages,
  notifications,
  planTemplates,
  races,
  templatePhases,
  trainingPhases,
  trainingPlans,
  typingStatus,
  userFeedback,
  userOnboarding,
  userSettings,
  workouts,
} from './schema'

export const betterAuthSessionsRelations = relations(betterAuthSessions, ({ one }) => ({
  betterAuthUser: one(betterAuthUsers, {
    fields: [betterAuthSessions.userId],
    references: [betterAuthUsers.id],
  }),
}))

export const betterAuthUsersRelations = relations(betterAuthUsers, ({ many }) => ({
  betterAuthSessions: many(betterAuthSessions),
  conversations_coachId: many(conversations, {
    relationName: 'conversations_coachId_betterAuthUsers_id',
  }),
  conversations_runnerId: many(conversations, {
    relationName: 'conversations_runnerId_betterAuthUsers_id',
  }),
  trainingPlans_coachId: many(trainingPlans, {
    relationName: 'trainingPlans_coachId_betterAuthUsers_id',
  }),
  trainingPlans_runnerId: many(trainingPlans, {
    relationName: 'trainingPlans_runnerId_betterAuthUsers_id',
  }),
  messages_senderId: many(messages, {
    relationName: 'messages_senderId_betterAuthUsers_id',
  }),
  messages_recipientId: many(messages, {
    relationName: 'messages_recipientId_betterAuthUsers_id',
  }),
  races: many(races),
  planTemplates: many(planTemplates),
  notifications: many(notifications),
  betterAuthAccounts: many(betterAuthAccounts),
  coachRunners_coachId: many(coachRunners, {
    relationName: 'coachRunners_coachId_betterAuthUsers_id',
  }),
  coachRunners_runnerId: many(coachRunners, {
    relationName: 'coachRunners_runnerId_betterAuthUsers_id',
  }),
  typingStatuses_userId: many(typingStatus, {
    relationName: 'typingStatus_userId_betterAuthUsers_id',
  }),
  typingStatuses_recipientId: many(typingStatus, {
    relationName: 'typingStatus_recipientId_betterAuthUsers_id',
  }),
  userFeedbacks_userId: many(userFeedback, {
    relationName: 'userFeedback_userId_betterAuthUsers_id',
  }),
  userFeedbacks_resolvedBy: many(userFeedback, {
    relationName: 'userFeedback_resolvedBy_betterAuthUsers_id',
  }),
  userOnboardings: many(userOnboarding),
  userSettings: many(userSettings),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  trainingPlan: one(trainingPlans, {
    fields: [conversations.trainingPlanId],
    references: [trainingPlans.id],
  }),
  betterAuthUser_coachId: one(betterAuthUsers, {
    fields: [conversations.coachId],
    references: [betterAuthUsers.id],
    relationName: 'conversations_coachId_betterAuthUsers_id',
  }),
  betterAuthUser_runnerId: one(betterAuthUsers, {
    fields: [conversations.runnerId],
    references: [betterAuthUsers.id],
    relationName: 'conversations_runnerId_betterAuthUsers_id',
  }),
  messages: many(messages),
}))

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  conversations: many(conversations),
  betterAuthUser_coachId: one(betterAuthUsers, {
    fields: [trainingPlans.coachId],
    references: [betterAuthUsers.id],
    relationName: 'trainingPlans_coachId_betterAuthUsers_id',
  }),
  betterAuthUser_runnerId: one(betterAuthUsers, {
    fields: [trainingPlans.runnerId],
    references: [betterAuthUsers.id],
    relationName: 'trainingPlans_runnerId_betterAuthUsers_id',
  }),
  workouts: many(workouts),
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  workout: one(workouts, {
    fields: [messages.workoutId],
    references: [workouts.id],
  }),
  betterAuthUser_senderId: one(betterAuthUsers, {
    fields: [messages.senderId],
    references: [betterAuthUsers.id],
    relationName: 'messages_senderId_betterAuthUsers_id',
  }),
  betterAuthUser_recipientId: one(betterAuthUsers, {
    fields: [messages.recipientId],
    references: [betterAuthUsers.id],
    relationName: 'messages_recipientId_betterAuthUsers_id',
  }),
  messageWorkoutLinks: many(messageWorkoutLinks),
}))

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  messages: many(messages),
  messageWorkoutLinks: many(messageWorkoutLinks),
  trainingPlan: one(trainingPlans, {
    fields: [workouts.trainingPlanId],
    references: [trainingPlans.id],
  }),
}))

export const racesRelations = relations(races, ({ one }) => ({
  betterAuthUser: one(betterAuthUsers, {
    fields: [races.createdBy],
    references: [betterAuthUsers.id],
  }),
}))

export const templatePhasesRelations = relations(templatePhases, ({ one }) => ({
  trainingPhase: one(trainingPhases, {
    fields: [templatePhases.phaseId],
    references: [trainingPhases.id],
  }),
  planTemplate: one(planTemplates, {
    fields: [templatePhases.templateId],
    references: [planTemplates.id],
  }),
}))

export const trainingPhasesRelations = relations(trainingPhases, ({ many }) => ({
  templatePhases: many(templatePhases),
}))

export const planTemplatesRelations = relations(planTemplates, ({ one, many }) => ({
  templatePhases: many(templatePhases),
  betterAuthUser: one(betterAuthUsers, {
    fields: [planTemplates.createdBy],
    references: [betterAuthUsers.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  betterAuthUser: one(betterAuthUsers, {
    fields: [notifications.userId],
    references: [betterAuthUsers.id],
  }),
}))

export const betterAuthAccountsRelations = relations(betterAuthAccounts, ({ one }) => ({
  betterAuthUser: one(betterAuthUsers, {
    fields: [betterAuthAccounts.userId],
    references: [betterAuthUsers.id],
  }),
}))

export const messageWorkoutLinksRelations = relations(messageWorkoutLinks, ({ one }) => ({
  message: one(messages, {
    fields: [messageWorkoutLinks.messageId],
    references: [messages.id],
  }),
  workout: one(workouts, {
    fields: [messageWorkoutLinks.workoutId],
    references: [workouts.id],
  }),
}))

export const coachRunnersRelations = relations(coachRunners, ({ one }) => ({
  betterAuthUser_coachId: one(betterAuthUsers, {
    fields: [coachRunners.coachId],
    references: [betterAuthUsers.id],
    relationName: 'coachRunners_coachId_betterAuthUsers_id',
  }),
  betterAuthUser_runnerId: one(betterAuthUsers, {
    fields: [coachRunners.runnerId],
    references: [betterAuthUsers.id],
    relationName: 'coachRunners_runnerId_betterAuthUsers_id',
  }),
}))

export const typingStatusRelations = relations(typingStatus, ({ one }) => ({
  betterAuthUser_userId: one(betterAuthUsers, {
    fields: [typingStatus.userId],
    references: [betterAuthUsers.id],
    relationName: 'typingStatus_userId_betterAuthUsers_id',
  }),
  betterAuthUser_recipientId: one(betterAuthUsers, {
    fields: [typingStatus.recipientId],
    references: [betterAuthUsers.id],
    relationName: 'typingStatus_recipientId_betterAuthUsers_id',
  }),
}))

export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  betterAuthUser_userId: one(betterAuthUsers, {
    fields: [userFeedback.userId],
    references: [betterAuthUsers.id],
    relationName: 'userFeedback_userId_betterAuthUsers_id',
  }),
  betterAuthUser_resolvedBy: one(betterAuthUsers, {
    fields: [userFeedback.resolvedBy],
    references: [betterAuthUsers.id],
    relationName: 'userFeedback_resolvedBy_betterAuthUsers_id',
  }),
}))

export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
  betterAuthUser: one(betterAuthUsers, {
    fields: [userOnboarding.userId],
    references: [betterAuthUsers.id],
  }),
}))

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  betterAuthUser: one(betterAuthUsers, {
    fields: [userSettings.userId],
    references: [betterAuthUsers.id],
  }),
}))
