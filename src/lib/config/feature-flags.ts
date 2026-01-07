/**
 * Feature Flags for Experimental Mechanics
 *
 * All experimental balance and gameplay mechanics are behind feature flags.
 * This enables A/B testing, quick rollback, and playtesting without code changes.
 *
 * Usage:
 *   import { isFeatureEnabled } from '@/lib/config/feature-flags';
 *   if (isFeatureEnabled('UNDERDOG_BONUS')) { ... }
 *
 * Flags can be overridden via:
 * 1. Environment variables (e.g., FEATURE_UNDERDOG_BONUS=true)
 * 2. Per-game database settings (future: GameFeatureFlags)
 */

// =============================================================================
// DEFAULT FLAG VALUES
// =============================================================================

/**
 * Default feature flag values.
 * These are the fallback when no environment override is set.
 */
export const FEATURE_FLAGS = {
  // Balance mechanics
  COALITION_RAIDS: false,     // +5% per attacker vs boss (3+ attackers)
  UNDERDOG_BONUS: false,      // +10-20% when weaker empire attacks stronger
  PUNCHUP_BONUS: false,       // Bonus rewards for winning against stronger

  // Connection types (advanced geography)
  TRADE_ROUTES: false,        // Trade routes as attack relay points
  HAZARD_ZONES: false,        // Hazardous connections with unit attrition
  CONTESTED_ZONES: false,     // Contested areas with random combat events

  // Game modes
  CAMPAIGN_MODE: true,        // Multi-session campaigns
  SESSION_SUMMARIES: false,   // Between-session summary screens
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// =============================================================================
// RUNTIME FLAG RESOLUTION
// =============================================================================

/**
 * Check if a feature flag is enabled.
 *
 * Resolution order:
 * 1. Environment variable (FEATURE_<FLAG_NAME>=true/false/1/0)
 * 2. Default value from FEATURE_FLAGS
 *
 * @param flag - The feature flag to check
 * @returns Whether the feature is enabled
 *
 * @example
 * if (isFeatureEnabled('UNDERDOG_BONUS')) {
 *   attackPower *= calculateUnderdogBonus(attackerNetworth, defenderNetworth);
 * }
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Check environment variable override
  const envKey = `FEATURE_${flag}`;
  const envValue = typeof process !== 'undefined' ? process.env[envKey] : undefined;

  if (envValue !== undefined) {
    // Parse various truthy/falsy values
    const normalized = envValue.toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  // Fall back to default
  return FEATURE_FLAGS[flag];
}

/**
 * Get all currently enabled features.
 * Useful for debugging and logging.
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter(isFeatureEnabled);
}

/**
 * Get all feature flag values as an object.
 * Useful for logging or serialization.
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  const flags = {} as Record<FeatureFlag, boolean>;
  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlag[]) {
    flags[key] = isFeatureEnabled(key);
  }
  return flags;
}

// =============================================================================
// PER-GAME FEATURE OVERRIDES (Future)
// =============================================================================

/**
 * Per-game feature flag overrides.
 * These can be stored in the games table to allow different settings per game.
 */
export interface GameFeatureFlags {
  coalitionRaids?: boolean;
  underdogBonus?: boolean;
  punchupBonus?: boolean;
  tradeRoutes?: boolean;
  hazardZones?: boolean;
  contestedZones?: boolean;
}

/**
 * Check if a feature is enabled for a specific game.
 * First checks game-specific overrides, then falls back to global settings.
 *
 * @param flag - The feature flag to check
 * @param gameFlags - Optional per-game flag overrides
 * @returns Whether the feature is enabled for this game
 */
export function isFeatureEnabledForGame(
  flag: FeatureFlag,
  gameFlags?: GameFeatureFlags | null
): boolean {
  // Map feature flags to game flag keys
  const gameFlagMap: Partial<Record<FeatureFlag, keyof GameFeatureFlags>> = {
    COALITION_RAIDS: 'coalitionRaids',
    UNDERDOG_BONUS: 'underdogBonus',
    PUNCHUP_BONUS: 'punchupBonus',
    TRADE_ROUTES: 'tradeRoutes',
    HAZARD_ZONES: 'hazardZones',
    CONTESTED_ZONES: 'contestedZones',
  };

  const gameKey = gameFlagMap[flag];

  // Check game-specific override first
  if (gameFlags && gameKey && gameFlags[gameKey] !== undefined) {
    return gameFlags[gameKey]!;
  }

  // Fall back to global flag
  return isFeatureEnabled(flag);
}

// =============================================================================
// FEATURE FLAG DOCUMENTATION
// =============================================================================

/**
 * Feature flag descriptions for documentation and UI.
 */
export const FEATURE_FLAG_DESCRIPTIONS: Record<FeatureFlag, string> = {
  COALITION_RAIDS: 'When 3+ empires attack the same boss in one turn, each gets +5% attack bonus',
  UNDERDOG_BONUS: 'Weaker empires get +10-20% attack bonus when attacking stronger empires',
  PUNCHUP_BONUS: 'Extra rewards (sectors, credits, reputation) for defeating stronger empires',
  TRADE_ROUTES: 'Use trade partners as staging points for attacks into their sectors',
  HAZARD_ZONES: 'Some sector connections have hazards that cause unit attrition',
  CONTESTED_ZONES: 'Some sector connections are contested with random combat events',
  CAMPAIGN_MODE: 'Enable multi-session campaign games (vs single-session oneshots)',
  SESSION_SUMMARIES: 'Show summary screens between game sessions',
};
