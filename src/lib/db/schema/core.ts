/**
 * Core Domain Schema
 *
 * Contains foundational tables for game state management:
 * - games, gameSessions, empires, sectors
 * - gameSaves, gameConfigs, performanceLogs
 * - civilStatusHistory
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  json,
  index,
} from "drizzle-orm/pg-core";

// ============================================
// CORE ENUMS
// ============================================

export const gameStatusEnum = pgEnum("game_status", [
  "setup",
  "active",
  "paused",
  "completed",
  "abandoned",
]);

export const empireTypeEnum = pgEnum("empire_type", ["player", "bot"]);

export const botTierEnum = pgEnum("bot_tier", [
  "tier1_llm",
  "tier1_elite_scripted",
  "tier2_strategic",
  "tier3_simple",
  "tier4_random",
]);

export const botArchetypeEnum = pgEnum("bot_archetype", [
  "warlord",
  "diplomat",
  "merchant",
  "schemer",
  "turtle",
  "blitzkrieg",
  "tech_rush",
  "opportunist",
]);

export const sectorTypeEnum = pgEnum("sector_type", [
  "food",
  "ore",
  "petroleum",
  "tourism",
  "urban",
  "education",
  "government",
  "research",
  "supply",
  "anti_pollution",
  "industrial", // NEW: Processes Tier 0 -> Tier 1 resources
]);

export const civilStatusEnum = pgEnum("civil_status", [
  "ecstatic",
  "happy",
  "content",
  "neutral",
  "unhappy",
  "angry",
  "rioting",
  "revolting",
]);

export const difficultyEnum = pgEnum("difficulty", [
  "easy",
  "normal",
  "hard",
  "nightmare",
]);

// Game mode: oneshot (quick games) vs campaign (multi-session)
export const gameModeEnum = pgEnum("game_mode", [
  "oneshot", // 10-25 empires, 50-100 turns, single session
  "campaign", // 50-100 empires, 200+ turns, multi-session
]);

export const victoryTypeEnum = pgEnum("victory_type", [
  "conquest",
  "economic",
  "diplomatic",
  "research",
  "military",
  "survival",
]);

// Game Configuration Override Types
export const gameConfigTypeEnum = pgEnum("game_config_type", [
  "combat",
  "units",
  "archetypes",
  "resources",
  "victory",
]);

// ============================================
// GAMES TABLE
// ============================================

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    status: gameStatusEnum("status").notNull().default("setup"),

    // Game mode and session tracking
    gameMode: gameModeEnum("game_mode").notNull().default("oneshot"),
    sessionCount: integer("session_count").notNull().default(0),
    lastSessionAt: timestamp("last_session_at"),

    // Game settings
    turnLimit: integer("turn_limit").notNull().default(200),
    currentTurn: integer("current_turn").notNull().default(1),
    difficulty: difficultyEnum("difficulty").notNull().default("normal"),

    // Bot configuration
    botCount: integer("bot_count").notNull().default(25),
    protectionTurns: integer("protection_turns").notNull().default(20),

    // Performance tracking
    lastTurnProcessingMs: integer("last_turn_processing_ms"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [index("games_status_idx").on(table.status)]
);

// ============================================
// GAME SESSIONS TABLE
// ============================================
// Tracks individual play sessions for campaign mode
// Auto-save only - NO manual save/load to prevent save-scumming

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    sessionNumber: integer("session_number").notNull(),

    // Turn range for this session
    startTurn: integer("start_turn").notNull(),
    endTurn: integer("end_turn"),

    // Timestamps
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),

    // Session summary (for session recaps)
    empiresEliminated: integer("empires_eliminated").notNull().default(0),
    notableEvents: json("notable_events").$type<string[]>().default([]),
  },
  (table) => [
    index("game_sessions_game_id_idx").on(table.gameId),
    index("game_sessions_session_number_idx").on(
      table.gameId,
      table.sessionNumber
    ),
  ]
);

// ============================================
// EMPIRES TABLE
// ============================================

export const empires = pgTable(
  "empires",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Identity
    name: varchar("name", { length: 255 }).notNull(),
    emperorName: varchar("emperor_name", { length: 255 }),
    type: empireTypeEnum("type").notNull().default("player"),

    // Bot-specific fields (null for player)
    botTier: botTierEnum("bot_tier"),
    botArchetype: botArchetypeEnum("bot_archetype"),
    /** LLM-enabled flag for Tier 1 bots (10 elite bots use LLM API) */
    llmEnabled: boolean("llm_enabled").notNull().default(false),

    // Resources (stored as bigint for large numbers)
    credits: bigint("credits", { mode: "number" }).notNull().default(100000),
    food: bigint("food", { mode: "number" }).notNull().default(1000),
    ore: bigint("ore", { mode: "number" }).notNull().default(500),
    petroleum: bigint("petroleum", { mode: "number" }).notNull().default(200),
    researchPoints: bigint("research_points", { mode: "number" })
      .notNull()
      .default(0),

    // Population
    population: bigint("population", { mode: "number" }).notNull().default(10000),
    populationCap: bigint("population_cap", { mode: "number" })
      .notNull()
      .default(50000),
    civilStatus: civilStatusEnum("civil_status").notNull().default("content"),

    // Military totals (denormalized for performance)
    soldiers: integer("soldiers").notNull().default(100),
    fighters: integer("fighters").notNull().default(0),
    stations: integer("stations").notNull().default(0),
    lightCruisers: integer("light_cruisers").notNull().default(0),
    heavyCruisers: integer("heavy_cruisers").notNull().default(0),
    carriers: integer("carriers").notNull().default(0),
    covertAgents: integer("covert_agents").notNull().default(0),

    // Combat stats
    armyEffectiveness: decimal("army_effectiveness", { precision: 5, scale: 2 })
      .notNull()
      .default("85.00"),
    covertPoints: integer("covert_points").notNull().default(0),

    // Research progress
    fundamentalResearchLevel: integer("fundamental_research_level")
      .notNull()
      .default(0),

    // Computed stats (updated each turn)
    networth: bigint("networth", { mode: "number" }).notNull().default(0),
    sectorCount: integer("sector_count").notNull().default(5), // Reduced from 9 for faster eliminations

    // M7: Diplomacy reputation (0-100, starts at 50 = neutral)
    reputation: integer("reputation").notNull().default(50),

    // Game state
    isEliminated: boolean("is_eliminated").notNull().default(false),
    eliminatedAtTurn: integer("eliminated_at_turn"),

    // M7: Boss detection (dominant empire tracking)
    isBoss: boolean("is_boss").notNull().default(false),
    bossEmergenceTurn: integer("boss_emergence_turn"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("empires_game_idx").on(table.gameId),
    index("empires_type_idx").on(table.type),
    index("empires_networth_idx").on(table.networth),
    // Composite index for filtering active empires in a game
    index("empires_game_eliminated_idx").on(table.gameId, table.isEliminated),
  ]
);

// ============================================
// SECTORS TABLE
// ============================================

export const sectors = pgTable(
  "sectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Sector info
    type: sectorTypeEnum("type").notNull(),
    name: varchar("name", { length: 255 }),

    // Production rates (base values from PRD)
    productionRate: decimal("production_rate", {
      precision: 10,
      scale: 2,
    }).notNull(),

    // Acquisition info
    purchasePrice: integer("purchase_price").notNull(),
    acquiredAtTurn: integer("acquired_at_turn").notNull().default(1),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sectors_empire_idx").on(table.empireId),
    index("sectors_game_idx").on(table.gameId),
    index("sectors_type_idx").on(table.type),
  ]
);

// ============================================
// GAME SAVES TABLE (Auto-save / Ironman)
// ============================================

export const gameSaves = pgTable(
  "game_saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    turn: integer("turn").notNull(),

    // Snapshot data (full game state serialized)
    snapshot: json("snapshot").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("game_saves_game_idx").on(table.gameId),
    index("game_saves_turn_idx").on(table.turn),
  ]
);

// ============================================
// GAME CONFIGS TABLE (Per-Game Overrides)
// ============================================

export const gameConfigs = pgTable(
  "game_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Configuration type
    configType: gameConfigTypeEnum("config_type").notNull(),

    // Override values (JSONB for flexibility)
    overrides: json("overrides").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("game_configs_game_idx").on(table.gameId),
    index("game_configs_type_idx").on(table.configType),
    index("game_configs_game_type_idx").on(table.gameId, table.configType),
  ]
);

// ============================================
// PERFORMANCE LOGS TABLE
// ============================================

export const performanceLogs = pgTable(
  "performance_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),

    // Log entry
    operation: varchar("operation", { length: 100 }).notNull(),
    durationMs: integer("duration_ms").notNull(),
    metadata: json("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("perf_logs_game_idx").on(table.gameId),
    index("perf_logs_operation_idx").on(table.operation),
    index("perf_logs_created_idx").on(table.createdAt),
  ]
);

// ============================================
// M2: CIVIL STATUS HISTORY TABLE
// ============================================

export const civilStatusHistory = pgTable(
  "civil_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Status change
    turn: integer("turn").notNull(),
    oldStatus: civilStatusEnum("old_status").notNull(),
    newStatus: civilStatusEnum("new_status").notNull(),
    reason: varchar("reason", { length: 500 }),

    // Impact
    incomeMultiplier: decimal("income_multiplier", {
      precision: 3,
      scale: 2,
    }).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("civil_status_empire_idx").on(table.empireId),
    index("civil_status_game_idx").on(table.gameId),
    index("civil_status_turn_idx").on(table.turn),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;

export type Empire = typeof empires.$inferSelect;
export type NewEmpire = typeof empires.$inferInsert;

export type Sector = typeof sectors.$inferSelect;
export type NewSector = typeof sectors.$inferInsert;

export type GameSave = typeof gameSaves.$inferSelect;
export type NewGameSave = typeof gameSaves.$inferInsert;

export type GameConfig = typeof gameConfigs.$inferSelect;
export type NewGameConfig = typeof gameConfigs.$inferInsert;

export type PerformanceLog = typeof performanceLogs.$inferSelect;
export type NewPerformanceLog = typeof performanceLogs.$inferInsert;

export type CivilStatusHistory = typeof civilStatusHistory.$inferSelect;
export type NewCivilStatusHistory = typeof civilStatusHistory.$inferInsert;
