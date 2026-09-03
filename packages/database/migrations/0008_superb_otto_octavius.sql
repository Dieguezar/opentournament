CREATE TABLE "public_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tournament_id" uuid,
	"kind" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"checksum" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "public_media_exactly_one_owner" CHECK (("public_media"."user_id" IS NOT NULL) <> ("public_media"."tournament_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "public_player_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"gamertag" text NOT NULL,
	"real_name" text,
	"biography" text,
	"avatar_media_id" uuid,
	"is_published" boolean DEFAULT false NOT NULL,
	"show_avatar" boolean DEFAULT false NOT NULL,
	"show_real_name" boolean DEFAULT false NOT NULL,
	"show_biography" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_appearances" (
	"tournament_id" uuid PRIMARY KEY NOT NULL,
	"logo_media_id" uuid,
	"banner_media_id" uuid,
	"primary_color" text,
	"secondary_color" text,
	"accent_color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_appearances_primary_color_hex" CHECK ("tournament_appearances"."primary_color" IS NULL OR "tournament_appearances"."primary_color" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "tournament_appearances_secondary_color_hex" CHECK ("tournament_appearances"."secondary_color" IS NULL OR "tournament_appearances"."secondary_color" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "tournament_appearances_accent_color_hex" CHECK ("tournament_appearances"."accent_color" IS NULL OR "tournament_appearances"."accent_color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
ALTER TABLE "public_media" ADD CONSTRAINT "public_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_media" ADD CONSTRAINT "public_media_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_player_profiles" ADD CONSTRAINT "public_player_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_player_profiles" ADD CONSTRAINT "public_player_profiles_avatar_media_id_public_media_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."public_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_appearances" ADD CONSTRAINT "tournament_appearances_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_appearances" ADD CONSTRAINT "tournament_appearances_logo_media_id_public_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."public_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_appearances" ADD CONSTRAINT "tournament_appearances_banner_media_id_public_media_id_fk" FOREIGN KEY ("banner_media_id") REFERENCES "public"."public_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "public_media_object_key_unique" ON "public_media" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "public_media_user_id_idx" ON "public_media" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "public_media_tournament_id_idx" ON "public_media" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "public_player_profiles_user_id_unique" ON "public_player_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "public_player_profiles_slug_unique" ON "public_player_profiles" USING btree ("slug");