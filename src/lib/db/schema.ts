/**
 * Schema Re-Export Module
 *
 * This file maintains backward compatibility by re-exporting all schema
 * definitions from the modular schema directory structure.
 *
 * The schema has been split into domain-specific modules for better
 * maintainability:
 *
 * - schema/core.ts: games, empires, sectors, gameSessions, gameSaves, etc.
 * - schema/combat.ts: attacks, combatLogs + combat enums
 * - schema/economy.ts: marketPrices, marketOrders, buildQueue + economy enums
 * - schema/diplomacy.ts: treaties, reputationLog, messages + diplomacy enums
 * - schema/research.ts: researchProgress, unitUpgrades, researchBranchAllocations
 * - schema/bots.ts: botMemories, botEmotionalStates, botTells + bot enums
 * - schema/crafting.ts: resourceInventory, craftingQueue, syndicate tables
 * - schema/events.ts: galacticEvents, coalitions, coalitionMembers
 * - schema/geography.ts: galaxyRegions, regionConnections, empireInfluence
 * - schema/llm.ts: llmUsageLogs, llmDecisionCache
 * - schema/relations.ts: All Drizzle ORM relation definitions
 * - schema/index.ts: Central exports
 *
 * All existing imports from "@/lib/db/schema" will continue to work.
 */

// Re-export everything from the schema index
export * from "./schema/index";
