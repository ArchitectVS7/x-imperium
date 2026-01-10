/**
 * Schema Index
 *
 * Central export point for all schema modules.
 * Re-exports all tables, enums, types, and relations.
 */

// ============================================
// CORE DOMAIN
// ============================================
export {
  // Enums
  gameStatusEnum,
  empireTypeEnum,
  botTierEnum,
  botArchetypeEnum,
  sectorTypeEnum,
  civilStatusEnum,
  difficultyEnum,
  gameModeEnum,
  victoryTypeEnum,
  gameConfigTypeEnum,
  // Tables
  games,
  gameSessions,
  empires,
  sectors,
  gameSaves,
  gameConfigs,
  performanceLogs,
  civilStatusHistory,
  // Types
  type Game,
  type NewGame,
  type GameSession,
  type NewGameSession,
  type Empire,
  type NewEmpire,
  type Sector,
  type NewSector,
  type GameSave,
  type NewGameSave,
  type GameConfig,
  type NewGameConfig,
  type PerformanceLog,
  type NewPerformanceLog,
  type CivilStatusHistory,
  type NewCivilStatusHistory,
} from "./core";

// ============================================
// COMBAT DOMAIN
// ============================================
export {
  // Enums
  unitTypeEnum,
  combatPhaseEnum,
  attackTypeEnum,
  combatOutcomeEnum,
  // Tables
  attacks,
  combatLogs,
  // Types
  type Attack,
  type NewAttack,
  type CombatLog,
  type NewCombatLog,
} from "./combat";

// ============================================
// ECONOMY DOMAIN
// ============================================
export {
  // Enums
  resourceTypeEnum,
  marketOrderTypeEnum,
  marketOrderStatusEnum,
  // Tables
  marketPrices,
  marketOrders,
  buildQueue,
  // Types
  type MarketPrice,
  type NewMarketPrice,
  type MarketOrder,
  type NewMarketOrder,
  type BuildQueue,
  type NewBuildQueue,
} from "./economy";

// ============================================
// DIPLOMACY DOMAIN
// ============================================
export {
  // Enums
  treatyTypeEnum,
  treatyStatusEnum,
  reputationEventTypeEnum,
  messageChannelEnum,
  messageTriggerEnum,
  // Tables
  treaties,
  reputationLog,
  messages,
  // Types
  type Treaty,
  type NewTreaty,
  type ReputationLog,
  type NewReputationLog,
  type Message,
  type NewMessage,
} from "./diplomacy";

// ============================================
// RESEARCH DOMAIN
// ============================================
export {
  // Enums
  researchBranchEnum,
  // Tables
  researchProgress,
  unitUpgrades,
  researchBranchAllocations,
  // Types
  type ResearchProgress,
  type NewResearchProgress,
  type UnitUpgrade,
  type NewUnitUpgrade,
  type ResearchBranchAllocation,
  type NewResearchBranchAllocation,
} from "./research";

// ============================================
// BOTS DOMAIN
// ============================================
export {
  // Enums
  emotionalStateEnum,
  memoryTypeEnum,
  tellTypeEnum,
  // Tables
  botMemories,
  botEmotionalStates,
  botTells,
  // Types
  type BotMemory,
  type NewBotMemory,
  type BotEmotionalState,
  type NewBotEmotionalState,
  type BotTell,
  type NewBotTell,
} from "./bots";

// ============================================
// CRAFTING DOMAIN
// ============================================
export {
  // Enums
  resourceTierEnum,
  craftedResourceTypeEnum,
  craftingStatusEnum,
  syndicateTrustLevelEnum,
  contractTypeEnum,
  contractStatusEnum,
  pirateMissionStatusEnum,
  // Tables
  resourceInventory,
  craftingQueue,
  syndicateTrust,
  syndicateContracts,
  pirateMissions,
  // Types
  type ResourceInventory,
  type NewResourceInventory,
  type CraftingQueue,
  type NewCraftingQueue,
  type SyndicateTrust,
  type NewSyndicateTrust,
  type SyndicateContract,
  type NewSyndicateContract,
  type PirateMission,
  type NewPirateMission,
} from "./crafting";

// ============================================
// EVENTS DOMAIN
// ============================================
export {
  // Enums
  galacticEventTypeEnum,
  galacticEventSubtypeEnum,
  coalitionStatusEnum,
  // Tables
  galacticEvents,
  coalitions,
  coalitionMembers,
  // Types
  type GalacticEvent,
  type NewGalacticEvent,
  type Coalition,
  type NewCoalition,
  type CoalitionMember,
  type NewCoalitionMember,
} from "./events";

// ============================================
// GEOGRAPHY DOMAIN
// ============================================
export {
  // Enums
  regionTypeEnum,
  connectionTypeEnum,
  wormholeStatusEnum,
  // Tables
  galaxyRegions,
  regionConnections,
  empireInfluence,
  // Types
  type GalaxyRegion,
  type NewGalaxyRegion,
  type RegionConnection,
  type NewRegionConnection,
  type EmpireInfluence,
  type NewEmpireInfluence,
} from "./geography";

// ============================================
// LLM DOMAIN
// ============================================
export {
  // Enums
  llmProviderEnum,
  llmCallStatusEnum,
  // Tables
  llmUsageLogs,
  llmDecisionCache,
  // Types
  type LlmUsageLog,
  type NewLlmUsageLog,
  type LlmDecisionCache,
  type NewLlmDecisionCache,
} from "./llm";

// ============================================
// RELATIONS
// ============================================
export {
  // Core relations
  gamesRelations,
  gameSessionsRelations,
  empiresRelations,
  sectorsRelations,
  gameSavesRelations,
  gameConfigsRelations,
  performanceLogsRelations,
  civilStatusHistoryRelations,
  // Combat relations
  attacksRelations,
  combatLogsRelations,
  // Economy relations
  buildQueueRelations,
  marketPricesRelations,
  marketOrdersRelations,
  // Diplomacy relations
  treatiesRelations,
  reputationLogRelations,
  messagesRelations,
  // Research relations
  researchProgressRelations,
  unitUpgradesRelations,
  researchBranchAllocationsRelations,
  // Bot relations
  botMemoriesRelations,
  botEmotionalStatesRelations,
  botTellsRelations,
  // Crafting relations
  resourceInventoryRelations,
  craftingQueueRelations,
  syndicateTrustRelations,
  syndicateContractsRelations,
  pirateMissionsRelations,
  // Events relations
  galacticEventsRelations,
  coalitionsRelations,
  coalitionMembersRelations,
  // Geography relations
  galaxyRegionsRelations,
  regionConnectionsRelations,
  empireInfluenceRelations,
  // LLM relations
  llmUsageLogsRelations,
  llmDecisionCacheRelations,
} from "./relations";
