-- Create game_config_type enum
CREATE TYPE "public"."game_config_type" AS ENUM('combat', 'units', 'archetypes', 'resources', 'victory');

-- Create game_configs table
CREATE TABLE IF NOT EXISTS "public"."game_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL REFERENCES "public"."games"("id") ON DELETE CASCADE,
  "config_type" "public"."game_config_type" NOT NULL,
  "overrides" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "game_configs_game_idx" ON "public"."game_configs" ("game_id");
CREATE INDEX IF NOT EXISTS "game_configs_type_idx" ON "public"."game_configs" ("config_type");
CREATE INDEX IF NOT EXISTS "game_configs_game_type_idx" ON "public"."game_configs" ("game_id", "config_type");
