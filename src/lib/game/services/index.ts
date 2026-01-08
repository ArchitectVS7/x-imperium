/**
 * Game Services Index
 *
 * Barrel export for all game services organized by domain.
 * This file provides backward-compatible imports while enabling
 * domain-based organization.
 *
 * Domain Structure:
 * - combat/: Combat resolution, attack validation, boss detection
 * - core/: Turn processing, victory, saves, sessions
 * - covert/: Covert operations and espionage
 * - crafting/: Crafting queue and resource crafting
 * - diplomacy/: Coalitions and diplomatic mechanics
 * - economy/: Resource production and economic management
 * - events/: Game events, checkpoints, pirate encounters
 * - geography/: Sectors, wormholes, expansion, territory
 * - military/: Unit construction, upgrades, threat assessment
 * - population/: Population growth, civil status
 * - research/: Research progression, sector traits
 */

// Domain re-exports
export * from "./combat";
export * from "./core";
export * from "./covert";
export * from "./crafting";
export * from "./diplomacy";
export * from "./economy";
export * from "./events";
export * from "./military";
export * from "./population";
export * from "./research";

// Geography domain - special handling for naming collisions
// Note: Some exports have naming collisions and must be imported directly
// from their source modules (e.g., influence-sphere-service.validateAttack)
export * from "./geography/sector-service";
export * from "./geography/sector-balancing-service";
export * from "./geography/wormhole-service";
// wormhole-construction-service has naming collision with influence-sphere
export {
  processWormholeConstruction,
  startWormholeConstruction,
  getConstructionProjects,
  getPotentialDestinations,
  type WormholeConstructionProject,
  type WormholeConstructionCost,
  type WormholeConstructionInfo,
} from "./geography/wormhole-construction-service";
export * from "./geography/border-discovery-service";
export * from "./geography/expansion-service";
export * from "./geography/galaxy-generation-service";
// influence-sphere-service.validateAttack and calculateRegionDistance conflict
export {
  calculateInfluenceSphere,
  getValidAttackTargets,
  validateAttack as validateInfluenceAttack,
  recalculateInfluenceOnTerritoryChange,
  inheritNeighborsFromEliminated,
  type InfluenceSphereResult,
  type AttackValidationResult as InfluenceAttackValidation,
} from "./geography/influence-sphere-service";

// Flat services (remaining)
// victory-points-service has calculateMilitaryPower collision with threat-service
export {
  type VictoryPointBreakdown,
  type EmpireVPInput,
  type GameVPStats,
  type VPTier,
  TERRITORY_THRESHOLDS,
  NETWORTH_THRESHOLDS,
  MILITARY_THRESHOLDS,
  DIPLOMACY_THRESHOLDS,
  ELIMINATION_THRESHOLDS,
  RESEARCH_THRESHOLDS,
  COALITION_TRIGGER_VP,
  calculateTierVP,
  calculateTerritoryVP,
  calculateNetworthVP,
  calculateMilitaryVP,
  calculateDiplomacyVP,
  calculateEliminationVP,
  calculateResearchVP,
  calculateVictoryPoints,
  triggersCoalition,
  getMaximumVP,
  getVPDescriptions,
  calculateMilitaryPower as calculateVPMilitaryPower,
  compareVP,
  getCoalitionProgress,
} from "./victory-points-service";
export * from "./syndicate-service";
export * from "./shared-victory-service";
