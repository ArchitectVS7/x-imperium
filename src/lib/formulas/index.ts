/**
 * Formula Module Exports
 *
 * This barrel export provides clean access to all game formula calculations.
 * All formulas are pure functions with no side effects.
 */

// Combat Power Calculations (PRD 6.2)
export {
  calculateFleetPower,
  calculateDiversityBonus,
  calculatePowerRatio,
  countUnitTypes,
  hasDiversityBonus,
  POWER_MULTIPLIERS,
  DIVERSITY_THRESHOLD,
  DIVERSITY_BONUS,
  DEFENDER_ADVANTAGE,
  STATION_DEFENSE_MULTIPLIER,
  type FleetComposition,
} from "./combat-power";

// Casualty Calculations (PRD 6.2)
export {
  calculateLossRate,
  calculateCasualties,
  calculateCombatCasualties,
  calculateVariance,
  calculateRetreatCasualties,
  CASUALTY_BASE_RATE,
  CASUALTY_MIN_RATE,
  CASUALTY_MAX_RATE,
  CASUALTY_BAD_ATTACK_PENALTY,
  CASUALTY_OVERWHELMING_BONUS,
  BAD_ATTACK_THRESHOLD,
  OVERWHELMING_THRESHOLD,
  VARIANCE_MIN,
  VARIANCE_MAX,
  RETREAT_CASUALTY_RATE,
} from "./casualties";

// Sector Cost Calculations (PRD 5.3)
export {
  calculateSectorCost,
  calculateReleaseRefund,
  getSectorCostMultiplier,
  calculateBulkSectorCost,
  calculateAffordableSectors,
  SECTOR_COST_SCALING,
  SECTOR_RELEASE_REFUND,
} from "./sector-costs";

// Population Mechanics (PRD 4.4)
export {
  calculateFoodConsumption,
  calculateSupportablePopulation,
  calculatePopulationGrowth,
  calculateStarvationLoss,
  calculateNetPopulationChange,
  calculateNewPopulation,
  FOOD_PER_CITIZEN,
  POPULATION_GROWTH_RATE,
  STARVATION_RATE,
  MINIMUM_POPULATION,
} from "./population";

// Research Cost Calculations (PRD 9.1)
export {
  calculateResearchCost,
  calculateTotalResearchCost,
  calculateResearchUpgradeCost,
  calculateMaxResearchLevel,
  calculateResearchProgress,
  calculateTurnsToResearchLevel,
  RESEARCH_BASE_COST,
  RESEARCH_GROWTH_RATE,
  RESEARCH_MAX_LEVEL,
} from "./research-costs";

// Army Effectiveness (PRD 6.5)
export {
  updateEffectiveness,
  calculateCombatModifier,
  calculateEffectivePower,
  calculateCombatEffectivenessChange,
  applyEffectivenessRecovery,
  applyMaintenancePenalty,
  calculateRecoveryTurns,
  clampEffectiveness,
  EFFECTIVENESS_MAX,
  EFFECTIVENESS_MIN,
  EFFECTIVENESS_DEFAULT,
  EFFECTIVENESS_RECOVERY_RATE,
  EFFECTIVENESS_VICTORY_BONUS_MIN,
  EFFECTIVENESS_VICTORY_BONUS_MAX,
  EFFECTIVENESS_DEFEAT_PENALTY,
  EFFECTIVENESS_UNPAID_PENALTY,
  type CombatOutcome,
  type EffectivenessEvent,
} from "./army-effectiveness";
