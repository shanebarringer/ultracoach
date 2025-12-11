-- Create Profile System Tables
-- This migration adds comprehensive profile tables for coaches and runners
--
-- Tables created:
-- - user_profiles: Extended profile information for all users
-- - social_profiles: Social media connections
-- - certifications: Coaching certifications and credentials  
-- - coach_statistics: Performance metrics for coaches
--
-- Also adds missing invitee_name column to coach_invitations

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"location" text,
	"website" text,
	"years_experience" integer,
	"specialties" jsonb DEFAULT '[]'::jsonb,
	"achievements" text,
	"availability_status" text DEFAULT 'available',
	"hourly_rate" decimal(10,2),
	"consultation_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);

-- Create social_profiles table  
CREATE TABLE IF NOT EXISTS "social_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL CHECK ("platform" IN ('strava', 'instagram', 'twitter', 'youtube', 'facebook', 'linkedin', 'tiktok')),
	"username" text,
	"profile_url" text NOT NULL,
	"display_name" text,
	"is_verified" boolean DEFAULT false,
	"is_public" boolean DEFAULT true,
	"connection_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Create certifications table
CREATE TABLE IF NOT EXISTS "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"issuing_organization" text NOT NULL,
	"credential_id" text,
	"issue_date" timestamp with time zone,
	"expiration_date" timestamp with time zone,
	"verification_url" text,
	"certificate_file_url" text,
	"status" text DEFAULT 'active' CHECK ("status" IN ('active', 'expired', 'revoked', 'pending')),
	"is_featured" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Create coach_statistics table
CREATE TABLE IF NOT EXISTS "coach_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"total_athletes" integer DEFAULT 0,
	"active_athletes" integer DEFAULT 0,
	"average_rating" decimal(3,2),
	"total_reviews" integer DEFAULT 0,
	"years_coaching" integer DEFAULT 0,
	"success_stories" integer DEFAULT 0,
	"completed_training_plans" integer DEFAULT 0,
	"last_calculated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "coach_statistics_user_id_unique" UNIQUE("user_id")
);

-- Add missing invitee_name column to coach_invitations if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_invitations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'coach_invitations' AND column_name = 'invitee_name') THEN
            ALTER TABLE "coach_invitations" ADD COLUMN "invitee_name" text;
        END IF;
    END IF;
END $$;

-- Add foreign key constraints
ALTER TABLE "user_profiles" 
ADD CONSTRAINT "user_profiles_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE CASCADE;

ALTER TABLE "social_profiles" 
ADD CONSTRAINT "social_profiles_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE CASCADE;

ALTER TABLE "certifications" 
ADD CONSTRAINT "certifications_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE CASCADE;

ALTER TABLE "coach_statistics" 
ADD CONSTRAINT "coach_statistics_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "user_profiles_user_id_idx" ON "user_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "social_profiles_user_id_idx" ON "social_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "social_profiles_platform_idx" ON "social_profiles"("platform");
CREATE INDEX IF NOT EXISTS "certifications_user_id_idx" ON "certifications"("user_id");
CREATE INDEX IF NOT EXISTS "certifications_status_idx" ON "certifications"("status");
CREATE INDEX IF NOT EXISTS "coach_statistics_user_id_idx" ON "coach_statistics"("user_id");

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coach_statistics" ENABLE ROW LEVEL SECURITY;

-- User profiles: users can view public profiles, only edit their own
CREATE POLICY "Public profiles are viewable by everyone" ON "user_profiles" FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON "user_profiles" FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert their own profile" ON "user_profiles" FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete their own profile" ON "user_profiles" FOR DELETE USING (user_id = current_setting('app.current_user_id', true));

-- Social profiles: public social profiles viewable, users manage their own
CREATE POLICY "Public social profiles are viewable" ON "social_profiles" FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own social profiles" ON "social_profiles" FOR SELECT USING (user_id = current_setting('app.current_user_id', true));
CREATE POLICY "Users can manage their own social profiles" ON "social_profiles" FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Certifications: public certifications viewable, users manage their own
CREATE POLICY "Active certifications are viewable" ON "certifications" FOR SELECT USING (status = 'active');
CREATE POLICY "Users can manage their own certifications" ON "certifications" FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Coach statistics: viewable by everyone, only system can update
CREATE POLICY "Coach statistics are viewable by everyone" ON "coach_statistics" FOR SELECT USING (true);
CREATE POLICY "Only coaches can update their statistics" ON "coach_statistics" FOR UPDATE USING (
  user_id = current_setting('app.current_user_id', true) AND 
  EXISTS (SELECT 1 FROM better_auth_users WHERE id = user_id AND user_type = 'coach')
);
CREATE POLICY "Only coaches can insert their statistics" ON "coach_statistics" FOR INSERT WITH CHECK (
  user_id = current_setting('app.current_user_id', true) AND 
  EXISTS (SELECT 1 FROM better_auth_users WHERE id = user_id AND user_type = 'coach')
);