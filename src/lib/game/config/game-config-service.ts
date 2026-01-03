/**
 * Game Configuration Service
 *
 * Manages per-game configuration overrides.
 * Loads default configs from JSON files and merges with game-specific overrides from the database.
 *
 * Supported config types:
 * - combat: Combat system configuration
 * - units: Unit stats and costs
 * - archetypes: Bot archetype behaviors
 * - resources: Resource production/consumption
 * - victory: Victory conditions
 */

import { db } from "@/lib/db";
import { gameConfigs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCombatConfig } from "./combat-loader";
import { getUnitStats } from "./unit-loader";
import { getArchetypeConfigs } from "./archetype-loader";

// =============================================================================
// TYPES
// =============================================================================

export type ConfigType = "combat" | "units" | "archetypes" | "resources" | "victory";

export type ConfigOverrides = Record<string, unknown>;

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Load a configuration with game-specific overrides applied.
 *
 * @param gameId - The game ID to load config for
 * @param configType - The type of configuration to load
 * @returns The configuration with overrides applied
 *
 * @example
 * const combatConfig = await loadGameConfig(gameId, "combat");
 * console.log(combatConfig.unified.defenderBonus); // 1.15 (overridden from 1.10)
 */
export async function loadGameConfig<T = unknown>(
  gameId: string,
  configType: ConfigType
): Promise<T> {
  // Load default config
  const defaultConfig = loadDefaultConfig(configType);

  // Load game overrides
  const overrides = await getGameConfigOverrides(gameId, configType);

  // Merge overrides with defaults
  return mergeConfig(defaultConfig, overrides) as T;
}

/**
 * Set configuration overrides for a specific game.
 *
 * @param gameId - The game ID to set overrides for
 * @param configType - The type of configuration
 * @param overrides - The override values (partial config)
 *
 * @example
 * await setGameConfigOverride(gameId, "combat", {
 *   unified: { defenderBonus: 1.15 }
 * });
 */
export async function setGameConfigOverride(
  gameId: string,
  configType: ConfigType,
  overrides: ConfigOverrides
): Promise<void> {
  // Check if override already exists
  const existing = await db
    .select()
    .from(gameConfigs)
    .where(
      and(
        eq(gameConfigs.gameId, gameId),
        eq(gameConfigs.configType, configType)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing override
    await db
      .update(gameConfigs)
      .set({ overrides })
      .where(eq(gameConfigs.id, existing[0]!.id));
  } else {
    // Insert new override
    await db.insert(gameConfigs).values({
      gameId,
      configType,
      overrides,
    });
  }
}

/**
 * Clear configuration overrides for a specific game and config type.
 *
 * @param gameId - The game ID to clear overrides for
 * @param configType - The type of configuration to clear
 *
 * @example
 * await clearGameConfigOverride(gameId, "combat");
 */
export async function clearGameConfigOverride(
  gameId: string,
  configType: ConfigType
): Promise<void> {
  await db
    .delete(gameConfigs)
    .where(
      and(
        eq(gameConfigs.gameId, gameId),
        eq(gameConfigs.configType, configType)
      )
    );
}

/**
 * Check if a game has any configuration overrides.
 *
 * @param gameId - The game ID to check
 * @returns True if the game has any overrides
 *
 * @example
 * const hasOverrides = await hasGameConfigOverrides(gameId);
 * if (hasOverrides) {
 *   console.log("Game has custom configuration");
 * }
 */
export async function hasGameConfigOverrides(gameId: string): Promise<boolean> {
  const overrides = await db
    .select()
    .from(gameConfigs)
    .where(eq(gameConfigs.gameId, gameId))
    .limit(1);

  return overrides.length > 0;
}

/**
 * Get all configuration overrides for a game.
 *
 * @param gameId - The game ID to get overrides for
 * @returns Record of config types to their overrides
 *
 * @example
 * const allOverrides = await getAllGameConfigOverrides(gameId);
 * console.log(allOverrides.combat); // { unified: { defenderBonus: 1.15 } }
 */
export async function getAllGameConfigOverrides(
  gameId: string
): Promise<Record<ConfigType, ConfigOverrides | null>> {
  const overrides = await db
    .select()
    .from(gameConfigs)
    .where(eq(gameConfigs.gameId, gameId));

  const result: Record<string, ConfigOverrides | null> = {
    combat: null,
    units: null,
    archetypes: null,
    resources: null,
    victory: null,
  };

  for (const override of overrides) {
    result[override.configType] = override.overrides as ConfigOverrides;
  }

  return result as Record<ConfigType, ConfigOverrides | null>;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Load the default configuration for a config type.
 */
function loadDefaultConfig(configType: ConfigType): unknown {
  switch (configType) {
    case "combat":
      return getCombatConfig();
    case "units":
      return getUnitStats();
    case "archetypes":
      return getArchetypeConfigs();
    case "resources":
      // TODO: Implement resource config loader
      return {};
    case "victory":
      // TODO: Implement victory config loader
      return {};
    default:
      throw new Error(`Unknown config type: ${configType}`);
  }
}

/**
 * Get configuration overrides from the database.
 */
async function getGameConfigOverrides(
  gameId: string,
  configType: ConfigType
): Promise<ConfigOverrides | null> {
  const result = await db
    .select()
    .from(gameConfigs)
    .where(
      and(
        eq(gameConfigs.gameId, gameId),
        eq(gameConfigs.configType, configType)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0]!.overrides as ConfigOverrides;
}

/**
 * Deep merge configuration overrides with defaults.
 */
function mergeConfig(
  defaultConfig: unknown,
  overrides: ConfigOverrides | null
): unknown {
  if (!overrides) {
    return defaultConfig;
  }

  if (typeof defaultConfig !== "object" || defaultConfig === null) {
    return defaultConfig;
  }

  const merged = { ...defaultConfig };

  for (const [key, value] of Object.entries(overrides)) {
    if (key in merged) {
      const defaultValue = (merged as Record<string, unknown>)[key];
      
      if (
        typeof value === "object" &&
        value !== null &&
        typeof defaultValue === "object" &&
        defaultValue !== null &&
        !Array.isArray(value) &&
        !Array.isArray(defaultValue)
      ) {
        // Recursively merge objects
        (merged as Record<string, unknown>)[key] = mergeConfig(
          defaultValue,
          value as ConfigOverrides
        );
      } else {
        // Override primitive or array values
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  return merged;
}
