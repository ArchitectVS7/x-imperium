-- Migration 001: Expand password field for Argon2id hashes
-- Date: December 2024
-- Description: MD5 hashes are 32 chars, Argon2id hashes are ~96 chars
--              This migration expands the password field to accommodate modern hashes

-- System players table
ALTER TABLE system_tb_players
    MODIFY COLUMN password VARCHAR(255) NOT NULL;

-- Note: Game empire tables are created dynamically with game{id}_tb_empire naming
-- The password field in empire tables also needs to be expanded
-- This will be handled by the PHP migration script below
