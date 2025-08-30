-- Add enhanced workout fields to match Drizzle schema
-- This migration adds the missing columns that exist in schema.ts but not in the database

ALTER TABLE "workouts" ADD COLUMN "category" text;
ALTER TABLE "workouts" ADD COLUMN "intensity" integer;
ALTER TABLE "workouts" ADD COLUMN "terrain" text;
ALTER TABLE "workouts" ADD COLUMN "elevation_gain" integer;