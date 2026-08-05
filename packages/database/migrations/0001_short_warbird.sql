CREATE TABLE "brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_adapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"icon_url" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"map" text,
	"home_score" integer,
	"away_score" integer,
	"winner_id" uuid
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"engine_id" text NOT NULL,
	"position" integer NOT NULL,
	"home_participant_id" uuid,
	"away_participant_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"series" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lobby_url" text,
	"maps" jsonb,
	"scheduled_at" timestamp with time zone,
	"result" jsonb,
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bracket_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"type" text DEFAULT 'bracket' NOT NULL,
	"format" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"platform" text DEFAULT 'other' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tag" text,
	"logo_url" text,
	"is_permanent" boolean DEFAULT true NOT NULL,
	"captain_id" uuid NOT NULL,
	"game_adapter_key" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"registration_id" uuid,
	"team_id" uuid NOT NULL,
	"seed" integer,
	"checked_in" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"waitlist_position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"game_adapter_key" text DEFAULT 'generic' NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rules" text,
	"format" text DEFAULT 'single_elimination' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"capacity" integer DEFAULT 16 NOT NULL,
	"series_config" jsonb DEFAULT '{"bo":[1,3,5],"drawsAllowed":false}'::jsonb NOT NULL,
	"registration_config" jsonb DEFAULT '{"manualApproval":false}'::jsonb NOT NULL,
	"checkin_config" jsonb DEFAULT '{"delayToleranceMinutes":10}'::jsonb NOT NULL,
	"timing_config" jsonb DEFAULT '{"resultConfirmMinutes":30,"disputeWindowMinutes":60}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{"grandFinalReset":false,"presencial":false}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_winner_id_tournament_participants_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."tournament_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_participant_id_tournament_participants_id_fk" FOREIGN KEY ("home_participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_participant_id_tournament_participants_id_fk" FOREIGN KEY ("away_participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_links" ADD CONSTRAINT "stream_links_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_users_id_fk" FOREIGN KEY ("captain_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_staff" ADD CONSTRAINT "tournament_staff_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_staff" ADD CONSTRAINT "tournament_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brackets_stage_id_idx" ON "brackets" USING btree ("stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_tournament_team_unique" ON "check_ins" USING btree ("tournament_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_adapters_key_unique" ON "game_adapters" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "match_games_match_number_unique" ON "match_games" USING btree ("match_id","number");--> statement-breakpoint
CREATE INDEX "matches_tournament_status_idx" ON "matches" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "matches_round_id_idx" ON "matches" USING btree ("round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_round_position_unique" ON "matches" USING btree ("round_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_bracket_number_unique" ON "rounds" USING btree ("bracket_id","number");--> statement-breakpoint
CREATE INDEX "stages_tournament_id_idx" ON "stages" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "stream_links_tournament_id_idx" ON "stream_links" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_user_unique" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teams_organization_id_idx" ON "teams" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_participants_unique" ON "tournament_participants" USING btree ("tournament_id","team_id");--> statement-breakpoint
CREATE INDEX "tournament_participants_status_idx" ON "tournament_participants" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_registrations_unique" ON "tournament_registrations" USING btree ("tournament_id","team_id");--> statement-breakpoint
CREATE INDEX "tournament_registrations_status_idx" ON "tournament_registrations" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_staff_unique" ON "tournament_staff" USING btree ("tournament_id","user_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_org_slug_unique" ON "tournaments" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "tournaments_org_status_idx" ON "tournaments" USING btree ("organization_id","status");