/**
 * Geography Domain Schema
 *
 * Contains tables for galaxy spatial layout:
 * - galaxyRegions, regionConnections, empireInfluence
 * - Related enums for region types and connection types
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
// GEOGRAPHY SYSTEM ENUMS
// ============================================

export const regionTypeEnum = pgEnum("region_type", [
  "core", // Central, resource-rich, heavily contested
  "inner", // Developed, stable
  "outer", // Frontier, developing
  "rim", // Edge of galaxy, sparse
  "void", // Dangerous, few empires
]);

export const connectionTypeEnum = pgEnum("connection_type", [
  "adjacent", // Normal border (1.0x force cost)
  "trade_route", // Established path (1.0x cost, trade bonus)
  "wormhole", // Shortcut to distant region (1.0x cost)
  "hazardous", // Difficult passage (1.5x force cost)
  "contested", // Active conflict zone (1.25x cost, random events)
]);

export const wormholeStatusEnum = pgEnum("wormhole_status", [
  "undiscovered", // Exists but no one knows
  "discovered", // Found by an empire
  "stabilized", // Improved for regular use
  "collapsed", // No longer usable
  "constructing", // Player is building this wormhole (M6.3)
]);

// ============================================
// GEOGRAPHY SYSTEM TABLES
// ============================================

// Galaxy Regions - Defines the spatial layout of the galaxy
export const galaxyRegions = pgTable(
  "galaxy_regions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Region identity
    name: varchar("name", { length: 100 }).notNull(),
    regionType: regionTypeEnum("region_type").notNull(),

    // Position in galaxy (for visualization and distance calculation)
    positionX: decimal("position_x", { precision: 8, scale: 2 }).notNull(),
    positionY: decimal("position_y", { precision: 8, scale: 2 }).notNull(),

    // Economic modifiers
    wealthModifier: decimal("wealth_modifier", { precision: 4, scale: 2 })
      .notNull()
      .default("1.00"), // 0.5 (rim) to 1.5 (core)
    dangerLevel: integer("danger_level").notNull().default(50), // 1-100, higher = more events

    // Capacity
    maxEmpires: integer("max_empires").notNull().default(10),
    currentEmpireCount: integer("current_empire_count").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("galaxy_regions_game_idx").on(table.gameId),
    index("galaxy_regions_type_idx").on(table.regionType),
  ]
);

// Region Connections - Defines paths between regions (including wormholes)
export const regionConnections = pgTable(
  "region_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Connection endpoints
    fromRegionId: uuid("from_region_id")
      .notNull()
      .references(() => galaxyRegions.id, { onDelete: "cascade" }),
    toRegionId: uuid("to_region_id")
      .notNull()
      .references(() => galaxyRegions.id, { onDelete: "cascade" }),

    // Connection type and properties
    connectionType: connectionTypeEnum("connection_type").notNull(),
    forceMultiplier: decimal("force_multiplier", { precision: 4, scale: 2 })
      .notNull()
      .default("1.00"), // 1.0 = normal, 1.5 = hazardous

    // Trade and travel
    travelCost: integer("travel_cost").notNull().default(0), // Extra fuel/credits
    tradeBonus: decimal("trade_bonus", { precision: 4, scale: 2 })
      .notNull()
      .default("1.00"), // 1.0 = normal, 1.2 = trade route bonus

    // Wormhole-specific fields
    wormholeStatus: wormholeStatusEnum("wormhole_status"),
    discoveredByEmpireId: uuid("discovered_by_empire_id").references(
      () => empires.id,
      { onDelete: "set null" }
    ),
    discoveredAtTurn: integer("discovered_at_turn"),
    stabilizedAtTurn: integer("stabilized_at_turn"),
    collapseChance: decimal("collapse_chance", { precision: 4, scale: 2 }).default(
      "0.00"
    ), // 0.0-1.0 per turn

    // Whether connection is bidirectional
    isBidirectional: boolean("is_bidirectional").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("region_connections_game_idx").on(table.gameId),
    index("region_connections_from_idx").on(table.fromRegionId),
    index("region_connections_to_idx").on(table.toRegionId),
    index("region_connections_type_idx").on(table.connectionType),
    index("region_connections_wormhole_idx").on(table.wormholeStatus),
  ]
);

// Empire Influence Data - Tracks empire sphere of influence
export const empireInfluence = pgTable(
  "empire_influence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Home region (where empire started)
    homeRegionId: uuid("home_region_id")
      .notNull()
      .references(() => galaxyRegions.id, { onDelete: "cascade" }),

    // Current primary region (may differ from home if expanded)
    primaryRegionId: uuid("primary_region_id")
      .notNull()
      .references(() => galaxyRegions.id, { onDelete: "cascade" }),

    // Influence sphere (calculated from territory)
    baseInfluenceRadius: integer("base_influence_radius").notNull().default(3), // Base neighbors
    bonusInfluenceRadius: integer("bonus_influence_radius").notNull().default(0), // From sectors/tech
    totalInfluenceRadius: integer("total_influence_radius").notNull().default(3),

    // Cached neighbor data (updated when territory changes)
    directNeighborIds: json("direct_neighbor_ids").notNull().default("[]"), // Empire IDs at 1.0x cost
    extendedNeighborIds: json("extended_neighbor_ids").notNull().default("[]"), // Empire IDs at 1.5x cost
    knownWormholeIds: json("known_wormhole_ids").notNull().default("[]"), // Connection IDs

    // Regions controlled (for multi-region empires)
    controlledRegionIds: json("controlled_region_ids").notNull().default("[]"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("empire_influence_empire_idx").on(table.empireId),
    index("empire_influence_game_idx").on(table.gameId),
    index("empire_influence_home_idx").on(table.homeRegionId),
    index("empire_influence_primary_idx").on(table.primaryRegionId),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type GalaxyRegion = typeof galaxyRegions.$inferSelect;
export type NewGalaxyRegion = typeof galaxyRegions.$inferInsert;

export type RegionConnection = typeof regionConnections.$inferSelect;
export type NewRegionConnection = typeof regionConnections.$inferInsert;

export type EmpireInfluence = typeof empireInfluence.$inferSelect;
export type NewEmpireInfluence = typeof empireInfluence.$inferInsert;
