/**
 * Crafting Domain Schema
 *
 * Contains tables for crafting and syndicate systems:
 * - resourceInventory, craftingQueue
 * - syndicateTrust, syndicateContracts, pirateMissions
 * - Related enums for resources, crafting, and contracts
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  pgEnum,
  json,
  index,
} from "drizzle-orm/pg-core";
import { games, empires } from "./core";

// ============================================
// CRAFTING SYSTEM ENUMS
// ============================================

export const resourceTierEnum = pgEnum("resource_tier", [
  "tier0", // Base resources (credits, food, ore, petroleum, RP, population)
  "tier1", // Refined resources (refined_metals, fuel_cells, polymers, etc.)
  "tier2", // Manufactured components (electronics, armor_plating, etc.)
  "tier3", // Advanced systems (reactor_cores, shield_generators, etc.)
]);

export const craftedResourceTypeEnum = pgEnum("crafted_resource_type", [
  // Tier 1: Refined Resources
  "refined_metals",
  "fuel_cells",
  "polymers",
  "processed_food",
  "labor_units",
  // Tier 2: Manufactured Components
  "electronics",
  "armor_plating",
  "propulsion_units",
  "life_support",
  "weapons_grade_alloy",
  "targeting_arrays",
  "stealth_composites",
  "quantum_processors",
  // Tier 3: Advanced Systems
  "reactor_cores",
  "shield_generators",
  "warp_drives",
  "cloaking_devices",
  "ion_cannon_cores",
  "neural_interfaces",
  "singularity_containment",
  "bioweapon_synthesis",
  "nuclear_warheads",
]);

export const craftingStatusEnum = pgEnum("crafting_status", [
  "queued",
  "in_progress",
  "completed",
  "cancelled",
]);

// ============================================
// SYNDICATE SYSTEM ENUMS
// ============================================

export const syndicateTrustLevelEnum = pgEnum("syndicate_trust_level", [
  "unknown", // Level 0: Must complete intro contract
  "associate", // Level 1: Basic access
  "runner", // Level 2: Pirate contracts
  "soldier", // Level 3: Player contracts
  "captain", // Level 4: Targeted contracts
  "lieutenant", // Level 5: Tier 3 systems
  "underboss", // Level 6: Chemical weapons
  "consigliere", // Level 7: Nuclear weapons
  "syndicate_lord", // Level 8: Full access
]);

export const contractTypeEnum = pgEnum("contract_type", [
  // Tier 1: Pirate Raids
  "supply_run",
  "disruption",
  "salvage_op",
  "intel_gathering",
  // Tier 2: Standard Contracts
  "intimidation",
  "economic_warfare",
  "military_probe",
  "hostile_takeover",
  // Tier 3: Targeted Contracts
  "kingslayer",
  "market_manipulation",
  "regime_change",
  "decapitation_strike",
  // Tier 4: Syndicate Operations
  "proxy_war",
  "scorched_earth",
  "the_equalizer",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "available",
  "accepted",
  "in_progress",
  "completed",
  "failed",
  "expired",
]);

export const pirateMissionStatusEnum = pgEnum("pirate_mission_status", [
  "queued",
  "executing",
  "completed",
  "failed",
]);

// ============================================
// CRAFTING SYSTEM TABLES
// ============================================

// Resource Inventory - Stores Tier 1-3 crafted resources
export const resourceInventory = pgTable(
  "resource_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Resource info
    resourceType: craftedResourceTypeEnum("resource_type").notNull(),
    tier: resourceTierEnum("tier").notNull(),
    quantity: integer("quantity").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("resource_inv_empire_idx").on(table.empireId),
    index("resource_inv_game_idx").on(table.gameId),
    index("resource_inv_type_idx").on(table.resourceType),
    // Composite index for querying specific resources for an empire
    index("resource_inv_empire_type_idx").on(table.empireId, table.resourceType),
  ]
);

// Crafting Queue - Tracks active crafting orders
export const craftingQueue = pgTable(
  "crafting_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Crafting order details
    resourceType: craftedResourceTypeEnum("resource_type").notNull(),
    quantity: integer("quantity").notNull().default(1),
    status: craftingStatusEnum("status").notNull().default("queued"),

    // Components reserved (JSON: { "refined_metals": 2, "polymers": 1 })
    componentsReserved: json("components_reserved").notNull(),

    // Timing
    startTurn: integer("start_turn").notNull(),
    completionTurn: integer("completion_turn").notNull(),
    queuePosition: integer("queue_position").notNull().default(1),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("crafting_queue_empire_idx").on(table.empireId),
    index("crafting_queue_game_idx").on(table.gameId),
    index("crafting_queue_status_idx").on(table.status),
  ]
);

// ============================================
// SYNDICATE SYSTEM TABLES
// ============================================

// Syndicate Trust - Tracks player relationship with the Syndicate
export const syndicateTrust = pgTable(
  "syndicate_trust",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Trust tracking
    trustPoints: integer("trust_points").notNull().default(0),
    trustLevel: syndicateTrustLevelEnum("trust_level")
      .notNull()
      .default("unknown"),

    // Activity tracking
    contractsCompleted: integer("contracts_completed").notNull().default(0),
    contractsFailed: integer("contracts_failed").notNull().default(0),
    totalCreditsEarned: bigint("total_credits_earned", { mode: "number" })
      .notNull()
      .default(0),
    lastInteractionTurn: integer("last_interaction_turn"),

    // Relationship status
    isHostile: boolean("is_hostile").notNull().default(false), // Betrayed Syndicate
    hasReceivedInvitation: boolean("has_received_invitation")
      .notNull()
      .default(false),
    invitationTurn: integer("invitation_turn"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("syndicate_trust_empire_idx").on(table.empireId),
    index("syndicate_trust_game_idx").on(table.gameId),
    index("syndicate_trust_level_idx").on(table.trustLevel),
  ]
);

// Syndicate Contracts - Available and active contracts
export const syndicateContracts = pgTable(
  "syndicate_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Contract holder
    empireId: uuid("empire_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Target (for targeted contracts)
    targetEmpireId: uuid("target_empire_id").references(() => empires.id, {
      onDelete: "set null",
    }),

    // Contract details
    contractType: contractTypeEnum("contract_type").notNull(),
    status: contractStatusEnum("status").notNull().default("available"),

    // Requirements
    minTrustLevel: syndicateTrustLevelEnum("min_trust_level").notNull(),

    // Rewards
    creditReward: integer("credit_reward").notNull(),
    trustReward: integer("trust_reward").notNull(),
    specialReward: varchar("special_reward", { length: 255 }), // e.g., "exclusive_tech"

    // Timing
    createdAtTurn: integer("created_at_turn").notNull(),
    acceptedAtTurn: integer("accepted_at_turn"),
    deadlineTurn: integer("deadline_turn"),
    completedAtTurn: integer("completed_at_turn"),

    // Completion tracking (JSON: { initialTargetNetworth, targetCondition, etc. })
    completionCriteria: json("completion_criteria"),
    completionProgress: json("completion_progress"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("contracts_game_idx").on(table.gameId),
    index("contracts_empire_idx").on(table.empireId),
    index("contracts_target_idx").on(table.targetEmpireId),
    index("contracts_status_idx").on(table.status),
    index("contracts_type_idx").on(table.contractType),
  ]
);

// Pirate Missions - Contract-triggered pirate attacks
export const pirateMissions = pgTable(
  "pirate_missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Contract that triggered this mission
    contractId: uuid("contract_id").references(() => syndicateContracts.id, {
      onDelete: "set null",
    }),

    // Triggering empire (gets salvage rewards)
    triggeringEmpireId: uuid("triggering_empire_id").references(
      () => empires.id,
      { onDelete: "set null" }
    ),

    // Target empire
    targetEmpireId: uuid("target_empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),

    // Mission details
    missionType: contractTypeEnum("mission_type").notNull(), // supply_run, disruption, salvage_op
    status: pirateMissionStatusEnum("status").notNull().default("queued"),

    // Timing
    queuedAtTurn: integer("queued_at_turn").notNull(),
    executionTurn: integer("execution_turn").notNull(),
    completedAtTurn: integer("completed_at_turn"),

    // Results (JSON: { incomeDebuff, sectorsDestroyed, militaryDestroyed, salvageValue })
    results: json("results"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("pirate_missions_game_idx").on(table.gameId),
    index("pirate_missions_contract_idx").on(table.contractId),
    index("pirate_missions_target_idx").on(table.targetEmpireId),
    index("pirate_missions_status_idx").on(table.status),
    index("pirate_missions_execution_idx").on(table.executionTurn),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

// Crafting System Types
export type ResourceInventory = typeof resourceInventory.$inferSelect;
export type NewResourceInventory = typeof resourceInventory.$inferInsert;

export type CraftingQueue = typeof craftingQueue.$inferSelect;
export type NewCraftingQueue = typeof craftingQueue.$inferInsert;

// Syndicate System Types
export type SyndicateTrust = typeof syndicateTrust.$inferSelect;
export type NewSyndicateTrust = typeof syndicateTrust.$inferInsert;

export type SyndicateContract = typeof syndicateContracts.$inferSelect;
export type NewSyndicateContract = typeof syndicateContracts.$inferInsert;

export type PirateMission = typeof pirateMissions.$inferSelect;
export type NewPirateMission = typeof pirateMissions.$inferInsert;
