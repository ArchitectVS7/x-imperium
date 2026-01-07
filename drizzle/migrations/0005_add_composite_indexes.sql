-- Add composite indexes for query optimization (P2 #17)

-- Composite index for filtering active empires in a game
CREATE INDEX IF NOT EXISTS "empires_game_eliminated_idx" ON "empires" ("game_id", "is_eliminated");

-- Composite index for filtering messages by game and channel
CREATE INDEX IF NOT EXISTS "messages_game_channel_idx" ON "messages" ("game_id", "channel");

-- Composite index for querying specific resources for an empire
CREATE INDEX IF NOT EXISTS "resource_inv_empire_type_idx" ON "resource_inventory" ("empire_id", "resource_type");
