-- Phase 2: Rename planets table to sectors (Terminology Crisis Fix)
-- This migration renames the "planets" table to "sectors" to align with
-- the game's rebranding decision away from Solar Realms Elite terminology.

-- Step 1: Rename the table
ALTER TABLE "planets" RENAME TO "sectors";

-- Step 2: Rename all indexes
ALTER INDEX "planets_pkey" RENAME TO "sectors_pkey";
ALTER INDEX "planets_empire_idx" RENAME TO "sectors_empire_idx";
ALTER INDEX "planets_game_idx" RENAME TO "sectors_game_idx";
ALTER INDEX "planets_type_idx" RENAME TO "sectors_type_idx";

-- Step 3: Rename foreign key constraints
-- Note: PostgreSQL names constraints automatically, we need to find and rename them
-- The constraints are named after the table, so they need updating

-- Get the current constraint names and rename them
DO $$
DECLARE
    empire_fk_name TEXT;
    game_fk_name TEXT;
BEGIN
    -- Find the empire_id foreign key constraint name
    SELECT con.conname INTO empire_fk_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'sectors'
    AND con.contype = 'f'
    AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'empire_id')];

    IF empire_fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE sectors RENAME CONSTRAINT %I TO sectors_empire_id_empires_id_fk', empire_fk_name);
    END IF;

    -- Find the game_id foreign key constraint name
    SELECT con.conname INTO game_fk_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'sectors'
    AND con.contype = 'f'
    AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'game_id')];

    IF game_fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE sectors RENAME CONSTRAINT %I TO sectors_game_id_games_id_fk', game_fk_name);
    END IF;
END $$;

-- Step 4: Update table comment to reflect new name
COMMENT ON TABLE "sectors" IS 'Game sectors (formerly planets) - represents territory owned by empires';
