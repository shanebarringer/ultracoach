-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "better_auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"role" text DEFAULT 'runner',
	"full_name" text,
	CONSTRAINT "better_auth_users_email_key" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "better_auth_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "better_auth_verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "better_auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expires_at" timestamp with time zone,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "better_auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "better_auth_sessions_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "training_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"focus_areas" text[],
	"typical_duration_weeks" integer,
	"phase_order" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" text NOT NULL,
	"runner_id" text NOT NULL,
	"training_plan_id" uuid,
	"title" varchar(255),
	"last_message_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"content" text NOT NULL,
	"read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"workout_id" uuid,
	"context_type" varchar(50) DEFAULT 'general',
	"conversation_id" uuid
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"coach_id" text NOT NULL,
	"runner_id" text NOT NULL,
	"target_race_date" timestamp with time zone,
	"target_race_distance" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "training_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "races" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" timestamp with time zone,
	"distance_miles" numeric(6, 2) NOT NULL,
	"distance_type" text NOT NULL,
	"location" text NOT NULL,
	"elevation_gain_feet" integer DEFAULT 0,
	"terrain_type" text DEFAULT 'trail',
	"website_url" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plan_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"distance_type" text NOT NULL,
	"duration_weeks" integer NOT NULL,
	"difficulty_level" text DEFAULT 'intermediate',
	"peak_weekly_miles" numeric(5, 2),
	"min_base_miles" numeric(5, 2),
	"created_by" text,
	"is_public" boolean DEFAULT false,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_plan_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"planned_distance" numeric(5, 2),
	"planned_duration" integer,
	"planned_type" text,
	"actual_distance" numeric(5, 2),
	"actual_duration" integer,
	"actual_type" text,
	"injury_notes" text,
	"workout_notes" text,
	"coach_feedback" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "workouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_workout_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"workout_id" uuid NOT NULL,
	"link_type" varchar(50) DEFAULT 'reference',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"phase_order" integer NOT NULL,
	"duration_weeks" integer NOT NULL,
	"target_weekly_miles" numeric(5, 2),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "better_auth_accounts" ADD CONSTRAINT "better_auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth_sessions" ADD CONSTRAINT "better_auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."better_auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_templates" ADD CONSTRAINT "plan_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."better_auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_workout_links" ADD CONSTRAINT "message_workout_links_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_workout_links" ADD CONSTRAINT "message_workout_links_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_phases" ADD CONSTRAINT "template_phases_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."training_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_phases" ADD CONSTRAINT "template_phases_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."plan_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_better_auth_sessions_expires_at" ON "better_auth_sessions" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_better_auth_sessions_user_id" ON "better_auth_sessions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_training_phases_phase_order" ON "training_phases" USING btree ("phase_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_conversations_coach_id" ON "conversations" USING btree ("coach_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_conversations_runner_id" ON "conversations" USING btree ("runner_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_id" ON "messages" USING btree ("conversation_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_id" ON "messages" USING btree ("recipient_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_messages_sender_id" ON "messages" USING btree ("sender_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_training_plans_coach_id" ON "training_plans" USING btree ("coach_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_training_plans_runner_id" ON "training_plans" USING btree ("runner_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("read" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_races_date" ON "races" USING btree ("date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_races_distance_type" ON "races" USING btree ("distance_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_plan_templates_difficulty_level" ON "plan_templates" USING btree ("difficulty_level" text_ops);--> statement-breakpoint
CREATE INDEX "idx_plan_templates_distance_type" ON "plan_templates" USING btree ("distance_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_workouts_date" ON "workouts" USING btree ("date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_workouts_training_plan_id" ON "workouts" USING btree ("training_plan_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_template_phases_phase_id" ON "template_phases" USING btree ("phase_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_template_phases_template_id" ON "template_phases" USING btree ("template_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "Users can manage their own data" ON "better_auth_users" AS PERMISSIVE FOR ALL TO public USING ((id = current_setting('app.current_user_id'::text, true)));--> statement-breakpoint
CREATE POLICY "Users can manage their conversations" ON "conversations" AS PERMISSIVE FOR ALL TO public USING (((coach_id = current_setting('app.current_user_id'::text, true)) OR (runner_id = current_setting('app.current_user_id'::text, true))));--> statement-breakpoint
CREATE POLICY "Users can manage their messages" ON "messages" AS PERMISSIVE FOR ALL TO public USING (((sender_id = current_setting('app.current_user_id'::text, true)) OR (recipient_id = current_setting('app.current_user_id'::text, true))));--> statement-breakpoint
CREATE POLICY "Coaches can manage their training plans" ON "training_plans" AS PERMISSIVE FOR ALL TO public USING ((coach_id = current_setting('app.current_user_id'::text, true)));--> statement-breakpoint
CREATE POLICY "Runners can view their training plans" ON "training_plans" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can manage their notifications" ON "notifications" AS PERMISSIVE FOR ALL TO public USING ((user_id = current_setting('app.current_user_id'::text, true)));--> statement-breakpoint
CREATE POLICY "Users can manage workouts through training plans" ON "workouts" AS PERMISSIVE FOR ALL TO public USING ((training_plan_id IN ( SELECT training_plans.id
   FROM training_plans
  WHERE ((training_plans.coach_id = current_setting('app.current_user_id'::text, true)) OR (training_plans.runner_id = current_setting('app.current_user_id'::text, true))))));
*/