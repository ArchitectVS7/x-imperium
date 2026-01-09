/**
 * Research Cost Calculation (PRD 9.1)
 *
 * Calculates the research points required for technology progression.
 * - Exponential cost growth: each level costs more than the last
 * - Base cost grows by 1.5x per level (configurable growth rate)
 */

// =============================================================================
// CONSTANTS (PRD 9.1)
// =============================================================================

/** Base cost for the first research level */
export const RESEARCH_BASE_COST = 1_000;

/** Exponential growth rate (cost multiplier per level) */
export const RESEARCH_GROWTH_RATE = 1.5;

/** Maximum research level (prevents overflow) */
export const RESEARCH_MAX_LEVEL = 50;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate the research point cost for a specific level.
 *
 * Formula:
 * Cost = BaseCost × (GrowthRate ^ level)
 *
 * Example with base 1,000 and rate 1.5:
 * - Level 0: 1,000 × 1.5^0 = 1,000
 * - Level 1: 1,000 × 1.5^1 = 1,500
 * - Level 2: 1,000 × 1.5^2 = 2,250
 * - Level 5: 1,000 × 1.5^5 = ~7,594
 * - Level 10: 1,000 × 1.5^10 = ~57,665
 *
 * @param level - The research level to calculate cost for (0-indexed)
 * @returns Research points required (integer)
 */
export function calculateResearchCost(level: number): number {
  if (level < 0) {
    return 0;
  }
  if (level > RESEARCH_MAX_LEVEL) {
    level = RESEARCH_MAX_LEVEL;
  }

  const cost = RESEARCH_BASE_COST * Math.pow(RESEARCH_GROWTH_RATE, level);
  return Math.floor(cost);
}

/**
 * Calculate the total research points needed to reach a level from zero.
 *
 * @param targetLevel - The level to reach
 * @returns Total research points required from level 0
 */
export function calculateTotalResearchCost(targetLevel: number): number {
  if (targetLevel <= 0) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < targetLevel; i++) {
    total += calculateResearchCost(i);
  }
  return total;
}

/**
 * Calculate the research points needed to advance from one level to another.
 *
 * @param fromLevel - Current research level
 * @param toLevel - Target research level
 * @returns Research points required for the upgrade
 */
export function calculateResearchUpgradeCost(
  fromLevel: number,
  toLevel: number
): number {
  if (fromLevel < 0) fromLevel = 0;
  if (toLevel <= fromLevel) return 0;

  let total = 0;
  for (let i = fromLevel; i < toLevel; i++) {
    total += calculateResearchCost(i);
  }
  return total;
}

/**
 * Calculate the maximum research level attainable with given points.
 *
 * @param availablePoints - Research points available
 * @param currentLevel - Current research level
 * @returns Maximum reachable level
 */
export function calculateMaxResearchLevel(
  availablePoints: number,
  currentLevel: number = 0
): number {
  if (availablePoints <= 0) {
    return currentLevel;
  }

  let level = currentLevel;
  let remainingPoints = availablePoints;

  while (level < RESEARCH_MAX_LEVEL) {
    const cost = calculateResearchCost(level);
    if (cost > remainingPoints) {
      break;
    }
    remainingPoints -= cost;
    level++;
  }

  return level;
}

/**
 * Calculate research progress as a percentage towards the next level.
 *
 * @param currentPoints - Research points accumulated towards next level
 * @param currentLevel - Current research level
 * @returns Progress percentage (0-100)
 */
export function calculateResearchProgress(
  currentPoints: number,
  currentLevel: number
): number {
  const costForNextLevel = calculateResearchCost(currentLevel);
  if (costForNextLevel <= 0) {
    return 100;
  }

  const progress = (currentPoints / costForNextLevel) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Calculate the number of turns needed to reach a target level.
 *
 * @param currentLevel - Current research level
 * @param currentPoints - Points accumulated towards next level
 * @param pointsPerTurn - Research points generated per turn
 * @param targetLevel - Target research level
 * @returns Estimated turns to reach target (or Infinity if 0 points/turn)
 */
export function calculateTurnsToResearchLevel(
  currentLevel: number,
  currentPoints: number,
  pointsPerTurn: number,
  targetLevel: number
): number {
  if (pointsPerTurn <= 0) {
    return Infinity;
  }
  if (targetLevel <= currentLevel) {
    return 0;
  }

  // Calculate remaining cost
  const costToNextLevel = calculateResearchCost(currentLevel) - currentPoints;
  const costForRemainingLevels = calculateResearchUpgradeCost(
    currentLevel + 1,
    targetLevel
  );
  const totalCost = costToNextLevel + costForRemainingLevels;

  return Math.ceil(totalCost / pointsPerTurn);
}
