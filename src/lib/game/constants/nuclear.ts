/**
 * Nuclear Warfare Constants (M11)
 *
 * Defines superweapon system parameters for nuclear strikes.
 * Nuclear weapons are the ultimate deterrent - expensive, devastating,
 * and come with severe diplomatic consequences.
 *
 * @see docs/PRD.md Section on Turn 100+ unlocks
 */

// =============================================================================
// NUCLEAR CONSTANTS
// =============================================================================

/**
 * Nuclear warfare system constants (PRD Turn 100+ unlock).
 */
export const NUCLEAR_CONSTANTS = {
  /** Cost to purchase a nuclear weapon (50M credits - expensive but achievable in late game) */
  COST: 50_000_000,

  /** Population damage dealt by a nuclear strike (40%) */
  POPULATION_DAMAGE: 0.40,

  /** Chance the target detects launch before detonation (30%) */
  DETECTION_CHANCE: 0.30,

  /** Cooldown turns before launching again */
  COOLDOWN_TURNS: 10,

  /** Civil status penalty for the attacker (drop 3 levels) */
  CIVIL_STATUS_PENALTY: -3,

  /** Reputation penalty for using nuclear weapons */
  REPUTATION_PENALTY: -200,

  /** Turn when nuclear weapons become available */
  UNLOCK_TURN: 100,

  /** Syndicate trust level required to purchase (consigliere = level 7) */
  REQUIRED_TRUST_LEVEL: "consigliere",

  /** Minimum population to survive a nuclear strike */
  MIN_SURVIVING_POPULATION: 1000,
} as const;

// =============================================================================
// NUCLEAR DETECTION OUTCOMES
// =============================================================================

/**
 * Possible outcomes when a nuclear strike is detected.
 */
export const NUCLEAR_DETECTION_OUTCOMES = {
  /** Strike proceeds but target has warning */
  PROCEED_WITH_WARNING: "proceed_with_warning",
  /** Strike is intercepted and fails */
  INTERCEPTED: "intercepted",
  /** Target evacuates, reducing casualties */
  EVACUATION: "evacuation",
} as const;

export type NuclearDetectionOutcome = typeof NUCLEAR_DETECTION_OUTCOMES[keyof typeof NUCLEAR_DETECTION_OUTCOMES];

/**
 * Probability distribution for detection outcomes.
 */
export const DETECTION_OUTCOME_WEIGHTS = {
  [NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING]: 0.50, // 50% - strike still happens
  [NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED]: 0.20, // 20% - strike fails
  [NUCLEAR_DETECTION_OUTCOMES.EVACUATION]: 0.30, // 30% - reduced casualties
} as const;

// =============================================================================
// GLOBAL CONSEQUENCES
// =============================================================================

/**
 * Global diplomatic consequences for nuclear weapon use.
 * All empires react negatively to nuclear strikes.
 */
export const NUCLEAR_GLOBAL_CONSEQUENCES = {
  /** Reputation penalty applied by all non-coalition empires */
  GLOBAL_REPUTATION_PENALTY: -50,

  /** Coalition members don't penalize (shared fate) */
  COALITION_EXEMPT: true,

  /** Target's allies get extra reputation penalty against attacker */
  ALLY_BONUS_PENALTY: -100,

  /** Broadcast message sent to all empires */
  BROADCAST_NOTIFICATION: true,
} as const;

// =============================================================================
// CASUALTY MODIFIERS
// =============================================================================

/**
 * Casualty modifiers based on detection outcome.
 */
export const CASUALTY_MODIFIERS: Record<NuclearDetectionOutcome | "undetected", number> = {
  /** Full damage when undetected */
  undetected: 1.0,

  /** Slightly reduced when detected but proceeds */
  [NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING]: 0.85,

  /** No damage when intercepted */
  [NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED]: 0.0,

  /** Significantly reduced when evacuation occurs */
  [NUCLEAR_DETECTION_OUTCOMES.EVACUATION]: 0.50,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if nuclear weapons are unlocked for the current turn.
 */
export function areNuclearWeaponsUnlocked(currentTurn: number): boolean {
  return currentTurn >= NUCLEAR_CONSTANTS.UNLOCK_TURN;
}

/**
 * Calculate the cost of a nuclear weapon.
 */
export function getNuclearWeaponCost(): number {
  return NUCLEAR_CONSTANTS.COST;
}

/**
 * Check if an empire can launch (cooldown check).
 */
export function canLaunchNuclear(
  currentTurn: number,
  lastNukeLaunchTurn: number | null
): { allowed: boolean; turnsRemaining?: number } {
  if (lastNukeLaunchTurn === null) {
    return { allowed: true };
  }

  const turnsSinceLaunch = currentTurn - lastNukeLaunchTurn;
  if (turnsSinceLaunch >= NUCLEAR_CONSTANTS.COOLDOWN_TURNS) {
    return { allowed: true };
  }

  return {
    allowed: false,
    turnsRemaining: NUCLEAR_CONSTANTS.COOLDOWN_TURNS - turnsSinceLaunch,
  };
}

/**
 * Calculate population casualties from a nuclear strike.
 */
export function calculateNuclearCasualties(
  targetPopulation: number,
  detectionOutcome: NuclearDetectionOutcome | null
): number {
  const baseMultiplier = NUCLEAR_CONSTANTS.POPULATION_DAMAGE;

  let effectiveMultiplier = baseMultiplier;

  if (detectionOutcome) {
    const modifier = CASUALTY_MODIFIERS[detectionOutcome];
    effectiveMultiplier = baseMultiplier * modifier;
  }

  const casualties = Math.floor(targetPopulation * effectiveMultiplier);

  // Ensure minimum population survives
  const maxCasualties = targetPopulation - NUCLEAR_CONSTANTS.MIN_SURVIVING_POPULATION;
  return Math.min(casualties, Math.max(0, maxCasualties));
}

/**
 * Roll for detection based on DETECTION_CHANCE.
 */
export function rollForDetection(random?: number): boolean {
  const roll = random ?? Math.random();
  return roll < NUCLEAR_CONSTANTS.DETECTION_CHANCE;
}

/**
 * Determine the outcome when a strike is detected.
 */
export function determineDetectionOutcome(random?: number): NuclearDetectionOutcome {
  const roll = random ?? Math.random();

  let cumulative = 0;
  for (const [outcome, weight] of Object.entries(DETECTION_OUTCOME_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) {
      return outcome as NuclearDetectionOutcome;
    }
  }

  // Fallback (should never reach)
  return NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING;
}
