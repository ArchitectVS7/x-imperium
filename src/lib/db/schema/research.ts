/**
 * Research Domain Schema
 *
 * Contains tables for research system:
 * - researchProgress, unitUpgrades, researchBranchAllocations
 * - Related enums for research branches
 */

import {
  pgTable,
  uuid,
  integer,
  bigint,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { games, empires } from "./core";
import { unitTypeEnum } from "./combat";

// ============================================
// RESEARCH ENUMS
// ============================================

export const researchBranchEnum = pgEnum("research_branch", [
  "military",
  "defense",
  "propulsion",
  "stealth",
  "economy",
  "biotech",
]);

// ============================================
// M3: RESEARCH PROGRESS TABLE
// ============================================

export const researchProgress = pgTable(
  "research_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Research tracking
    researchLevel: integer("research_level").notNull().default(0),
    currentInvestment: bigint("current_investment", { mode: "number" })
      .notNull()
      .default(0),
    requiredInvestment: bigint("required_investment", { mode: "number" })
      .notNull()
      .default(1000),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("research_empire_idx").on(table.empireId),
    index("research_game_idx").on(table.gameId),
  ]
);

// ============================================
// M3: UNIT UPGRADES TABLE
// ============================================

export const unitUpgrades = pgTable(
  "unit_upgrades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Upgrade info
    unitType: unitTypeEnum("unit_type").notNull(),
    upgradeLevel: integer("upgrade_level").notNull().default(0), // 0-3

    // Cost tracking
    totalInvestment: bigint("total_investment", { mode: "number" })
      .notNull()
      .default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("unit_upgrades_empire_idx").on(table.empireId),
    index("unit_upgrades_game_idx").on(table.gameId),
    index("unit_upgrades_unit_type_idx").on(table.unitType),
  ]
);

// ============================================
// RESEARCH BRANCH ALLOCATIONS TABLE
// ============================================

export const researchBranchAllocations = pgTable(
  "research_branch_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Allocation percentages (must sum to 100)
    militaryPercent: integer("military_percent").notNull().default(0),
    defensePercent: integer("defense_percent").notNull().default(0),
    propulsionPercent: integer("propulsion_percent").notNull().default(0),
    stealthPercent: integer("stealth_percent").notNull().default(0),
    economyPercent: integer("economy_percent").notNull().default(0),
    biotechPercent: integer("biotech_percent").notNull().default(0),

    // Cumulative investment (total RP invested in each branch)
    militaryInvestment: bigint("military_investment", { mode: "number" })
      .notNull()
      .default(0),
    defenseInvestment: bigint("defense_investment", { mode: "number" })
      .notNull()
      .default(0),
    propulsionInvestment: bigint("propulsion_investment", { mode: "number" })
      .notNull()
      .default(0),
    stealthInvestment: bigint("stealth_investment", { mode: "number" })
      .notNull()
      .default(0),
    economyInvestment: bigint("economy_investment", { mode: "number" })
      .notNull()
      .default(0),
    biotechInvestment: bigint("biotech_investment", { mode: "number" })
      .notNull()
      .default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("research_branch_empire_idx").on(table.empireId),
    index("research_branch_game_idx").on(table.gameId),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type ResearchProgress = typeof researchProgress.$inferSelect;
export type NewResearchProgress = typeof researchProgress.$inferInsert;

export type UnitUpgrade = typeof unitUpgrades.$inferSelect;
export type NewUnitUpgrade = typeof unitUpgrades.$inferInsert;

export type ResearchBranchAllocation =
  typeof researchBranchAllocations.$inferSelect;
export type NewResearchBranchAllocation =
  typeof researchBranchAllocations.$inferInsert;
