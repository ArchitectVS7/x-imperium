/**
 * Geography Service Domain
 *
 * Services related to sectors, wormholes, expansion, and galactic territory.
 *
 * Note: Some services have naming collisions that require selective exports.
 * Import directly from source modules if you need the conflicting functions.
 */

export * from "./sector-service";
export * from "./sector-balancing-service";
export * from "./wormhole-service";
// wormhole-construction-service has naming collision (calculateRegionDistance)
export {
  processWormholeConstruction,
  startWormholeConstruction,
  getConstructionProjects,
  getPotentialDestinations,
  type WormholeConstructionProject,
  type WormholeConstructionCost,
  type WormholeConstructionInfo,
} from "./wormhole-construction-service";
export * from "./border-discovery-service";
// influence-sphere-service has validateAttack collision
export {
  calculateInfluenceSphere,
  getValidAttackTargets,
  validateAttack as validateInfluenceAttack,
  recalculateInfluenceOnTerritoryChange,
  inheritNeighborsFromEliminated,
  type InfluenceSphereResult,
  type AttackValidationResult as InfluenceAttackValidation,
} from "./influence-sphere-service";
export * from "./galaxy-generation-service";
export * from "./expansion-service";
