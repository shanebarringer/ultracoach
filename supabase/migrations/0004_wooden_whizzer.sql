ALTER TABLE "workouts" ALTER COLUMN "training_plan_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "intensity" integer;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "terrain" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "elevation_gain" integer;