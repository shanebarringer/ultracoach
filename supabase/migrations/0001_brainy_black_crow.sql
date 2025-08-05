CREATE TABLE "coach_runners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" text NOT NULL,
	"runner_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"relationship_type" text DEFAULT 'standard' NOT NULL,
	"invited_by" text,
	"relationship_started_at" timestamp with time zone DEFAULT now(),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "coach_runners_coach_id_runner_id_unique" UNIQUE("coach_id","runner_id")
);
--> statement-breakpoint
ALTER TABLE "coach_runners" ADD CONSTRAINT "coach_runners_coach_id_user_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_runners" ADD CONSTRAINT "coach_runners_runner_id_user_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;