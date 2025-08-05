import { relations } from 'drizzle-orm/relations'

import {
  account,
  conversations,
  messageWorkoutLinks,
  messages,
  notifications,
  planTemplates,
  races,
  session,
  templatePhases,
  trainingPhases,
  trainingPlans,
  user,
  workouts,
} from './schema'

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  conversations_coachId: many(conversations, {
    relationName: 'conversations_coachId_user_id',
  }),
  conversations_runnerId: many(conversations, {
    relationName: 'conversations_runnerId_user_id',
  }),
  messages_recipientId: many(messages, {
    relationName: 'messages_recipientId_user_id',
  }),
  messages_senderId: many(messages, {
    relationName: 'messages_senderId_user_id',
  }),
  races: many(races),
  planTemplates: many(planTemplates),
  trainingPlans_coachId: many(trainingPlans, {
    relationName: 'trainingPlans_coachId_user_id',
  }),
  trainingPlans_runnerId: many(trainingPlans, {
    relationName: 'trainingPlans_runnerId_user_id',
  }),
  notifications: many(notifications),
  accounts: many(account),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user_coachId: one(user, {
    fields: [conversations.coachId],
    references: [user.id],
    relationName: 'conversations_coachId_user_id',
  }),
  user_runnerId: one(user, {
    fields: [conversations.runnerId],
    references: [user.id],
    relationName: 'conversations_runnerId_user_id',
  }),
  trainingPlan: one(trainingPlans, {
    fields: [conversations.trainingPlanId],
    references: [trainingPlans.id],
  }),
  messages: many(messages),
}))

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  conversations: many(conversations),
  user_coachId: one(user, {
    fields: [trainingPlans.coachId],
    references: [user.id],
    relationName: 'trainingPlans_coachId_user_id',
  }),
  user_runnerId: one(user, {
    fields: [trainingPlans.runnerId],
    references: [user.id],
    relationName: 'trainingPlans_runnerId_user_id',
  }),
  workouts: many(workouts),
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  user_recipientId: one(user, {
    fields: [messages.recipientId],
    references: [user.id],
    relationName: 'messages_recipientId_user_id',
  }),
  user_senderId: one(user, {
    fields: [messages.senderId],
    references: [user.id],
    relationName: 'messages_senderId_user_id',
  }),
  workout: one(workouts, {
    fields: [messages.workoutId],
    references: [workouts.id],
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
  user: one(user, {
    fields: [races.createdBy],
    references: [user.id],
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
  user: one(user, {
    fields: [planTemplates.createdBy],
    references: [user.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
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
