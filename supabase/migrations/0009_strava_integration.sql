-- Strava Integration Tables Migration
-- Created: 2025-08-29
-- Purpose: Add missing Strava integration tables for CI/CD pipeline

-- Drop tables if they exist (for idempotent migration)
DROP TABLE IF EXISTS "strava_webhook_events" CASCADE;
DROP TABLE IF EXISTS "strava_webhooks" CASCADE;  
DROP TABLE IF EXISTS "strava_activity_syncs" CASCADE;
DROP TABLE IF EXISTS "strava_connections" CASCADE;

-- Create strava_connections table
CREATE TABLE "strava_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"strava_athlete_id" integer NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"athlete_data" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strava_connections_athlete_id_unique" UNIQUE("strava_athlete_id"),
	CONSTRAINT "strava_connections_user_strava_unique" UNIQUE("user_id","strava_athlete_id")
);

-- Create strava_activity_syncs table
CREATE TABLE "strava_activity_syncs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"strava_activity_id" text NOT NULL,
	"ultracoach_workout_id" uuid,
	"activity_data" json NOT NULL,
	"sync_type" text DEFAULT 'manual' NOT NULL,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"match_confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strava_activity_syncs_strava_activity_unique" UNIQUE("strava_activity_id")
);

-- Create strava_webhooks table
CREATE TABLE "strava_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" text NOT NULL,
	"callback_url" text NOT NULL,
	"verify_token" text NOT NULL,
	"subscription_data" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strava_webhooks_webhook_id_unique" UNIQUE("webhook_id")
);

-- Create strava_webhook_events table  
CREATE TABLE "strava_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"aspect_type" text NOT NULL,
	"event_data" json NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strava_webhook_events_event_unique" UNIQUE("object_type","object_id","aspect_type","event_type")
);

-- Add foreign key constraints
ALTER TABLE "strava_connections" ADD CONSTRAINT "strava_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."better_auth_users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "strava_activity_syncs" ADD CONSTRAINT "strava_activity_syncs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."strava_connections"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "strava_activity_syncs" ADD CONSTRAINT "strava_activity_syncs_workout_id_fkey" FOREIGN KEY ("ultracoach_workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "strava_webhook_events" ADD CONSTRAINT "strava_webhook_events_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."strava_webhooks"("id") ON DELETE cascade ON UPDATE no action;