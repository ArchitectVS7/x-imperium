/**
 * Diplomacy Domain Schema
 *
 * Contains tables for diplomatic relations:
 * - treaties, reputationLog, messages
 * - Related enums for treaty types and message channels
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { games, empires } from "./core";

// ============================================
// DIPLOMACY ENUMS
// ============================================

export const treatyTypeEnum = pgEnum("treaty_type", [
  "nap", // Non-Aggression Pact
  "alliance",
]);

export const treatyStatusEnum = pgEnum("treaty_status", [
  "proposed",
  "active",
  "rejected",
  "cancelled",
  "broken",
]);

export const reputationEventTypeEnum = pgEnum("reputation_event_type", [
  "treaty_broken",
  "treaty_honored",
  "alliance_formed",
  "alliance_ended",
  "nap_formed",
  "nap_ended",
]);

// ============================================
// MESSAGE SYSTEM ENUMS
// ============================================

export const messageChannelEnum = pgEnum("message_channel", [
  "direct",
  "broadcast",
]);

export const messageTriggerEnum = pgEnum("message_trigger", [
  "greeting",
  "battle_taunt",
  "victory_gloat",
  "defeat",
  "trade_offer",
  "alliance_proposal",
  "betrayal",
  "covert_detected",
  "tribute_demand",
  "threat_warning",
  "retreat",
  "eliminated",
  "endgame",
  "broadcast_shout",
  "casual_message",
]);

// ============================================
// M7: TREATIES TABLE
// ============================================

export const treaties = pgTable(
  "treaties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Treaty parties
    proposerId: uuid("proposer_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Treaty details
    treatyType: treatyTypeEnum("treaty_type").notNull(),
    status: treatyStatusEnum("status").notNull().default("proposed"),

    // Timeline
    proposedAtTurn: integer("proposed_at_turn").notNull(),
    activatedAtTurn: integer("activated_at_turn"),
    endedAtTurn: integer("ended_at_turn"),

    // Breaking info
    brokenById: uuid("broken_by_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("treaties_game_idx").on(table.gameId),
    index("treaties_proposer_idx").on(table.proposerId),
    index("treaties_recipient_idx").on(table.recipientId),
    index("treaties_status_idx").on(table.status),
  ]
);

// ============================================
// M7: REPUTATION LOG TABLE
// ============================================

export const reputationLog = pgTable(
  "reputation_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Empire that performed the action
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Affected empire (e.g., the betrayed party)
    affectedEmpireId: uuid("affected_empire_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Related treaty
    treatyId: uuid("treaty_id").references(() => treaties.id, {
      onDelete: "set null",
    }),

    // Event details
    eventType: reputationEventTypeEnum("event_type").notNull(),
    reputationChange: integer("reputation_change").notNull(), // Negative for bad actions
    description: varchar("description", { length: 500 }),

    // Timeline
    turn: integer("turn").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("reputation_log_game_idx").on(table.gameId),
    index("reputation_log_empire_idx").on(table.empireId),
    index("reputation_log_turn_idx").on(table.turn),
  ]
);

// ============================================
// M8: MESSAGES TABLE
// ============================================

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Sender (null for system messages)
    senderId: uuid("sender_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Recipient (null for broadcasts)
    recipientId: uuid("recipient_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Message details
    channel: messageChannelEnum("channel").notNull().default("direct"),
    trigger: messageTriggerEnum("trigger").notNull(),
    content: varchar("content", { length: 2000 }).notNull(),

    // Template tracking (to prevent repetition)
    templateId: varchar("template_id", { length: 100 }),

    // Read status (for direct messages to player)
    isRead: boolean("is_read").notNull().default(false),

    // Timeline
    turn: integer("turn").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
  },
  (table) => [
    index("messages_game_idx").on(table.gameId),
    index("messages_sender_idx").on(table.senderId),
    index("messages_recipient_idx").on(table.recipientId),
    index("messages_game_recipient_idx").on(table.gameId, table.recipientId),
    index("messages_game_turn_idx").on(table.gameId, table.turn),
    index("messages_channel_idx").on(table.channel),
    index("messages_turn_idx").on(table.turn),
    index("messages_is_read_idx").on(table.isRead),
    // Composite index for filtering messages by game and channel
    index("messages_game_channel_idx").on(table.gameId, table.channel),
    // Composite index for querying unread messages for a recipient in a game
    index("messages_game_recipient_read_idx").on(
      table.gameId,
      table.recipientId,
      table.isRead
    ),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type Treaty = typeof treaties.$inferSelect;
export type NewTreaty = typeof treaties.$inferInsert;

export type ReputationLog = typeof reputationLog.$inferSelect;
export type NewReputationLog = typeof reputationLog.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
