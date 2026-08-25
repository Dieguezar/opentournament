CREATE TABLE "participant_access_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "settings" SET DEFAULT '{"grandFinalReset":false,"presencial":false,"reportingMode":"bilateral"}'::jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "participant_access_pass_id" uuid;--> statement-breakpoint
ALTER TABLE "participant_access_passes" ADD CONSTRAINT "participant_access_passes_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_access_passes" ADD CONSTRAINT "participant_access_passes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_access_passes" ADD CONSTRAINT "participant_access_passes_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_access_passes" ADD CONSTRAINT "participant_access_passes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_access_passes_token_hash_unique" ON "participant_access_passes" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "participant_access_passes_team_idx" ON "participant_access_passes" USING btree ("tournament_id","team_id","revoked_at");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_participant_access_pass_id_participant_access_passes_id_fk" FOREIGN KEY ("participant_access_pass_id") REFERENCES "public"."participant_access_passes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_participant_access_pass_id_idx" ON "sessions" USING btree ("participant_access_pass_id");