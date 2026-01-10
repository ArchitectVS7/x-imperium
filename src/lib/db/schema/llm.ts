/**
 * LLM Domain Schema
 *
 * Contains tables for LLM bot integration:
 * - llmUsageLogs, llmDecisionCache
 * - Related enums for providers and call status
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
// LLM BOT ENUMS
// ============================================

export const llmProviderEnum = pgEnum("llm_provider", [
  "groq",
  "together",
  "openai",
  "anthropic",
]);

export const llmCallStatusEnum = pgEnum("llm_call_status", [
  "pending",
  "completed",
  "failed",
  "rate_limited",
]);

// ============================================
// M12: LLM USAGE LOGS TABLE
// ============================================

export const llmUsageLogs = pgTable(
  "llm_usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // The bot making the LLM call
    empireId: uuid("empire_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Provider info
    provider: llmProviderEnum("provider").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    status: llmCallStatusEnum("status").notNull().default("pending"),

    // Request details
    purpose: varchar("purpose", { length: 100 }).notNull(), // 'decision', 'message', 'strategy'
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),

    // Cost tracking
    costUsd: decimal("cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0.000000"),

    // Performance
    latencyMs: integer("latency_ms"),
    turn: integer("turn").notNull(),

    // Fallback tracking
    didFallback: boolean("did_fallback").notNull().default(false),
    fallbackReason: varchar("fallback_reason", { length: 200 }),
    fallbackProvider: llmProviderEnum("fallback_provider"),

    // Error info (if failed)
    errorMessage: varchar("error_message", { length: 500 }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("llm_usage_game_idx").on(table.gameId),
    index("llm_usage_empire_idx").on(table.empireId),
    index("llm_usage_provider_idx").on(table.provider),
    index("llm_usage_status_idx").on(table.status),
    index("llm_usage_turn_idx").on(table.turn),
    index("llm_usage_created_idx").on(table.createdAt),
  ]
);

// ============================================
// M12: LLM DECISION CACHE TABLE
// ============================================

export const llmDecisionCache = pgTable(
  "llm_decision_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // The turn this decision is FOR (pre-computed for next turn)
    forTurn: integer("for_turn").notNull(),

    // Cached decision (full BotDecision structure)
    decisionJson: json("decision_json").notNull(),

    // LLM reasoning (for debugging/analysis)
    reasoning: varchar("reasoning", { length: 1000 }),

    // LLM-generated message (for this turn)
    message: varchar("message", { length: 500 }),

    // Provider metadata
    provider: llmProviderEnum("provider").notNull(),
    model: varchar("model", { length: 100 }).notNull(),

    // Usage tracking
    tokensUsed: integer("tokens_used").notNull().default(0),
    costUsd: decimal("cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0.000000"),

    // Timestamps
    cachedAt: timestamp("cached_at").notNull().defaultNow(),
  },
  (table) => [
    // Unique constraint: one cached decision per bot per turn
    index("llm_cache_unique_idx").on(table.gameId, table.empireId, table.forTurn),
    index("llm_cache_game_idx").on(table.gameId),
    index("llm_cache_turn_idx").on(table.forTurn),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type LlmUsageLog = typeof llmUsageLogs.$inferSelect;
export type NewLlmUsageLog = typeof llmUsageLogs.$inferInsert;

export type LlmDecisionCache = typeof llmDecisionCache.$inferSelect;
export type NewLlmDecisionCache = typeof llmDecisionCache.$inferInsert;
