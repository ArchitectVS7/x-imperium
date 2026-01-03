/**
 * Difficulty Preset Loader
 *
 * Manages difficulty presets for game configuration.
 * Presets control player advantages, bot bonuses, combat modifiers, and economy settings.
 *
 * Difficulty Levels:
 * - Easy: Player advantages (20% income, 2000 credits start, reduced costs)
 * - Normal: Balanced gameplay (default values)
 * - Hard: Bot advantages (15% income, more aggressive, 5% combat bonus)
 * - Nightmare: Major bot advantages (30% income, 10% combat bonus, -1000 credits start)
 */

import { db } from "@/lib/db";
import { gameConfigs, empires, games } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import difficultyPresetsData from "@/../data/difficulty-presets.json";
import type { Difficulty } from "@/lib/bots/types";

// =============================================================================
// TYPES
// =============================================================================

export interface PlayerModifiers {
  /** Bonus credits at game start (negative for nightmare) */
  startingCreditsBonus: number;
  /** Income multiplier (1.20 = +20% income) */
  incomeMultiplier: number;
  /** Planet purchase cost multiplier (0.85 = -15% cost) */
  planetCostReduction: number;
  /** Unit build cost multiplier (0.90 = -10% cost) */
  unitCostReduction: number;
  /** Research speed multiplier (1.15 = +15% faster) */
  researchSpeedBonus: number;
}

export interface BotModifiers {
  /** Bot income multiplier (1.30 = +30% income) */
  incomeMultiplier: number;
  /** Threshold modifier for attack decisions (+0.10 = 10% more cautious) */
  attackThresholdModifier: number;
  /** Chance of making suboptimal choices (0.50 = 50% for easy) */
  suboptimalChance: number;
  /** Whether bots target weakest enemies */
  targetWeakest: boolean;
  /** Combat power multiplier (1.10 = +10% combat power) */
  combatPowerMultiplier: number;
  /** Build queue speed multiplier (1.20 = 20% faster builds) */
  buildSpeedMultiplier: number;
  /** Research speed multiplier (1.15 = 15% faster research) */
  researchSpeedMultiplier: number;
}

export interface CombatModifiers {
  /** Base defender bonus (1.10 = 10% bonus) */
  defenderBonus: number;
  /** Additional defense bonus for player (1.05 = 5% bonus on easy) */
  playerDefenseBonus: number;
}

export interface EconomyModifiers {
  /** Market price volatility (0.80 = less volatile on easy) */
  marketPriceVolatility: number;
  /** Maintenance cost multiplier (0.90 = -10% costs on easy) */
  maintenanceCostMultiplier: number;
}

export interface DifficultyPreset {
  name: string;
  description: string;
  player: PlayerModifiers;
  bots: BotModifiers;
  combat: CombatModifiers;
  economy: EconomyModifiers;
}

export type DifficultyPresets = Record<Difficulty, DifficultyPreset>;

// =============================================================================
// PRESET LOADING
// =============================================================================

/**
 * Get all difficulty presets from JSON file.
 *
 * @returns All difficulty presets (easy, normal, hard, nightmare)
 *
 * @example
 * const presets = getDifficultyPresets();
 * console.log(presets.easy.player.incomeMultiplier); // 1.20
 */
export function getDifficultyPresets(): DifficultyPresets {
  return difficultyPresetsData as DifficultyPresets;
}

/**
 * Get a specific difficulty preset.
 *
 * @param level - Difficulty level to load
 * @returns The difficulty preset configuration
 *
 * @example
 * const hardPreset = getDifficultyPreset("hard");
 * console.log(hardPreset.bots.incomeMultiplier); // 1.15
 */
export function getDifficultyPreset(level: Difficulty): DifficultyPreset {
  const presets = getDifficultyPresets();
  return presets[level];
}

// =============================================================================
// GAME CONFIG INTEGRATION
// =============================================================================

/**
 * Apply a difficulty preset to a game's configuration.
 *
 * Stores the difficulty modifiers in the game_configs table as overrides.
 * This allows the game to use these modifiers during turn processing.
 *
 * @param gameId - Game UUID to apply preset to
 * @param level - Difficulty level to apply
 *
 * @example
 * await applyDifficultyPreset(gameId, "hard");
 * // Now the game will use hard difficulty modifiers
 */
export async function applyDifficultyPreset(
  gameId: string,
  level: Difficulty
): Promise<void> {
  const preset = getDifficultyPreset(level);

  // Store combat modifiers as combat config override
  const combatOverride = {
    difficulty: {
      level,
      defenderBonus: preset.combat.defenderBonus,
      playerDefenseBonus: preset.combat.playerDefenseBonus,
    },
  };

  await upsertGameConfig(gameId, "combat", combatOverride);

  // Store economy modifiers as resources config override
  const economyOverride = {
    difficulty: {
      level,
      player: preset.player,
      bots: preset.bots,
      marketPriceVolatility: preset.economy.marketPriceVolatility,
      maintenanceCostMultiplier: preset.economy.maintenanceCostMultiplier,
    },
  };

  await upsertGameConfig(gameId, "resources", economyOverride);

  // Update game difficulty level
  await db
    .update(games)
    .set({ difficulty: level })
    .where(eq(games.id, gameId));
}

/**
 * Get active difficulty modifiers for a game.
 *
 * Loads the difficulty settings from game_configs or falls back to game.difficulty.
 *
 * @param gameId - Game UUID to load modifiers for
 * @returns The active difficulty modifiers
 *
 * @example
 * const modifiers = await getDifficultyModifiers(gameId);
 * console.log(modifiers.bots.incomeMultiplier); // 1.30 for nightmare
 */
export async function getDifficultyModifiers(
  gameId: string
): Promise<DifficultyPreset> {
  // Load game to get difficulty level
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  const difficulty = (game.difficulty as Difficulty) || "normal";

  // Try to load from game_configs
  const economyConfig = await db.query.gameConfigs.findFirst({
    where: and(
      eq(gameConfigs.gameId, gameId),
      eq(gameConfigs.configType, "resources")
    ),
  });

  const combatConfig = await db.query.gameConfigs.findFirst({
    where: and(
      eq(gameConfigs.gameId, gameId),
      eq(gameConfigs.configType, "combat")
    ),
  });

  // If configs exist, merge with preset
  const preset = getDifficultyPreset(difficulty);

  if (economyConfig || combatConfig) {
    return {
      ...preset,
      player: {
        ...preset.player,
        ...(economyConfig?.overrides as Record<string, unknown>)?.difficulty
          ?.player as PlayerModifiers | undefined,
      },
      bots: {
        ...preset.bots,
        ...(economyConfig?.overrides as Record<string, unknown>)?.difficulty
          ?.bots as BotModifiers | undefined,
      },
      combat: {
        ...preset.combat,
        ...(combatConfig?.overrides as Record<string, unknown>)?.difficulty as
          | CombatModifiers
          | undefined,
      },
      economy: {
        ...preset.economy,
        marketPriceVolatility:
          ((economyConfig?.overrides as Record<string, unknown>)?.difficulty as { marketPriceVolatility?: number })
            ?.marketPriceVolatility ?? preset.economy.marketPriceVolatility,
        maintenanceCostMultiplier:
          ((economyConfig?.overrides as Record<string, unknown>)?.difficulty as { maintenanceCostMultiplier?: number })
            ?.maintenanceCostMultiplier ?? preset.economy.maintenanceCostMultiplier,
      },
    };
  }

  // Return default preset
  return preset;
}

/**
 * Get bot modifiers for a specific empire.
 *
 * Returns bot modifiers if the empire is a bot, otherwise returns null.
 * Useful for applying difficulty bonuses during turn processing.
 *
 * @param empireId - Empire UUID to check
 * @param gameId - Game UUID
 * @returns Bot modifiers if bot empire, null if player
 *
 * @example
 * const botMods = await getBotModifiers(empireId, gameId);
 * if (botMods) {
 *   const bonusIncome = baseIncome * botMods.incomeMultiplier;
 * }
 */
export async function getBotModifiers(
  empireId: string,
  gameId: string
): Promise<BotModifiers | null> {
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire || empire.type !== "bot") {
    return null;
  }

  const modifiers = await getDifficultyModifiers(gameId);
  return modifiers.bots;
}

/**
 * Get player modifiers for a game.
 *
 * Returns player modifiers for the game's difficulty level.
 * Useful for applying difficulty bonuses to the player empire.
 *
 * @param gameId - Game UUID
 * @returns Player modifiers for the game
 *
 * @example
 * const playerMods = await getPlayerModifiers(gameId);
 * const startingCredits = 100000 + playerMods.startingCreditsBonus;
 */
export async function getPlayerModifiers(
  gameId: string
): Promise<PlayerModifiers> {
  const modifiers = await getDifficultyModifiers(gameId);
  return modifiers.player;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Upsert a game config override.
 * Updates existing config or inserts new one.
 */
async function upsertGameConfig(
  gameId: string,
  configType: "combat" | "units" | "archetypes" | "resources" | "victory",
  overrides: Record<string, unknown>
): Promise<void> {
  const existing = await db
    .select()
    .from(gameConfigs)
    .where(
      and(eq(gameConfigs.gameId, gameId), eq(gameConfigs.configType, configType))
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(gameConfigs)
      .set({ overrides })
      .where(eq(gameConfigs.id, existing[0]!.id));
  } else {
    // Insert new
    await db.insert(gameConfigs).values({
      gameId,
      configType,
      overrides,
    });
  }
}

/**
 * Check if a game has custom difficulty modifiers.
 *
 * @param gameId - Game UUID to check
 * @returns True if the game has custom difficulty configs
 */
export async function hasCustomDifficultyModifiers(
  gameId: string
): Promise<boolean> {
  const configs = await db
    .select()
    .from(gameConfigs)
    .where(eq(gameConfigs.gameId, gameId));

  return configs.some(
    (c) =>
      (c.configType === "combat" || c.configType === "resources") &&
      (c.overrides as Record<string, unknown>)?.difficulty !== undefined
  );
}

/**
 * Clear custom difficulty modifiers for a game.
 * Resets the game to use default difficulty preset values.
 *
 * @param gameId - Game UUID to reset
 */
export async function clearCustomDifficultyModifiers(
  gameId: string
): Promise<void> {
  // Remove difficulty overrides from combat config
  const combatConfig = await db.query.gameConfigs.findFirst({
    where: and(
      eq(gameConfigs.gameId, gameId),
      eq(gameConfigs.configType, "combat")
    ),
  });

  if (combatConfig) {
    const overrides = combatConfig.overrides as Record<string, unknown>;
    delete overrides.difficulty;
    await db
      .update(gameConfigs)
      .set({ overrides })
      .where(eq(gameConfigs.id, combatConfig.id));
  }

  // Remove difficulty overrides from resources config
  const resourcesConfig = await db.query.gameConfigs.findFirst({
    where: and(
      eq(gameConfigs.gameId, gameId),
      eq(gameConfigs.configType, "resources")
    ),
  });

  if (resourcesConfig) {
    const overrides = resourcesConfig.overrides as Record<string, unknown>;
    delete overrides.difficulty;
    await db
      .update(gameConfigs)
      .set({ overrides })
      .where(eq(gameConfigs.id, resourcesConfig.id));
  }
}
