/**
 * Events Domain Schema
 *
 * Contains tables for galactic events and coalitions:
 * - galacticEvents, coalitions, coalitionMembers
 * - Related enums for event types and coalition status
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
import { games, empires } from "./core";

// ============================================
// GALACTIC EVENTS ENUMS
// ============================================

export const galacticEventTypeEnum = pgEnum("galactic_event_type", [
  "economic",
  "political",
  "military",
  "narrative",
]);

export const galacticEventSubtypeEnum = pgEnum("galactic_event_subtype", [
  // Economic events
  "market_crash",
  "resource_boom",
  "trade_embargo",
  "economic_miracle",
  // Political events
  "coup_attempt",
  "assassination",
  "rebellion",
  "political_scandal",
  // Military events
  "pirate_armada",
  "arms_race",
  "mercenary_influx",
  "military_parade",
  // Narrative events
  "ancient_discovery",
  "prophecy_revealed",
  "mysterious_signal",
  "cultural_renaissance",
]);

export const coalitionStatusEnum = pgEnum("coalition_status", [
  "forming",
  "active",
  "dissolved",
]);

// ============================================
// M11: GALACTIC EVENTS TABLE
// ============================================

export const galacticEvents = pgTable(
  "galactic_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Event classification
    eventType: galacticEventTypeEnum("event_type").notNull(),
    eventSubtype: galacticEventSubtypeEnum("event_subtype").notNull(),

    // Event details
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 1000 }).notNull(),
    severity: integer("severity").notNull().default(50), // 1-100

    // Affected entities (null = affects all)
    affectedEmpireId: uuid("affected_empire_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Effects (JSON for flexibility)
    effects: json("effects").notNull(), // { resourceType: 'credits', modifier: -0.2, duration: 5 }

    // Timing
    turn: integer("turn").notNull(),
    durationTurns: integer("duration_turns").notNull().default(1),
    expiresAtTurn: integer("expires_at_turn"),
    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("galactic_events_game_idx").on(table.gameId),
    index("galactic_events_type_idx").on(table.eventType),
    index("galactic_events_turn_idx").on(table.turn),
    index("galactic_events_active_idx").on(table.isActive),
  ]
);

// ============================================
// M11: COALITIONS TABLE
// ============================================

export const coalitions = pgTable(
  "coalitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Coalition identity
    name: varchar("name", { length: 200 }).notNull(),
    leaderId: uuid("leader_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Status
    status: coalitionStatusEnum("status").notNull().default("forming"),

    // Timeline
    formedAtTurn: integer("formed_at_turn").notNull(),
    dissolvedAtTurn: integer("dissolved_at_turn"),

    // Coalition stats (denormalized for performance)
    memberCount: integer("member_count").notNull().default(1),
    totalNetworth: bigint("total_networth", { mode: "number" })
      .notNull()
      .default(0),
    territoryPercent: decimal("territory_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("coalitions_game_idx").on(table.gameId),
    index("coalitions_leader_idx").on(table.leaderId),
    index("coalitions_status_idx").on(table.status),
  ]
);

// ============================================
// M11: COALITION MEMBERS TABLE
// ============================================

export const coalitionMembers = pgTable(
  "coalition_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coalitionId: uuid("coalition_id")
      .notNull()
      .references(() => coalitions.id, { onDelete: "cascade" }),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Membership details
    joinedAtTurn: integer("joined_at_turn").notNull(),
    leftAtTurn: integer("left_at_turn"),
    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("coalition_members_coalition_idx").on(table.coalitionId),
    index("coalition_members_empire_idx").on(table.empireId),
    index("coalition_members_game_idx").on(table.gameId),
    index("coalition_members_active_idx").on(table.isActive),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type GalacticEvent = typeof galacticEvents.$inferSelect;
export type NewGalacticEvent = typeof galacticEvents.$inferInsert;

export type Coalition = typeof coalitions.$inferSelect;
export type NewCoalition = typeof coalitions.$inferInsert;

export type CoalitionMember = typeof coalitionMembers.$inferSelect;
export type NewCoalitionMember = typeof coalitionMembers.$inferInsert;
