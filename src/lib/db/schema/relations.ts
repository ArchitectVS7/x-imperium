/**
 * Relations Module
 *
 * Defines all Drizzle ORM relations between tables.
 * Imports tables from domain-specific modules.
 */

import { relations } from "drizzle-orm";

// Core tables
import {
  games,
  gameSessions,
  empires,
  sectors,
  gameSaves,
  gameConfigs,
  performanceLogs,
  civilStatusHistory,
} from "./core";

// Combat tables
import { attacks, combatLogs } from "./combat";

// Economy tables
import { marketPrices, marketOrders, buildQueue } from "./economy";

// Diplomacy tables
import { treaties, reputationLog, messages } from "./diplomacy";

// Research tables
import {
  researchProgress,
  unitUpgrades,
  researchBranchAllocations,
} from "./research";

// Bots tables
import { botMemories, botEmotionalStates, botTells } from "./bots";

// Crafting tables
import {
  resourceInventory,
  craftingQueue,
  syndicateTrust,
  syndicateContracts,
  pirateMissions,
} from "./crafting";

// Events tables
import { galacticEvents, coalitions, coalitionMembers } from "./events";

// Geography tables
import { galaxyRegions, regionConnections, empireInfluence } from "./geography";

// LLM tables
import { llmUsageLogs, llmDecisionCache } from "./llm";

// ============================================
// CORE RELATIONS
// ============================================

export const gamesRelations = relations(games, ({ many }) => ({
  empires: many(empires),
  sectors: many(sectors),
  saves: many(gameSaves),
  sessions: many(gameSessions),
  performanceLogs: many(performanceLogs),
  // Geography System Relations
  galaxyRegions: many(galaxyRegions),
  regionConnections: many(regionConnections),
  empireInfluences: many(empireInfluence),
  gameConfigs: many(gameConfigs),
  // Bot Tell System Relations
  botTells: many(botTells),
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
  sectors: many(sectors),
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
  syndicateContractsAsTarget: many(syndicateContracts, {
    relationName: "contractTarget",
  }),
  // Geography System Relations
  influence: many(empireInfluence),
  discoveredWormholes: many(regionConnections, {
    relationName: "wormholeDiscoverer",
  }),
  // Bot Tell System Relations
  emittedTells: many(botTells, { relationName: "tellEmitter" }),
  targetedByTells: many(botTells, { relationName: "tellTarget" }),
}));

export const sectorsRelations = relations(sectors, ({ one }) => ({
  empire: one(empires, {
    fields: [sectors.empireId],
    references: [empires.id],
  }),
  game: one(games, {
    fields: [sectors.gameId],
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

// ============================================
// COMBAT RELATIONS
// ============================================

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
  targetSector: one(sectors, {
    fields: [attacks.targetSectorId],
    references: [sectors.id],
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
// ECONOMY RELATIONS
// ============================================

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

// ============================================
// DIPLOMACY RELATIONS
// ============================================

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
// RESEARCH RELATIONS
// ============================================

export const researchProgressRelations = relations(
  researchProgress,
  ({ one }) => ({
    empire: one(empires, {
      fields: [researchProgress.empireId],
      references: [empires.id],
    }),
    game: one(games, {
      fields: [researchProgress.gameId],
      references: [games.id],
    }),
  })
);

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

export const researchBranchAllocationsRelations = relations(
  researchBranchAllocations,
  ({ one }) => ({
    empire: one(empires, {
      fields: [researchBranchAllocations.empireId],
      references: [empires.id],
    }),
    game: one(games, {
      fields: [researchBranchAllocations.gameId],
      references: [games.id],
    }),
  })
);

// ============================================
// BOT RELATIONS
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

export const botEmotionalStatesRelations = relations(
  botEmotionalStates,
  ({ one }) => ({
    game: one(games, {
      fields: [botEmotionalStates.gameId],
      references: [games.id],
    }),
    empire: one(empires, {
      fields: [botEmotionalStates.empireId],
      references: [empires.id],
    }),
  })
);

export const botTellsRelations = relations(botTells, ({ one }) => ({
  game: one(games, {
    fields: [botTells.gameId],
    references: [games.id],
  }),
  empire: one(empires, {
    fields: [botTells.empireId],
    references: [empires.id],
    relationName: "tellEmitter",
  }),
  targetEmpire: one(empires, {
    fields: [botTells.targetEmpireId],
    references: [empires.id],
    relationName: "tellTarget",
  }),
}));

// ============================================
// CRAFTING RELATIONS
// ============================================

export const resourceInventoryRelations = relations(
  resourceInventory,
  ({ one }) => ({
    empire: one(empires, {
      fields: [resourceInventory.empireId],
      references: [empires.id],
    }),
    game: one(games, {
      fields: [resourceInventory.gameId],
      references: [games.id],
    }),
  })
);

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

export const syndicateContractsRelations = relations(
  syndicateContracts,
  ({ one, many }) => ({
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
  })
);

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
// EVENTS RELATIONS
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

export const coalitionMembersRelations = relations(
  coalitionMembers,
  ({ one }) => ({
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
  })
);

// ============================================
// GEOGRAPHY RELATIONS
// ============================================

export const galaxyRegionsRelations = relations(
  galaxyRegions,
  ({ one, many }) => ({
    game: one(games, {
      fields: [galaxyRegions.gameId],
      references: [games.id],
    }),
    connectionsFrom: many(regionConnections, { relationName: "fromRegion" }),
    connectionsTo: many(regionConnections, { relationName: "toRegion" }),
    homeEmpires: many(empireInfluence, { relationName: "homeRegion" }),
    primaryEmpires: many(empireInfluence, { relationName: "primaryRegion" }),
  })
);

export const regionConnectionsRelations = relations(
  regionConnections,
  ({ one }) => ({
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
  })
);

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
// LLM RELATIONS
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

export const llmDecisionCacheRelations = relations(
  llmDecisionCache,
  ({ one }) => ({
    game: one(games, {
      fields: [llmDecisionCache.gameId],
      references: [games.id],
    }),
    empire: one(empires, {
      fields: [llmDecisionCache.empireId],
      references: [empires.id],
    }),
  })
);
