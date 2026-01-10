/**
 * Combat Domain Schema
 *
 * Contains tables for combat system:
 * - attacks, combatLogs
 * - Related enums for units and combat phases
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
import { games, empires, sectors } from "./core";

// ============================================
// COMBAT ENUMS
// ============================================

export const unitTypeEnum = pgEnum("unit_type", [
  "soldiers",
  "fighters",
  "light_cruisers",
  "heavy_cruisers",
  "carriers",
  "stations",
  "covert_agents",
]);

export const combatPhaseEnum = pgEnum("combat_phase", [
  "space",
  "orbital",
  "ground",
]);

export const attackTypeEnum = pgEnum("attack_type", ["invasion", "guerilla"]);

export const combatOutcomeEnum = pgEnum("combat_outcome", [
  "attacker_victory",
  "defender_victory",
  "retreat",
  "stalemate",
]);

// ============================================
// M4: ATTACKS TABLE
// ============================================

export const attacks = pgTable(
  "attacks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Combatants
    attackerId: uuid("attacker_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    defenderId: uuid("defender_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    targetSectorId: uuid("target_sector_id").references(() => sectors.id, {
      onDelete: "set null",
    }),

    // Attack info
    turn: integer("turn").notNull(),
    attackType: attackTypeEnum("attack_type").notNull().default("invasion"),

    // Attacker forces
    attackerSoldiers: integer("attacker_soldiers").notNull().default(0),
    attackerFighters: integer("attacker_fighters").notNull().default(0),
    attackerLightCruisers: integer("attacker_light_cruisers")
      .notNull()
      .default(0),
    attackerHeavyCruisers: integer("attacker_heavy_cruisers")
      .notNull()
      .default(0),
    attackerCarriers: integer("attacker_carriers").notNull().default(0),
    attackerStations: integer("attacker_stations").notNull().default(0),

    // Defender forces
    defenderSoldiers: integer("defender_soldiers").notNull().default(0),
    defenderFighters: integer("defender_fighters").notNull().default(0),
    defenderLightCruisers: integer("defender_light_cruisers")
      .notNull()
      .default(0),
    defenderHeavyCruisers: integer("defender_heavy_cruisers")
      .notNull()
      .default(0),
    defenderCarriers: integer("defender_carriers").notNull().default(0),
    defenderStations: integer("defender_stations").notNull().default(0),

    // Combat power
    attackerPower: decimal("attacker_power", {
      precision: 12,
      scale: 2,
    }).notNull(),
    defenderPower: decimal("defender_power", {
      precision: 12,
      scale: 2,
    }).notNull(),

    // Outcome
    outcome: combatOutcomeEnum("outcome").notNull(),
    sectorCaptured: boolean("sector_captured").notNull().default(false),

    // Casualty summary
    attackerCasualties: json("attacker_casualties").notNull(), // { soldiers: N, fighters: N, ... }
    defenderCasualties: json("defender_casualties").notNull(),

    // Army effectiveness changes
    attackerEffectivenessChange: decimal("attacker_effectiveness_change", {
      precision: 5,
      scale: 2,
    }),
    defenderEffectivenessChange: decimal("defender_effectiveness_change", {
      precision: 5,
      scale: 2,
    }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("attacks_game_idx").on(table.gameId),
    index("attacks_game_turn_idx").on(table.gameId, table.turn),
    index("attacks_attacker_idx").on(table.attackerId),
    index("attacks_defender_idx").on(table.defenderId),
    index("attacks_turn_idx").on(table.turn),
  ]
);

// ============================================
// M4: COMBAT LOGS TABLE (Phase-by-Phase)
// ============================================

export const combatLogs = pgTable(
  "combat_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attackId: uuid("attack_id")
      .notNull()
      .references(() => attacks.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Phase info
    phase: combatPhaseEnum("phase").notNull(),
    phaseNumber: integer("phase_number").notNull(), // 1, 2, 3

    // Forces at start of phase
    attackerUnits: json("attacker_units").notNull(),
    defenderUnits: json("defender_units").notNull(),

    // Phase calculations
    attackerPhasePower: decimal("attacker_phase_power", {
      precision: 12,
      scale: 2,
    }),
    defenderPhasePower: decimal("defender_phase_power", {
      precision: 12,
      scale: 2,
    }),

    // Phase outcome
    phaseWinner: varchar("phase_winner", { length: 20 }), // 'attacker', 'defender', 'draw'
    phaseCasualties: json("phase_casualties").notNull(),

    // Narrative
    description: varchar("description", { length: 1000 }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("combat_logs_attack_idx").on(table.attackId),
    index("combat_logs_game_idx").on(table.gameId),
    index("combat_logs_phase_idx").on(table.phase),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type Attack = typeof attacks.$inferSelect;
export type NewAttack = typeof attacks.$inferInsert;

export type CombatLog = typeof combatLogs.$inferSelect;
export type NewCombatLog = typeof combatLogs.$inferInsert;
