/**
 * Victory Points Service (M10.2)
 *
 * Unified metric for measuring empire power across multiple dimensions.
 * VP is used for coalition triggers and general power tracking.
 *
 * From IMPLEMENTATION-02.md:
 * - Territory: 1-3 VP (10/20/30 planets)
 * - Networth: 1-3 VP (1.2×/1.5×/2× average)
 * - Military: 1-2 VP (1.5×/2× average military)
 * - Diplomacy: 1-2 VP (2/4 active alliances)
 * - Eliminations: 1-2 VP (2/4 eliminations)
 * - Research: 1-2 VP (Level 6/8 research)
 *
 * At 7+ VP, automatic coalition penalties apply.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface VictoryPointBreakdown {
  /** VP from territory/planets owned */
  territory: number;
  /** VP from networth relative to average */
  networth: number;
  /** VP from military power relative to average */
  military: number;
  /** VP from active alliances */
  diplomacy: number;
  /** VP from eliminations achieved */
  eliminations: number;
  /** VP from research level */
  research: number;
  /** Total VP */
  total: number;
}

export interface EmpireVPInput {
  planetCount: number;
  networth: number;
  militaryPower: number;
  allianceCount: number;
  eliminationCount: number;
  researchLevel: number;
}

export interface GameVPStats {
  averageNetworth: number;
  averageMilitary: number;
  totalEmpires: number;
}

export interface VPTier {
  threshold: number;
  points: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Territory VP thresholds
 * 10 planets = 1 VP, 20 = 2 VP, 30 = 3 VP
 */
export const TERRITORY_THRESHOLDS: VPTier[] = [
  { threshold: 30, points: 3 },
  { threshold: 20, points: 2 },
  { threshold: 10, points: 1 },
];

/**
 * Networth VP thresholds (ratio to average)
 * 2× avg = 3 VP, 1.5× = 2 VP, 1.2× = 1 VP
 */
export const NETWORTH_THRESHOLDS: VPTier[] = [
  { threshold: 2.0, points: 3 },
  { threshold: 1.5, points: 2 },
  { threshold: 1.2, points: 1 },
];

/**
 * Military VP thresholds (ratio to average)
 * 2× avg = 2 VP, 1.5× = 1 VP
 */
export const MILITARY_THRESHOLDS: VPTier[] = [
  { threshold: 2.0, points: 2 },
  { threshold: 1.5, points: 1 },
];

/**
 * Diplomacy VP thresholds (alliance count)
 * 4 alliances = 2 VP, 2 alliances = 1 VP
 */
export const DIPLOMACY_THRESHOLDS: VPTier[] = [
  { threshold: 4, points: 2 },
  { threshold: 2, points: 1 },
];

/**
 * Elimination VP thresholds
 * 4 eliminations = 2 VP, 2 eliminations = 1 VP
 */
export const ELIMINATION_THRESHOLDS: VPTier[] = [
  { threshold: 4, points: 2 },
  { threshold: 2, points: 1 },
];

/**
 * Research VP thresholds
 * Level 8 = 2 VP, Level 6 = 1 VP
 */
export const RESEARCH_THRESHOLDS: VPTier[] = [
  { threshold: 8, points: 2 },
  { threshold: 6, points: 1 },
];

/**
 * VP threshold that triggers coalition mechanics
 * From PRD: "When any empire reaches 7+ Victory Points"
 */
export const COALITION_TRIGGER_VP = 7;

// =============================================================================
// PURE FUNCTIONS
// =============================================================================

/**
 * Calculate VP from a tiered threshold
 *
 * @param value - The value to check
 * @param thresholds - Array of thresholds (highest first)
 * @returns VP earned
 */
export function calculateTierVP(value: number, thresholds: VPTier[]): number {
  for (const tier of thresholds) {
    if (value >= tier.threshold) {
      return tier.points;
    }
  }
  return 0;
}

/**
 * Calculate Territory VP
 *
 * @param planetCount - Number of planets owned
 * @returns 0-3 VP based on planet count
 */
export function calculateTerritoryVP(planetCount: number): number {
  return calculateTierVP(planetCount, TERRITORY_THRESHOLDS);
}

/**
 * Calculate Networth VP
 *
 * @param networth - Empire's networth
 * @param averageNetworth - Average networth across all empires
 * @returns 0-3 VP based on networth ratio
 */
export function calculateNetworthVP(
  networth: number,
  averageNetworth: number
): number {
  if (averageNetworth === 0) return 0;
  const ratio = networth / averageNetworth;
  return calculateTierVP(ratio, NETWORTH_THRESHOLDS);
}

/**
 * Calculate Military VP
 *
 * @param militaryPower - Empire's military power
 * @param averageMilitary - Average military power across all empires
 * @returns 0-2 VP based on military ratio
 */
export function calculateMilitaryVP(
  militaryPower: number,
  averageMilitary: number
): number {
  if (averageMilitary === 0) return 0;
  const ratio = militaryPower / averageMilitary;
  return calculateTierVP(ratio, MILITARY_THRESHOLDS);
}

/**
 * Calculate Diplomacy VP
 *
 * @param allianceCount - Number of active alliances
 * @returns 0-2 VP based on alliance count
 */
export function calculateDiplomacyVP(allianceCount: number): number {
  return calculateTierVP(allianceCount, DIPLOMACY_THRESHOLDS);
}

/**
 * Calculate Elimination VP
 *
 * @param eliminationCount - Number of empires eliminated
 * @returns 0-2 VP based on elimination count
 */
export function calculateEliminationVP(eliminationCount: number): number {
  return calculateTierVP(eliminationCount, ELIMINATION_THRESHOLDS);
}

/**
 * Calculate Research VP
 *
 * @param researchLevel - Current fundamental research level
 * @returns 0-2 VP based on research level
 */
export function calculateResearchVP(researchLevel: number): number {
  return calculateTierVP(researchLevel, RESEARCH_THRESHOLDS);
}

/**
 * Calculate full Victory Point breakdown for an empire
 *
 * @param empire - Empire's stats
 * @param gameStats - Game-wide stats for ratios
 * @returns Full VP breakdown including total
 */
export function calculateVictoryPoints(
  empire: EmpireVPInput,
  gameStats: GameVPStats
): VictoryPointBreakdown {
  const territory = calculateTerritoryVP(empire.planetCount);
  const networth = calculateNetworthVP(
    empire.networth,
    gameStats.averageNetworth
  );
  const military = calculateMilitaryVP(
    empire.militaryPower,
    gameStats.averageMilitary
  );
  const diplomacy = calculateDiplomacyVP(empire.allianceCount);
  const eliminations = calculateEliminationVP(empire.eliminationCount);
  const research = calculateResearchVP(empire.researchLevel);

  const total =
    territory + networth + military + diplomacy + eliminations + research;

  return {
    territory,
    networth,
    military,
    diplomacy,
    eliminations,
    research,
    total,
  };
}

/**
 * Check if an empire triggers coalition mechanics
 *
 * @param totalVP - Empire's total VP
 * @returns true if coalition penalties should apply
 */
export function triggersCoalition(totalVP: number): boolean {
  return totalVP >= COALITION_TRIGGER_VP;
}

/**
 * Get the maximum possible VP
 *
 * @returns Maximum VP an empire can achieve
 */
export function getMaximumVP(): number {
  return (
    TERRITORY_THRESHOLDS[0]!.points +
    NETWORTH_THRESHOLDS[0]!.points +
    MILITARY_THRESHOLDS[0]!.points +
    DIPLOMACY_THRESHOLDS[0]!.points +
    ELIMINATION_THRESHOLDS[0]!.points +
    RESEARCH_THRESHOLDS[0]!.points
  );
}

/**
 * Get a description of how VP was earned
 *
 * @param breakdown - VP breakdown
 * @returns Array of descriptions for non-zero VP sources
 */
export function getVPDescriptions(breakdown: VictoryPointBreakdown): string[] {
  const descriptions: string[] = [];

  if (breakdown.territory > 0) {
    const planets =
      breakdown.territory === 3 ? "30+" : breakdown.territory === 2 ? "20+" : "10+";
    descriptions.push(`Territory (${planets} planets): ${breakdown.territory} VP`);
  }

  if (breakdown.networth > 0) {
    const ratio =
      breakdown.networth === 3
        ? "2×"
        : breakdown.networth === 2
          ? "1.5×"
          : "1.2×";
    descriptions.push(
      `Networth (${ratio} average): ${breakdown.networth} VP`
    );
  }

  if (breakdown.military > 0) {
    const ratio = breakdown.military === 2 ? "2×" : "1.5×";
    descriptions.push(`Military (${ratio} average): ${breakdown.military} VP`);
  }

  if (breakdown.diplomacy > 0) {
    const alliances = breakdown.diplomacy === 2 ? "4+" : "2+";
    descriptions.push(
      `Diplomacy (${alliances} alliances): ${breakdown.diplomacy} VP`
    );
  }

  if (breakdown.eliminations > 0) {
    const kills = breakdown.eliminations === 2 ? "4+" : "2+";
    descriptions.push(
      `Eliminations (${kills} destroyed): ${breakdown.eliminations} VP`
    );
  }

  if (breakdown.research > 0) {
    const level = breakdown.research === 2 ? "8" : "6";
    descriptions.push(
      `Research (Level ${level}+): ${breakdown.research} VP`
    );
  }

  return descriptions;
}

/**
 * Calculate military power from unit counts
 * Simplified calculation for VP purposes
 */
export function calculateMilitaryPower(units: {
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
}): number {
  return (
    units.soldiers * 1 +
    units.fighters * 3 +
    units.stations * 50 +
    units.lightCruisers * 10 +
    units.heavyCruisers * 25 +
    units.carriers * 12
  );
}

/**
 * Compare two VP breakdowns
 *
 * @param a - First breakdown
 * @param b - Second breakdown
 * @returns Positive if a > b, negative if a < b, 0 if equal
 */
export function compareVP(
  a: VictoryPointBreakdown,
  b: VictoryPointBreakdown
): number {
  return a.total - b.total;
}

/**
 * Get VP progress towards coalition trigger
 *
 * @param totalVP - Current VP
 * @returns Object with progress info
 */
export function getCoalitionProgress(totalVP: number): {
  current: number;
  threshold: number;
  remaining: number;
  percentage: number;
  isTriggered: boolean;
} {
  return {
    current: totalVP,
    threshold: COALITION_TRIGGER_VP,
    remaining: Math.max(0, COALITION_TRIGGER_VP - totalVP),
    percentage: Math.min(100, (totalVP / COALITION_TRIGGER_VP) * 100),
    isTriggered: triggersCoalition(totalVP),
  };
}
