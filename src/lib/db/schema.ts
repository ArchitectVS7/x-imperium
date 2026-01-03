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
  "tier1_elite_scripted",
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
  "industrial", // NEW: Processes Tier 0 → Tier 1 resources
]);

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
  "unknown",     // Level 0: Must complete intro contract
  "associate",   // Level 1: Basic access
  "runner",      // Level 2: Pirate contracts
  "soldier",     // Level 3: Player contracts
  "captain",     // Level 4: Targeted contracts
  "lieutenant",  // Level 5: Tier 3 systems
  "underboss",   // Level 6: Chemical weapons
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
// RESEARCH BRANCH ENUM
// ============================================

export const researchBranchEnum = pgEnum("research_branch", [
  "military",
  "defense",
  "propulsion",
  "stealth",
  "economy",
  "biotech",
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

// Game mode: oneshot (quick games) vs campaign (multi-session)
export const gameModeEnum = pgEnum("game_mode", [
  "oneshot",   // 10-25 empires, 50-100 turns, single session
  "campaign",  // 50-100 empires, 200+ turns, multi-session
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


// Game Configuration Override Types
export const gameConfigTypeEnum = pgEnum("game_config_type", [
  "combat",
  "units",
  "archetypes",
  "resources",
  "victory",
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

    // Game mode and session tracking
    gameMode: gameModeEnum("game_mode").notNull().default("oneshot"),
    sessionCount: integer("session_count").notNull().default(0),
    lastSessionAt: timestamp("last_session_at"),

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
// GAME SESSIONS TABLE
// ============================================
// Tracks individual play sessions for campaign mode
// Auto-save only - NO manual save/load to prevent save-scumming

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    sessionNumber: integer("session_number").notNull(),

    // Turn range for this session
    startTurn: integer("start_turn").notNull(),
    endTurn: integer("end_turn"),

    // Timestamps
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),

    // Session summary (for session recaps)
    empiresEliminated: integer("empires_eliminated").notNull().default(0),
    notableEvents: json("notable_events").$type<string[]>().default([]),
  },
  (table) => [
    index("game_sessions_game_id_idx").on(table.gameId),
    index("game_sessions_session_number_idx").on(table.gameId, table.sessionNumber),
  ]
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
    /** LLM-enabled flag for Tier 1 bots (10 elite bots use LLM API) */
    llmEnabled: boolean("llm_enabled").notNull().default(false),

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
    planetCount: integer("planet_count").notNull().default(5), // Reduced from 9 for faster eliminations

    // M7: Diplomacy reputation (0-100, starts at 50 = neutral)
    reputation: integer("reputation").notNull().default(50),

    // Game state
    isEliminated: boolean("is_eliminated").notNull().default(false),
    eliminatedAtTurn: integer("eliminated_at_turn"),

    // M7: Boss detection (dominant empire tracking)
    isBoss: boolean("is_boss").notNull().default(false),
    bossEmergenceTurn: integer("boss_emergence_turn"),

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
// GAME CONFIGS TABLE (Per-Game Overrides)
// ============================================

export const gameConfigs = pgTable(
  "game_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // Configuration type
    configType: gameConfigTypeEnum("config_type").notNull(),

    // Override values (JSONB for flexibility)
    overrides: json("overrides").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("game_configs_game_idx").on(table.gameId),
    index("game_configs_type_idx").on(table.configType),
    index("game_configs_game_type_idx").on(table.gameId, table.configType),
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
  sessions: many(gameSessions),
  performanceLogs: many(performanceLogs),
  // Geography System Relations
  galaxyRegions: many(galaxyRegions),
  regionConnections: many(regionConnections),
  empireInfluences: many(empireInfluence),
  gameConfigs: many(gameConfigs),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  game: one(games, {
    fields: [gameSessions.gameId],
    references: [games.id],
  }),
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
  // Crafting System Relations
  resourceInventory: many(resourceInventory),
  craftingQueue: many(craftingQueue),
  researchBranchAllocations: many(researchBranchAllocations),
  // Syndicate System Relations
  syndicateTrust: many(syndicateTrust),
  syndicateContracts: many(syndicateContracts, { relationName: "contractHolder" }),
  syndicateContractsAsTarget: many(syndicateContracts, { relationName: "contractTarget" }),
  // Geography System Relations
  influence: many(empireInfluence),
  discoveredWormholes: many(regionConnections, { relationName: "wormholeDiscoverer" }),
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



export const gameConfigsRelations = relations(gameConfigs, ({ one }) => ({
  game: one(games, {
    fields: [gameConfigs.gameId],
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
// M7: MARKET & DIPLOMACY ENUMS
// ============================================

export const resourceTypeEnum = pgEnum("resource_type", [
  "food",
  "ore",
  "petroleum",
  "credits",
]);

export const marketOrderTypeEnum = pgEnum("market_order_type", [
  "buy",
  "sell",
]);

export const marketOrderStatusEnum = pgEnum("market_order_status", [
  "pending",
  "completed",
  "cancelled",
]);

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
// M8: MESSAGE SYSTEM ENUMS
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
// M10: EMOTIONAL STATES ENUMS
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
  "planet_captured",
  "planet_lost",
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

// ============================================
// M11: MID-GAME SYSTEM ENUMS
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
// M12: LLM BOT ENUMS
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
// GEOGRAPHY SYSTEM ENUMS
// ============================================

export const regionTypeEnum = pgEnum("region_type", [
  "core",      // Central, resource-rich, heavily contested
  "inner",     // Developed, stable
  "outer",     // Frontier, developing
  "rim",       // Edge of galaxy, sparse
  "void",      // Dangerous, few empires
]);

export const connectionTypeEnum = pgEnum("connection_type", [
  "adjacent",      // Normal border (1.0x force cost)
  "trade_route",   // Established path (1.0x cost, trade bonus)
  "wormhole",      // Shortcut to distant region (1.0x cost)
  "hazardous",     // Difficult passage (1.5x force cost)
  "contested",     // Active conflict zone (1.25x cost, random events)
]);

export const wormholeStatusEnum = pgEnum("wormhole_status", [
  "undiscovered",  // Exists but no one knows
  "discovered",    // Found by an empire
  "stabilized",    // Improved for regular use
  "collapsed",     // No longer usable
  "constructing",  // Player is building this wormhole (M6.3)
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
    collapseChance: decimal("collapse_chance", { precision: 4, scale: 2 })
      .default("0.00"), // 0.0-1.0 per turn

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
    bonusInfluenceRadius: integer("bonus_influence_radius").notNull().default(0), // From planets/tech
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
    currentPrice: decimal("current_price", { precision: 12, scale: 2 }).notNull(),
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
    pricePerUnit: decimal("price_per_unit", { precision: 12, scale: 2 }).notNull(),
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
    index("messages_channel_idx").on(table.channel),
    index("messages_turn_idx").on(table.turn),
    index("messages_is_read_idx").on(table.isRead),
  ]
);

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
    context: json("context"), // { planetName, creditsAmount, unitType, etc. }

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
    totalNetworth: bigint("total_networth", { mode: "number" }).notNull().default(0),
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
    costUsd: decimal("cost_usd", { precision: 10, scale: 6 }).notNull().default("0.000000"),

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
    costUsd: decimal("cost_usd", { precision: 10, scale: 6 }).notNull().default("0.000000"),

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

// Research Branch Allocations - Tracks RP investment in branches
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
    militaryInvestment: bigint("military_investment", { mode: "number" }).notNull().default(0),
    defenseInvestment: bigint("defense_investment", { mode: "number" }).notNull().default(0),
    propulsionInvestment: bigint("propulsion_investment", { mode: "number" }).notNull().default(0),
    stealthInvestment: bigint("stealth_investment", { mode: "number" }).notNull().default(0),
    economyInvestment: bigint("economy_investment", { mode: "number" }).notNull().default(0),
    biotechInvestment: bigint("biotech_investment", { mode: "number" }).notNull().default(0),

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
    trustLevel: syndicateTrustLevelEnum("trust_level").notNull().default("unknown"),

    // Activity tracking
    contractsCompleted: integer("contracts_completed").notNull().default(0),
    contractsFailed: integer("contracts_failed").notNull().default(0),
    totalCreditsEarned: bigint("total_credits_earned", { mode: "number" }).notNull().default(0),
    lastInteractionTurn: integer("last_interaction_turn"),

    // Relationship status
    isHostile: boolean("is_hostile").notNull().default(false), // Betrayed Syndicate
    hasReceivedInvitation: boolean("has_received_invitation").notNull().default(false),
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
    empireId: uuid("empire_id").references(() => empires.id, { onDelete: "set null" }),

    // Target (for targeted contracts)
    targetEmpireId: uuid("target_empire_id").references(() => empires.id, { onDelete: "set null" }),

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
    contractId: uuid("contract_id").references(() => syndicateContracts.id, { onDelete: "set null" }),

    // Triggering empire (gets salvage rewards)
    triggeringEmpireId: uuid("triggering_empire_id").references(() => empires.id, { onDelete: "set null" }),

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

    // Results (JSON: { incomeDebuff, planetsDestroyed, militaryDestroyed, salvageValue })
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
// M7: MARKET & DIPLOMACY RELATIONS
// ============================================

export const marketPricesRelations = relations(marketPrices, ({ one }) => ({
  game: one(games, {
    fields: [marketPrices.gameId],
    references: [games.id],
  }),
}));

export const marketOrdersRelations = relations(marketOrders, ({ one }) => ({
  game: one(games, {
    fields: [marketOrders.gameId],
    references: [games.id],
  }),
  empire: one(empires, {
    fields: [marketOrders.empireId],
    references: [empires.id],
  }),
}));

export const treatiesRelations = relations(treaties, ({ one, many }) => ({
  game: one(games, {
    fields: [treaties.gameId],
    references: [games.id],
  }),
  proposer: one(empires, {
    fields: [treaties.proposerId],
    references: [empires.id],
    relationName: "treatyProposer",
  }),
  recipient: one(empires, {
    fields: [treaties.recipientId],
    references: [empires.id],
    relationName: "treatyRecipient",
  }),
  brokenBy: one(empires, {
    fields: [treaties.brokenById],
    references: [empires.id],
    relationName: "treatyBreaker",
  }),
  reputationLogs: many(reputationLog),
}));

export const reputationLogRelations = relations(reputationLog, ({ one }) => ({
  game: one(games, {
    fields: [reputationLog.gameId],
    references: [games.id],
  }),
  empire: one(empires, {
    fields: [reputationLog.empireId],
    references: [empires.id],
  }),
  affectedEmpire: one(empires, {
    fields: [reputationLog.affectedEmpireId],
    references: [empires.id],
    relationName: "reputationAffected",
  }),
  treaty: one(treaties, {
    fields: [reputationLog.treatyId],
    references: [treaties.id],
  }),
}));

// ============================================
// M8: MESSAGE RELATIONS
// ============================================

export const messagesRelations = relations(messages, ({ one }) => ({
  game: one(games, {
    fields: [messages.gameId],
    references: [games.id],
  }),
  sender: one(empires, {
    fields: [messages.senderId],
    references: [empires.id],
    relationName: "messageSender",
  }),
  recipient: one(empires, {
    fields: [messages.recipientId],
    references: [empires.id],
    relationName: "messageRecipient",
  }),
}));

// ============================================
// M10: BOT MEMORY & EMOTIONAL RELATIONS
// ============================================

export const botMemoriesRelations = relations(botMemories, ({ one }) => ({
  game: one(games, {
    fields: [botMemories.gameId],
    references: [games.id],
  }),
  empire: one(empires, {
    fields: [botMemories.empireId],
    references: [empires.id],
    relationName: "memoryHolder",
  }),
  targetEmpire: one(empires, {
    fields: [botMemories.targetEmpireId],
    references: [empires.id],
    relationName: "memoryTarget",
  }),
}));

export const botEmotionalStatesRelations = relations(botEmotionalStates, ({ one }) => ({
  game: one(games, {
    fields: [botEmotionalStates.gameId],
    references: [games.id],
  }),
  empire: one(empires, {
    fields: [botEmotionalStates.empireId],
    references: [empires.id],
  }),
}));

// ============================================
// M11: GALACTIC EVENTS & COALITION RELATIONS
// ============================================

export const galacticEventsRelations = relations(galacticEvents, ({ one }) => ({
  game: one(games, {
    fields: [galacticEvents.gameId],
    references: [games.id],
  }),
  affectedEmpire: one(empires, {
    fields: [galacticEvents.affectedEmpireId],
    references: [empires.id],
  }),
}));

export const coalitionsRelations = relations(coalitions, ({ one, many }) => ({
  game: one(games, {
    fields: [coalitions.gameId],
    references: [games.id],
  }),
  leader: one(empires, {
    fields: [coalitions.leaderId],
    references: [empires.id],
    relationName: "coalitionLeader",
  }),
  members: many(coalitionMembers),
}));

export const coalitionMembersRelations = relations(coalitionMembers, ({ one }) => ({
  coalition: one(coalitions, {
    fields: [coalitionMembers.coalitionId],
    references: [coalitions.id],
  }),
  empire: one(empires, {
    fields: [coalitionMembers.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [coalitionMembers.gameId],
    references: [games.id],
  }),
}));

// ============================================
// M12: LLM USAGE RELATIONS
// ============================================

export const llmUsageLogsRelations = relations(llmUsageLogs, ({ one }) => ({
  game: one(games, {
    fields: [llmUsageLogs.gameId],
    references: [games.id],
  }),
  empire: one(empires, {
    fields: [llmUsageLogs.empireId],
    references: [empires.id],
  }),
}));

// ============================================
// CRAFTING SYSTEM RELATIONS
// ============================================

export const resourceInventoryRelations = relations(resourceInventory, ({ one }) => ({
  empire: one(empires, {
    fields: [resourceInventory.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [resourceInventory.gameId],
    references: [games.id],
  }),
}));

export const craftingQueueRelations = relations(craftingQueue, ({ one }) => ({
  empire: one(empires, {
    fields: [craftingQueue.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [craftingQueue.gameId],
    references: [games.id],
  }),
}));

export const researchBranchAllocationsRelations = relations(researchBranchAllocations, ({ one }) => ({
  empire: one(empires, {
    fields: [researchBranchAllocations.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [researchBranchAllocations.gameId],
    references: [games.id],
  }),
}));

// ============================================
// SYNDICATE SYSTEM RELATIONS
// ============================================

export const syndicateTrustRelations = relations(syndicateTrust, ({ one }) => ({
  empire: one(empires, {
    fields: [syndicateTrust.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [syndicateTrust.gameId],
    references: [games.id],
  }),
}));

export const syndicateContractsRelations = relations(syndicateContracts, ({ one, many }) => ({
  game: one(games, {
    fields: [syndicateContracts.gameId],
    references: [games.id],
  }),
  empire: one(empires, {
    fields: [syndicateContracts.empireId],
    references: [empires.id],
    relationName: "contractHolder",
  }),
  targetEmpire: one(empires, {
    fields: [syndicateContracts.targetEmpireId],
    references: [empires.id],
    relationName: "contractTarget",
  }),
  pirateMissions: many(pirateMissions),
}));

export const pirateMissionsRelations = relations(pirateMissions, ({ one }) => ({
  game: one(games, {
    fields: [pirateMissions.gameId],
    references: [games.id],
  }),
  contract: one(syndicateContracts, {
    fields: [pirateMissions.contractId],
    references: [syndicateContracts.id],
  }),
  triggeringEmpire: one(empires, {
    fields: [pirateMissions.triggeringEmpireId],
    references: [empires.id],
    relationName: "pirateTrigger",
  }),
  targetEmpire: one(empires, {
    fields: [pirateMissions.targetEmpireId],
    references: [empires.id],
    relationName: "pirateTarget",
  }),
}));

// ============================================
// GEOGRAPHY SYSTEM RELATIONS
// ============================================

export const galaxyRegionsRelations = relations(galaxyRegions, ({ one, many }) => ({
  game: one(games, {
    fields: [galaxyRegions.gameId],
    references: [games.id],
  }),
  connectionsFrom: many(regionConnections, { relationName: "fromRegion" }),
  connectionsTo: many(regionConnections, { relationName: "toRegion" }),
  homeEmpires: many(empireInfluence, { relationName: "homeRegion" }),
  primaryEmpires: many(empireInfluence, { relationName: "primaryRegion" }),
}));

export const regionConnectionsRelations = relations(regionConnections, ({ one }) => ({
  game: one(games, {
    fields: [regionConnections.gameId],
    references: [games.id],
  }),
  fromRegion: one(galaxyRegions, {
    fields: [regionConnections.fromRegionId],
    references: [galaxyRegions.id],
    relationName: "fromRegion",
  }),
  toRegion: one(galaxyRegions, {
    fields: [regionConnections.toRegionId],
    references: [galaxyRegions.id],
    relationName: "toRegion",
  }),
  discoveredBy: one(empires, {
    fields: [regionConnections.discoveredByEmpireId],
    references: [empires.id],
    relationName: "wormholeDiscoverer",
  }),
}));

export const empireInfluenceRelations = relations(empireInfluence, ({ one }) => ({
  empire: one(empires, {
    fields: [empireInfluence.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [empireInfluence.gameId],
    references: [games.id],
  }),
  homeRegion: one(galaxyRegions, {
    fields: [empireInfluence.homeRegionId],
    references: [galaxyRegions.id],
    relationName: "homeRegion",
  }),
  primaryRegion: one(galaxyRegions, {
    fields: [empireInfluence.primaryRegionId],
    references: [galaxyRegions.id],
    relationName: "primaryRegion",
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;

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

export type MarketPrice = typeof marketPrices.$inferSelect;
export type NewMarketPrice = typeof marketPrices.$inferInsert;

export type MarketOrder = typeof marketOrders.$inferSelect;
export type NewMarketOrder = typeof marketOrders.$inferInsert;

export type Treaty = typeof treaties.$inferSelect;
export type NewTreaty = typeof treaties.$inferInsert;

export type ReputationLog = typeof reputationLog.$inferSelect;
export type NewReputationLog = typeof reputationLog.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type BotMemory = typeof botMemories.$inferSelect;
export type NewBotMemory = typeof botMemories.$inferInsert;

export type BotEmotionalState = typeof botEmotionalStates.$inferSelect;
export type NewBotEmotionalState = typeof botEmotionalStates.$inferInsert;

export type GalacticEvent = typeof galacticEvents.$inferSelect;
export type NewGalacticEvent = typeof galacticEvents.$inferInsert;

export type Coalition = typeof coalitions.$inferSelect;
export type NewCoalition = typeof coalitions.$inferInsert;

export type CoalitionMember = typeof coalitionMembers.$inferSelect;
export type NewCoalitionMember = typeof coalitionMembers.$inferInsert;

export type LlmUsageLog = typeof llmUsageLogs.$inferSelect;
export type NewLlmUsageLog = typeof llmUsageLogs.$inferInsert;

// Crafting System Types
export type ResourceInventory = typeof resourceInventory.$inferSelect;
export type NewResourceInventory = typeof resourceInventory.$inferInsert;

export type CraftingQueue = typeof craftingQueue.$inferSelect;
export type NewCraftingQueue = typeof craftingQueue.$inferInsert;

export type ResearchBranchAllocation = typeof researchBranchAllocations.$inferSelect;
export type NewResearchBranchAllocation = typeof researchBranchAllocations.$inferInsert;

// Syndicate System Types
export type SyndicateTrust = typeof syndicateTrust.$inferSelect;
export type NewSyndicateTrust = typeof syndicateTrust.$inferInsert;

export type SyndicateContract = typeof syndicateContracts.$inferSelect;
export type NewSyndicateContract = typeof syndicateContracts.$inferInsert;

export type PirateMission = typeof pirateMissions.$inferSelect;
export type NewPirateMission = typeof pirateMissions.$inferInsert;

// Geography System Types
export type GalaxyRegion = typeof galaxyRegions.$inferSelect;
export type NewGalaxyRegion = typeof galaxyRegions.$inferInsert;

export type RegionConnection = typeof regionConnections.$inferSelect;
export type NewRegionConnection = typeof regionConnections.$inferInsert;

export type EmpireInfluence = typeof empireInfluence.$inferSelect;
export type NewEmpireInfluence = typeof empireInfluence.$inferInsert;
