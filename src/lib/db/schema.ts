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
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
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

export const planetTypeEnum = pgEnum("planet_type", [
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

export const victoryTypeEnum = pgEnum("victory_type", [
  "conquest",
  "economic",
  "diplomatic",
  "research",
  "military",
  "survival",
]);

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

export const attackTypeEnum = pgEnum("attack_type", [
  "invasion",
  "guerilla",
]);

export const combatOutcomeEnum = pgEnum("combat_outcome", [
  "attacker_victory",
  "defender_victory",
  "retreat",
  "stalemate",
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
    planetCount: integer("planet_count").notNull().default(9),

    // Game state
    isEliminated: boolean("is_eliminated").notNull().default(false),
    eliminatedAtTurn: integer("eliminated_at_turn"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("empires_game_idx").on(table.gameId),
    index("empires_type_idx").on(table.type),
    index("empires_networth_idx").on(table.networth),
  ]
);

// ============================================
// PLANETS TABLE
// ============================================

export const planets = pgTable(
  "planets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empireId: uuid("empire_id")
      .notNull()
      .references(() => empires.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Planet info
    type: planetTypeEnum("type").notNull(),
    name: varchar("name", { length: 255 }),

    // Production rates (base values from PRD)
    productionRate: decimal("production_rate", { precision: 10, scale: 2 }).notNull(),

    // Acquisition info
    purchasePrice: integer("purchase_price").notNull(),
    acquiredAtTurn: integer("acquired_at_turn").notNull().default(1),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("planets_empire_idx").on(table.empireId),
    index("planets_game_idx").on(table.gameId),
    index("planets_type_idx").on(table.type),
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
    incomeMultiplier: decimal("income_multiplier", { precision: 3, scale: 2 }).notNull(),

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
    targetPlanetId: uuid("target_planet_id").references(() => planets.id, {
      onDelete: "set null",
    }),

    // Attack info
    turn: integer("turn").notNull(),
    attackType: attackTypeEnum("attack_type").notNull().default("invasion"),

    // Attacker forces
    attackerSoldiers: integer("attacker_soldiers").notNull().default(0),
    attackerFighters: integer("attacker_fighters").notNull().default(0),
    attackerLightCruisers: integer("attacker_light_cruisers").notNull().default(0),
    attackerHeavyCruisers: integer("attacker_heavy_cruisers").notNull().default(0),
    attackerCarriers: integer("attacker_carriers").notNull().default(0),
    attackerStations: integer("attacker_stations").notNull().default(0),

    // Defender forces
    defenderSoldiers: integer("defender_soldiers").notNull().default(0),
    defenderFighters: integer("defender_fighters").notNull().default(0),
    defenderLightCruisers: integer("defender_light_cruisers").notNull().default(0),
    defenderHeavyCruisers: integer("defender_heavy_cruisers").notNull().default(0),
    defenderCarriers: integer("defender_carriers").notNull().default(0),
    defenderStations: integer("defender_stations").notNull().default(0),

    // Combat power
    attackerPower: decimal("attacker_power", { precision: 12, scale: 2 }).notNull(),
    defenderPower: decimal("defender_power", { precision: 12, scale: 2 }).notNull(),

    // Outcome
    outcome: combatOutcomeEnum("outcome").notNull(),
    planetCaptured: boolean("planet_captured").notNull().default(false),

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
    attackerPhasePower: decimal("attacker_phase_power", { precision: 12, scale: 2 }),
    defenderPhasePower: decimal("defender_phase_power", { precision: 12, scale: 2 }),

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
// RELATIONS
// ============================================

export const gamesRelations = relations(games, ({ many }) => ({
  empires: many(empires),
  planets: many(planets),
  saves: many(gameSaves),
  performanceLogs: many(performanceLogs),
}));

export const empiresRelations = relations(empires, ({ one, many }) => ({
  game: one(games, {
    fields: [empires.gameId],
    references: [games.id],
  }),
  planets: many(planets),
  civilStatusHistory: many(civilStatusHistory),
  buildQueue: many(buildQueue),
  researchProgress: many(researchProgress),
  unitUpgrades: many(unitUpgrades),
  attacksAsAttacker: many(attacks, { relationName: "attacker" }),
  attacksAsDefender: many(attacks, { relationName: "defender" }),
}));

export const planetsRelations = relations(planets, ({ one }) => ({
  empire: one(empires, {
    fields: [planets.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [planets.gameId],
    references: [games.id],
  }),
}));

export const gameSavesRelations = relations(gameSaves, ({ one }) => ({
  game: one(games, {
    fields: [gameSaves.gameId],
    references: [games.id],
  }),
}));

export const performanceLogsRelations = relations(performanceLogs, ({ one }) => ({
  game: one(games, {
    fields: [performanceLogs.gameId],
    references: [games.id],
  }),
}));

export const civilStatusHistoryRelations = relations(
  civilStatusHistory,
  ({ one }) => ({
    empire: one(empires, {
      fields: [civilStatusHistory.empireId],
      references: [empires.id],
    }),
    game: one(games, {
      fields: [civilStatusHistory.gameId],
      references: [games.id],
    }),
  })
);

export const buildQueueRelations = relations(buildQueue, ({ one }) => ({
  empire: one(empires, {
    fields: [buildQueue.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [buildQueue.gameId],
    references: [games.id],
  }),
}));

export const researchProgressRelations = relations(researchProgress, ({ one }) => ({
  empire: one(empires, {
    fields: [researchProgress.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [researchProgress.gameId],
    references: [games.id],
  }),
}));

export const unitUpgradesRelations = relations(unitUpgrades, ({ one }) => ({
  empire: one(empires, {
    fields: [unitUpgrades.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [unitUpgrades.gameId],
    references: [games.id],
  }),
}));

export const attacksRelations = relations(attacks, ({ one, many }) => ({
  game: one(games, {
    fields: [attacks.gameId],
    references: [games.id],
  }),
  attacker: one(empires, {
    fields: [attacks.attackerId],
    references: [empires.id],
    relationName: "attacker",
  }),
  defender: one(empires, {
    fields: [attacks.defenderId],
    references: [empires.id],
    relationName: "defender",
  }),
  targetPlanet: one(planets, {
    fields: [attacks.targetPlanetId],
    references: [planets.id],
  }),
  combatLogs: many(combatLogs),
}));

export const combatLogsRelations = relations(combatLogs, ({ one }) => ({
  attack: one(attacks, {
    fields: [combatLogs.attackId],
    references: [attacks.id],
  }),
  game: one(games, {
    fields: [combatLogs.gameId],
    references: [games.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type Empire = typeof empires.$inferSelect;
export type NewEmpire = typeof empires.$inferInsert;

export type Planet = typeof planets.$inferSelect;
export type NewPlanet = typeof planets.$inferInsert;

export type GameSave = typeof gameSaves.$inferSelect;
export type NewGameSave = typeof gameSaves.$inferInsert;

export type PerformanceLog = typeof performanceLogs.$inferSelect;
export type NewPerformanceLog = typeof performanceLogs.$inferInsert;

export type CivilStatusHistory = typeof civilStatusHistory.$inferSelect;
export type NewCivilStatusHistory = typeof civilStatusHistory.$inferInsert;

export type BuildQueue = typeof buildQueue.$inferSelect;
export type NewBuildQueue = typeof buildQueue.$inferInsert;

export type ResearchProgress = typeof researchProgress.$inferSelect;
export type NewResearchProgress = typeof researchProgress.$inferInsert;

export type UnitUpgrade = typeof unitUpgrades.$inferSelect;
export type NewUnitUpgrade = typeof unitUpgrades.$inferInsert;

export type Attack = typeof attacks.$inferSelect;
export type NewAttack = typeof attacks.$inferInsert;

export type CombatLog = typeof combatLogs.$inferSelect;
export type NewCombatLog = typeof combatLogs.$inferInsert;
