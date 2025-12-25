/**
 * Progressive Unlock Definitions (PRD 11.1)
 *
 * Features unlock as the game progresses to maintain engagement.
 * This prevents overwhelming new players while ensuring mid-game depth.
 *
 * @see docs/PRD.md Section 11.1 (Progressive Unlocks)
 */

// =============================================================================
// TYPES
// =============================================================================

export type UnlockFeature =
  | "core_mechanics"
  | "diplomacy_basics"
  | "coalitions"
  | "black_market"
  | "advanced_ships"
  | "coalition_warfare"
  | "superweapons"
  | "endgame_ultimatums";

export interface UnlockDefinition {
  /** Feature identifier */
  id: UnlockFeature;
  /** Display name */
  name: string;
  /** Turn when this feature unlocks */
  unlockTurn: number;
  /** Description shown to the player */
  description: string;
  /** Notification message when unlocked */
  unlockMessage: string;
}

// =============================================================================
// PROGRESSIVE UNLOCK SCHEDULE (PRD 11.1)
// =============================================================================

/**
 * Turn-based feature unlocks.
 *
 * Schedule (from PRD 11.1):
 * - Turn 1: Core mechanics (build, expand, basic combat)
 * - Turn 10: Diplomacy basics (NAP, trade agreements)
 * - Turn 20: Coalition formation
 * - Turn 30: Black Market access
 * - Turn 50: Advanced ship classes
 * - Turn 75: Coalition warfare (coordinated attacks)
 * - Turn 100: Superweapons (nukes)
 * - Turn 150: Endgame ultimatums
 */
export const PROGRESSIVE_UNLOCKS: Record<number, UnlockFeature[]> = {
  1: ["core_mechanics"],
  10: ["diplomacy_basics"],
  20: ["coalitions"],
  30: ["black_market"],
  50: ["advanced_ships"],
  75: ["coalition_warfare"],
  100: ["superweapons"],
  150: ["endgame_ultimatums"],
} as const;

/**
 * Detailed unlock definitions for each feature.
 */
export const UNLOCK_DEFINITIONS: Record<UnlockFeature, UnlockDefinition> = {
  core_mechanics: {
    id: "core_mechanics",
    name: "Core Mechanics",
    unlockTurn: 1,
    description: "Build planets, recruit military, engage in basic combat",
    unlockMessage: "Welcome, Commander. Your empire awaits.",
  },

  diplomacy_basics: {
    id: "diplomacy_basics",
    name: "Diplomacy Basics",
    unlockTurn: 10,
    description: "Propose Non-Aggression Pacts and trade agreements",
    unlockMessage:
      "The Galactic Council has approved diplomatic communications. You may now propose treaties.",
  },

  coalitions: {
    id: "coalitions",
    name: "Coalition Formation",
    unlockTurn: 20,
    description: "Form or join coalitions with allied empires",
    unlockMessage:
      "Coalition protocols activated. United we stand, divided we fall.",
  },

  black_market: {
    id: "black_market",
    name: "Black Market",
    unlockTurn: 30,
    description: "Access illegal trade and special equipment",
    unlockMessage:
      "A mysterious contact has reached out. The Black Market is now accessible...",
  },

  advanced_ships: {
    id: "advanced_ships",
    name: "Advanced Ship Classes",
    unlockTurn: 50,
    description: "Unlock Heavy Cruisers and advanced military technology",
    unlockMessage:
      "Your shipyards have completed advanced research. New vessel classes are available.",
  },

  coalition_warfare: {
    id: "coalition_warfare",
    name: "Coalition Warfare",
    unlockTurn: 75,
    description: "Coordinate attacks with coalition members",
    unlockMessage:
      "Coalition command structures established. Coordinated military operations are now possible.",
  },

  superweapons: {
    id: "superweapons",
    name: "Superweapons",
    unlockTurn: 100,
    description: "Nuclear weapons and planet-killing technology",
    unlockMessage:
      "WARNING: Weapons of mass destruction protocols unlocked. Use with extreme caution.",
  },

  endgame_ultimatums: {
    id: "endgame_ultimatums",
    name: "Endgame Ultimatums",
    unlockTurn: 150,
    description: "Issue final demands and trigger endgame scenarios",
    unlockMessage:
      "The end approaches. Ultimatum protocols are now available for decisive action.",
  },
};

/**
 * All unlock turns in ascending order.
 */
export const UNLOCK_TURNS = Object.keys(PROGRESSIVE_UNLOCKS)
  .map(Number)
  .sort((a, b) => a - b);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all features unlocked by a specific turn.
 *
 * @param turn - Current game turn
 * @returns Array of all unlocked features
 */
export function getUnlockedFeatures(turn: number): UnlockFeature[] {
  const unlocked: UnlockFeature[] = [];

  for (const unlockTurn of UNLOCK_TURNS) {
    if (unlockTurn <= turn) {
      const features = PROGRESSIVE_UNLOCKS[unlockTurn];
      if (features) {
        unlocked.push(...features);
      }
    } else {
      break; // No need to check further turns
    }
  }

  return unlocked;
}

/**
 * Get features that just unlocked on this turn.
 *
 * @param turn - Current game turn
 * @returns Array of newly unlocked features (empty if none)
 */
export function getNewUnlocks(turn: number): UnlockFeature[] {
  return PROGRESSIVE_UNLOCKS[turn] ?? [];
}

/**
 * Check if a specific feature is unlocked.
 *
 * @param feature - Feature to check
 * @param turn - Current game turn
 * @returns True if feature is unlocked
 */
export function isFeatureUnlocked(feature: UnlockFeature, turn: number): boolean {
  const definition = UNLOCK_DEFINITIONS[feature];
  return turn >= definition.unlockTurn;
}

/**
 * Get the turn when a feature unlocks.
 *
 * @param feature - Feature to check
 * @returns Turn number when feature becomes available
 */
export function getUnlockTurn(feature: UnlockFeature): number {
  return UNLOCK_DEFINITIONS[feature].unlockTurn;
}

/**
 * Get the unlock definition for a feature.
 *
 * @param feature - Feature to look up
 * @returns Full unlock definition
 */
export function getUnlockDefinition(feature: UnlockFeature): UnlockDefinition {
  return UNLOCK_DEFINITIONS[feature];
}

/**
 * Get upcoming unlocks (features not yet unlocked).
 *
 * @param turn - Current game turn
 * @returns Array of upcoming unlock definitions, sorted by turn
 */
export function getUpcomingUnlocks(turn: number): UnlockDefinition[] {
  const upcoming: UnlockDefinition[] = [];

  for (const feature of Object.values(UNLOCK_DEFINITIONS)) {
    if (feature.unlockTurn > turn) {
      upcoming.push(feature);
    }
  }

  return upcoming.sort((a, b) => a.unlockTurn - b.unlockTurn);
}

/**
 * Get the next unlock after the current turn.
 *
 * @param turn - Current game turn
 * @returns Next unlock definition, or undefined if all unlocked
 */
export function getNextUnlock(turn: number): UnlockDefinition | undefined {
  const upcoming = getUpcomingUnlocks(turn);
  return upcoming[0];
}

/**
 * Calculate progress percentage through the unlock schedule.
 *
 * @param turn - Current game turn
 * @returns Percentage of features unlocked (0-100)
 */
export function getUnlockProgress(turn: number): number {
  const totalFeatures = Object.keys(UNLOCK_DEFINITIONS).length;
  const unlockedFeatures = getUnlockedFeatures(turn).length;
  return Math.round((unlockedFeatures / totalFeatures) * 100);
}

/**
 * Get all features as an array for iteration.
 */
export const ALL_UNLOCK_FEATURES: UnlockFeature[] = Object.keys(
  UNLOCK_DEFINITIONS
) as UnlockFeature[];

/**
 * Game phase names based on unlock progress (PRD 11.5).
 */
export const GAME_PHASES = {
  EXPANSION: { start: 1, end: 30 },
  COMPETITION: { start: 31, end: 80 },
  DOMINATION: { start: 81, end: 150 },
  ENDGAME: { start: 151, end: 200 },
} as const;

export type GamePhase = keyof typeof GAME_PHASES;

/**
 * Get the current game phase based on turn.
 *
 * @param turn - Current game turn
 * @returns Current game phase
 */
export function getCurrentPhase(turn: number): GamePhase {
  if (turn <= GAME_PHASES.EXPANSION.end) return "EXPANSION";
  if (turn <= GAME_PHASES.COMPETITION.end) return "COMPETITION";
  if (turn <= GAME_PHASES.DOMINATION.end) return "DOMINATION";
  return "ENDGAME";
}

/**
 * Get the phase display name.
 */
export const PHASE_NAMES: Record<GamePhase, string> = {
  EXPANSION: "Expansion",
  COMPETITION: "Competition",
  DOMINATION: "Domination",
  ENDGAME: "Endgame",
};
