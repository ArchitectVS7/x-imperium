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

    // M7: Diplomacy reputation (0-100, starts at 50 = neutral)
    reputation: integer("reputation").notNull().default(50),

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
