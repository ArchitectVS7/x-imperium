/**
 * Bots Domain Schema
 *
 * Contains tables for AI bot systems:
 * - botMemories, botEmotionalStates, botTells
 * - Related enums for emotional states and memory types
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  json,
  index,
} from "drizzle-orm/pg-core";
import { games, empires } from "./core";

// ============================================
// BOT ENUMS
// ============================================

export const emotionalStateEnum = pgEnum("emotional_state", [
  "confident",
  "arrogant",
  "desperate",
  "vengeful",
  "fearful",
  "triumphant",
  "neutral",
]);

export const memoryTypeEnum = pgEnum("memory_type", [
  "sector_captured",
  "sector_lost",
  "ally_saved",
  "ally_betrayed",
  "trade_completed",
  "treaty_formed",
  "treaty_broken",
  "war_declared",
  "war_ended",
  "covert_detected",
  "tribute_paid",
  "tribute_received",
  "battle_won",
  "battle_lost",
  "message_received",
]);

export const tellTypeEnum = pgEnum("tell_type", [
  "military_buildup",
  "fleet_movement",
  "target_fixation",
  "diplomatic_overture",
  "economic_preparation",
  "silence",
  "aggression_spike",
  "treaty_interest",
]);

// ============================================
// M10: BOT MEMORIES TABLE
// ============================================

export const botMemories = pgTable(
  "bot_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // The bot that holds this memory
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // The other empire this memory is about
    targetEmpireId: uuid("target_empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Memory details
    memoryType: memoryTypeEnum("memory_type").notNull(),
    weight: integer("weight").notNull().default(50), // 1-100, higher = more significant
    description: varchar("description", { length: 500 }),

    // Decay tracking
    turn: integer("turn").notNull(),
    decayResistance: decimal("decay_resistance", { precision: 3, scale: 2 })
      .notNull()
      .default("1.00"), // 0.0-1.0, higher = slower decay
    isPermanentScar: boolean("is_permanent_scar").notNull().default(false), // 20% of negative events

    // Context data (JSON for flexibility)
    context: json("context"), // { sectorName, creditsAmount, unitType, etc. }

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at"),
  },
  (table) => [
    index("bot_memories_game_idx").on(table.gameId),
    index("bot_memories_empire_idx").on(table.empireId),
    index("bot_memories_target_idx").on(table.targetEmpireId),
    index("bot_memories_type_idx").on(table.memoryType),
    index("bot_memories_weight_idx").on(table.weight),
    index("bot_memories_turn_idx").on(table.turn),
  ]
);

// ============================================
// M10: BOT EMOTIONAL STATES TABLE
// ============================================

export const botEmotionalStates = pgTable(
  "bot_emotional_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Current emotional state
    state: emotionalStateEnum("state").notNull().default("neutral"),
    intensity: decimal("intensity", { precision: 3, scale: 2 })
      .notNull()
      .default("0.50"), // 0.0-1.0

    // Previous state (for tracking transitions)
    previousState: emotionalStateEnum("previous_state"),
    stateChangedAtTurn: integer("state_changed_at_turn"),

    // Emotional triggers tracking
    recentVictories: integer("recent_victories").notNull().default(0),
    recentDefeats: integer("recent_defeats").notNull().default(0),
    recentBetrayals: integer("recent_betrayals").notNull().default(0),
    recentAlliances: integer("recent_alliances").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("bot_emotional_game_idx").on(table.gameId),
    index("bot_emotional_empire_idx").on(table.empireId),
    index("bot_emotional_state_idx").on(table.state),
  ]
);

// ============================================
// BOT TELLS TABLE (PRD 7.10)
// ============================================

export const botTells = pgTable(
  "bot_tells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // The bot emitting this tell
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Optional target of the tell (e.g., who they're focused on)
    targetEmpireId: uuid("target_empire_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Tell details
    tellType: tellTypeEnum("tell_type").notNull(),
    isBluff: boolean("is_bluff").notNull().default(false),
    trueIntention: tellTypeEnum("true_intention"), // Actual intention if bluffing

    // Confidence level (0.0 - 1.0)
    confidence: decimal("confidence", { precision: 3, scale: 2 })
      .notNull()
      .default("0.60"),

    // Timing
    createdAtTurn: integer("created_at_turn").notNull(),
    expiresAtTurn: integer("expires_at_turn").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("bot_tells_game_idx").on(table.gameId),
    index("bot_tells_empire_idx").on(table.empireId),
    index("bot_tells_target_idx").on(table.targetEmpireId),
    index("bot_tells_type_idx").on(table.tellType),
    index("bot_tells_turn_idx").on(table.createdAtTurn),
    index("bot_tells_expires_idx").on(table.expiresAtTurn),
    index("bot_tells_game_expires_idx").on(table.gameId, table.expiresAtTurn),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type BotMemory = typeof botMemories.$inferSelect;
export type NewBotMemory = typeof botMemories.$inferInsert;

export type BotEmotionalState = typeof botEmotionalStates.$inferSelect;
export type NewBotEmotionalState = typeof botEmotionalStates.$inferInsert;

export type BotTell = typeof botTells.$inferSelect;
export type NewBotTell = typeof botTells.$inferInsert;
