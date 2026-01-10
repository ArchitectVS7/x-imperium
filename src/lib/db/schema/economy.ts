/**
 * Economy Domain Schema
 *
 * Contains tables for economic systems:
 * - marketPrices, marketOrders, buildQueue
 * - Related enums for resources and market orders
 */

import {
  pgTable,
  uuid,
  integer,
  bigint,
  decimal,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { games, empires } from "./core";
import { unitTypeEnum } from "./combat";

// ============================================
// ECONOMY ENUMS
// ============================================

export const resourceTypeEnum = pgEnum("resource_type", [
  "food",
  "ore",
  "petroleum",
  "credits",
]);

export const marketOrderTypeEnum = pgEnum("market_order_type", ["buy", "sell"]);

export const marketOrderStatusEnum = pgEnum("market_order_status", [
  "pending",
  "completed",
  "cancelled",
]);

// ============================================
// M7: MARKET PRICES TABLE
// ============================================

export const marketPrices = pgTable(
  "market_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Resource type
    resourceType: resourceTypeEnum("resource_type").notNull(),

    // Pricing (PRD 4: 0.4x to 1.6x base price)
    basePrice: integer("base_price").notNull(),
    currentPrice: decimal("current_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
    priceMultiplier: decimal("price_multiplier", { precision: 5, scale: 2 })
      .notNull()
      .default("1.00"),

    // Supply/demand tracking
    totalSupply: bigint("total_supply", { mode: "number" }).notNull().default(0),
    totalDemand: bigint("total_demand", { mode: "number" }).notNull().default(0),

    // Price history
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
    turnUpdated: integer("turn_updated").notNull().default(1),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("market_prices_game_idx").on(table.gameId),
    index("market_prices_resource_idx").on(table.resourceType),
  ]
);

// ============================================
// M7: MARKET ORDERS TABLE
// ============================================

export const marketOrders = pgTable(
  "market_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Order details
    orderType: marketOrderTypeEnum("order_type").notNull(),
    resourceType: resourceTypeEnum("resource_type").notNull(),
    quantity: integer("quantity").notNull(),
    pricePerUnit: decimal("price_per_unit", {
      precision: 12,
      scale: 2,
    }).notNull(),
    totalCost: decimal("total_cost", { precision: 16, scale: 2 }).notNull(),

    // Status
    status: marketOrderStatusEnum("status").notNull().default("pending"),
    turn: integer("turn").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("market_orders_game_idx").on(table.gameId),
    index("market_orders_empire_idx").on(table.empireId),
    index("market_orders_status_idx").on(table.status),
    index("market_orders_turn_idx").on(table.turn),
  ]
);

// ============================================
// M3: BUILD QUEUE TABLE
// ============================================

export const buildQueue = pgTable(
  "build_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Build order
    unitType: unitTypeEnum("unit_type").notNull(),
    quantity: integer("quantity").notNull().default(1),
    turnsRemaining: integer("turns_remaining").notNull(),

    // Cost tracking
    totalCost: integer("total_cost").notNull(),

    // Queue position
    queuePosition: integer("queue_position").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("build_queue_empire_idx").on(table.empireId),
    index("build_queue_game_idx").on(table.gameId),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type MarketPrice = typeof marketPrices.$inferSelect;
export type NewMarketPrice = typeof marketPrices.$inferInsert;

export type MarketOrder = typeof marketOrders.$inferSelect;
export type NewMarketOrder = typeof marketOrders.$inferInsert;

export type BuildQueue = typeof buildQueue.$inferSelect;
export type NewBuildQueue = typeof buildQueue.$inferInsert;
