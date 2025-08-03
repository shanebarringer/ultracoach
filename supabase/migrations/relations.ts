import { relations } from "drizzle-orm/relations";
import { betterAuthUsers, betterAuthAccounts, betterAuthSessions, conversations, trainingPlans, messages, workouts, notifications, races, planTemplates, messageWorkoutLinks, trainingPhases, templatePhases } from "./schema";

export const betterAuthAccountsRelations = relations(betterAuthAccounts, ({one}) => ({
	betterAuthUser: one(betterAuthUsers, {
		fields: [betterAuthAccounts.userId],
		references: [betterAuthUsers.id]
	}),
}));

export const betterAuthUsersRelations = relations(betterAuthUsers, ({many}) => ({
	betterAuthAccounts: many(betterAuthAccounts),
	betterAuthSessions: many(betterAuthSessions),
	conversations_coachId: many(conversations, {
		relationName: "conversations_coachId_betterAuthUsers_id"
	}),
	conversations_runnerId: many(conversations, {
		relationName: "conversations_runnerId_betterAuthUsers_id"
	}),
	messages_recipientId: many(messages, {
		relationName: "messages_recipientId_betterAuthUsers_id"
	}),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_betterAuthUsers_id"
	}),
	trainingPlans_coachId: many(trainingPlans, {
		relationName: "trainingPlans_coachId_betterAuthUsers_id"
	}),
	trainingPlans_runnerId: many(trainingPlans, {
		relationName: "trainingPlans_runnerId_betterAuthUsers_id"
	}),
	notifications: many(notifications),
	races: many(races),
	planTemplates: many(planTemplates),
}));

export const betterAuthSessionsRelations = relations(betterAuthSessions, ({one}) => ({
	betterAuthUser: one(betterAuthUsers, {
		fields: [betterAuthSessions.userId],
		references: [betterAuthUsers.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	betterAuthUser_coachId: one(betterAuthUsers, {
		fields: [conversations.coachId],
		references: [betterAuthUsers.id],
		relationName: "conversations_coachId_betterAuthUsers_id"
	}),
	betterAuthUser_runnerId: one(betterAuthUsers, {
		fields: [conversations.runnerId],
		references: [betterAuthUsers.id],
		relationName: "conversations_runnerId_betterAuthUsers_id"
	}),
	trainingPlan: one(trainingPlans, {
		fields: [conversations.trainingPlanId],
		references: [trainingPlans.id]
	}),
	messages: many(messages),
}));

export const trainingPlansRelations = relations(trainingPlans, ({one, many}) => ({
	conversations: many(conversations),
	betterAuthUser_coachId: one(betterAuthUsers, {
		fields: [trainingPlans.coachId],
		references: [betterAuthUsers.id],
		relationName: "trainingPlans_coachId_betterAuthUsers_id"
	}),
	betterAuthUser_runnerId: one(betterAuthUsers, {
		fields: [trainingPlans.runnerId],
		references: [betterAuthUsers.id],
		relationName: "trainingPlans_runnerId_betterAuthUsers_id"
	}),
	workouts: many(workouts),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	betterAuthUser_recipientId: one(betterAuthUsers, {
		fields: [messages.recipientId],
		references: [betterAuthUsers.id],
		relationName: "messages_recipientId_betterAuthUsers_id"
	}),
	betterAuthUser_senderId: one(betterAuthUsers, {
		fields: [messages.senderId],
		references: [betterAuthUsers.id],
		relationName: "messages_senderId_betterAuthUsers_id"
	}),
	workout: one(workouts, {
		fields: [messages.workoutId],
		references: [workouts.id]
	}),
	messageWorkoutLinks: many(messageWorkoutLinks),
}));

export const workoutsRelations = relations(workouts, ({one, many}) => ({
	messages: many(messages),
	trainingPlan: one(trainingPlans, {
		fields: [workouts.trainingPlanId],
		references: [trainingPlans.id]
	}),
	messageWorkoutLinks: many(messageWorkoutLinks),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	betterAuthUser: one(betterAuthUsers, {
		fields: [notifications.userId],
		references: [betterAuthUsers.id]
	}),
}));

export const racesRelations = relations(races, ({one}) => ({
	betterAuthUser: one(betterAuthUsers, {
		fields: [races.createdBy],
		references: [betterAuthUsers.id]
	}),
}));

export const planTemplatesRelations = relations(planTemplates, ({one, many}) => ({
	betterAuthUser: one(betterAuthUsers, {
		fields: [planTemplates.createdBy],
		references: [betterAuthUsers.id]
	}),
	templatePhases: many(templatePhases),
}));

export const messageWorkoutLinksRelations = relations(messageWorkoutLinks, ({one}) => ({
	message: one(messages, {
		fields: [messageWorkoutLinks.messageId],
		references: [messages.id]
	}),
	workout: one(workouts, {
		fields: [messageWorkoutLinks.workoutId],
		references: [workouts.id]
	}),
}));

export const templatePhasesRelations = relations(templatePhases, ({one}) => ({
	trainingPhase: one(trainingPhases, {
		fields: [templatePhases.phaseId],
		references: [trainingPhases.id]
	}),
	planTemplate: one(planTemplates, {
		fields: [templatePhases.templateId],
		references: [planTemplates.id]
	}),
}));

export const trainingPhasesRelations = relations(trainingPhases, ({many}) => ({
	templatePhases: many(templatePhases),
}));