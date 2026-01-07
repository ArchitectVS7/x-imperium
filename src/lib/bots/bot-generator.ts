/**
 * Bot Empire Generator
 *
 * Creates bot empires for a game. Each bot gets:
 * - Unique persona from personas.json with name, archetype, and tier
 * - Tier-based selection (LLM Elite, Strategic, Simple, Random)
 * - Same starting resources/sectors as player (9 sectors)
 * - Initialized research & upgrades
 */

import { db } from "@/lib/db";
import { empires, sectors, type NewEmpire, type NewSector, type Empire } from "@/lib/db/schema";
import {
  STARTING_RESOURCES,
  STARTING_MILITARY,
  STARTING_POPULATION,
  STARTING_PLANETS,
  PLANET_PRODUCTION,
  PLANET_COSTS,
  TOTAL_STARTING_PLANETS,
} from "@/lib/game/constants";
import { calculateNetworth } from "@/lib/game/networth";
import { initializeResearch } from "@/lib/game/services/research-service";
import { initializeUnitUpgrades } from "@/lib/game/services/upgrade-service";
import { getBotEmpireName, getBotEmperorName } from "./bot-names";
import type { BotArchetype, BotTier } from "./types";
import personasData from "@/data/personas.json";

// =============================================================================
// PERSONA TYPES
// =============================================================================

interface Persona {
  id: string;
  name: string;
  emperorName: string;
  archetype: BotArchetype;
  tier: number;
  /** Whether this Tier 1 bot uses LLM API for decisions */
  llmEnabled?: boolean;
  voice: {
    tone: string;
    quirks: string[];
    vocabulary: string[];
    catchphrase: string;
  };
  tellRate: number;
}

// Type assertion for imported JSON
const personas = personasData as Persona[];

// =============================================================================
// TIER DISTRIBUTION
// =============================================================================

/**
 * Tier distribution for different bot counts.
 * Maps tiers to how many bots should be created.
 *
 * User Vision (100 bots):
 * - 25 Tier 4 (Random/Chaos)
 * - 25 Tier 3 (Mid-tier/Simple)
 * - 25 Tier 2 (Strategic)
 * - 15 Tier 1 Elite Scripted (sophisticated algorithms, no LLM)
 * - 10 Tier 1 LLM (uses LLM API for custom strategy)
 */
interface TierDistribution {
  tier1_llm: number;
  tier1_elite_scripted: number;
  tier2: number;
  tier3: number;
  tier4: number;
}

/**
 * Get the tier distribution for a given bot count.
 * Scaled proportionally from the 100-bot baseline.
 *
 * 100 bots: 10 T1-LLM, 15 T1-Scripted, 25 T2, 25 T3, 25 T4
 * 50 bots:  5 T1-LLM,  8 T1-Scripted, 12 T2, 12 T3, 13 T4
 * 25 bots:  2 T1-LLM,  4 T1-Scripted,  6 T2,  6 T3,  7 T4
 * 10 bots:  1 T1-LLM,  2 T1-Scripted,  2 T2,  2 T3,  3 T4
 */
export function getTierDistribution(botCount: number): TierDistribution {
  switch (botCount) {
    case 100:
      // Full distribution per user vision
      return {
        tier1_llm: 10,
        tier1_elite_scripted: 15,
        tier2: 25,
        tier3: 25,
        tier4: 25,
      };
    case 50:
      // Scaled down proportionally
      return {
        tier1_llm: 5,
        tier1_elite_scripted: 8,
        tier2: 12,
        tier3: 12,
        tier4: 13,
      };
    case 25:
      return {
        tier1_llm: 2,
        tier1_elite_scripted: 4,
        tier2: 6,
        tier3: 6,
        tier4: 7,
      };
    case 10:
      return {
        tier1_llm: 1,
        tier1_elite_scripted: 2,
        tier2: 2,
        tier3: 2,
        tier4: 3,
      };
    default:
      // Default to 25 distribution
      return {
        tier1_llm: 2,
        tier1_elite_scripted: 4,
        tier2: 6,
        tier3: 6,
        tier4: 7,
      };
  }
}

/**
 * Convert tier number (1-4) to BotTier enum value.
 * For tier 1, uses llmEnabled to distinguish between LLM and scripted.
 */
function tierNumberToBotTier(tier: number, llmEnabled: boolean = false): BotTier {
  switch (tier) {
    case 1:
      return llmEnabled ? "tier1_llm" : "tier1_elite_scripted";
    case 2:
      return "tier2_strategic";
    case 3:
      return "tier3_simple";
    case 4:
    default:
      return "tier4_random";
  }
}

/**
 * Select personas based on tier distribution.
 * Shuffles within each tier to randomize selection.
 * For Tier 1, separates LLM-enabled from scripted personas.
 */
export function selectPersonasForGame(botCount: number): Persona[] {
  const distribution = getTierDistribution(botCount);
  const selected: Persona[] = [];

  // Group personas by tier
  // Tier 1 is split into LLM-enabled and scripted
  const tier1All = personas.filter((p) => p.tier === 1);
  const tier1LLM = tier1All.filter((p) => p.llmEnabled === true);
  const tier1Scripted = tier1All.filter((p) => p.llmEnabled !== true);
  const tier2 = personas.filter((p) => p.tier === 2);
  const tier3 = personas.filter((p) => p.tier === 3);
  const tier4 = personas.filter((p) => p.tier === 4);

  // Shuffle function
  const shuffle = <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  };

  // Select from each tier (respecting the new distribution)
  selected.push(...shuffle(tier1LLM).slice(0, distribution.tier1_llm));
  selected.push(...shuffle(tier1Scripted).slice(0, distribution.tier1_elite_scripted));
  selected.push(...shuffle(tier2).slice(0, distribution.tier2));
  selected.push(...shuffle(tier3).slice(0, distribution.tier3));
  selected.push(...shuffle(tier4).slice(0, distribution.tier4));

  // Final shuffle to mix tiers
  return shuffle(selected);
}

// =============================================================================
// ARCHETYPES (for fallback)
// =============================================================================

const BOT_ARCHETYPES: BotArchetype[] = [
  "warlord",
  "diplomat",
  "merchant",
  "schemer",
  "turtle",
  "blitzkrieg",
  "tech_rush",
  "opportunist",
];

/**
 * Get a random archetype for a bot.
 * Used as fallback when persona data is not available.
 */
export function getRandomArchetype(): BotArchetype {
  const index = Math.floor(Math.random() * BOT_ARCHETYPES.length);
  return BOT_ARCHETYPES[index] ?? "opportunist";
}

// =============================================================================
// BOT EMPIRE CREATION
// =============================================================================

/**
 * Create a single bot empire with starting sectors.
 * Follows the same pattern as createPlayerEmpire.
 *
 * @param gameId - Game to create bot for
 * @param name - Bot empire name
 * @param emperorName - Bot emperor name
 * @param archetype - Bot archetype (affects behavior in M9+)
 * @param tier - Bot tier (tier4_random for M5)
 * @param llmEnabled - Whether this bot uses LLM API for decisions
 */
export async function createBotEmpire(
  gameId: string,
  name: string,
  emperorName: string,
  archetype: BotArchetype,
  tier: BotTier = "tier4_random",
  llmEnabled: boolean = false
): Promise<Empire> {
  // Calculate starting networth (same as player)
  const networth = calculateNetworth({
    sectorCount: TOTAL_STARTING_PLANETS,
    ...STARTING_MILITARY,
  });

  // Create the empire
  const empireData: NewEmpire = {
    gameId,
    name,
    emperorName,
    type: "bot",
    botTier: tier,
    botArchetype: archetype,
    llmEnabled,
    ...STARTING_RESOURCES,
    ...STARTING_MILITARY,
    ...STARTING_POPULATION,
    networth,
    sectorCount: TOTAL_STARTING_PLANETS,
  };

  const [empire] = await db.insert(empires).values(empireData).returning();
  if (!empire) {
    throw new Error(`Failed to create bot empire: ${name}`);
  }

  // Create starting sectors (same as player)
  await createBotStartingPlanets(empire.id, gameId);

  // Initialize M3 systems (research & upgrades)
  await initializeResearch(empire.id, gameId);
  await initializeUnitUpgrades(empire.id, gameId);

  return empire;
}

/**
 * Create the 9 starting sectors for a bot empire.
 * Same distribution as player: 2 Food, 2 Ore, 1 Petroleum, 1 Tourism, 1 Urban, 1 Government, 1 Research
 */
async function createBotStartingPlanets(
  empireId: string,
  gameId: string
): Promise<void> {
  const sectorValues: NewSector[] = [];

  for (const { type, count } of STARTING_PLANETS) {
    for (let i = 0; i < count; i++) {
      sectorValues.push({
        empireId,
        gameId,
        type,
        productionRate: String(PLANET_PRODUCTION[type]),
        purchasePrice: PLANET_COSTS[type],
      });
    }
  }

  await db.insert(sectors).values(sectorValues);
}

// =============================================================================
// BATCH BOT CREATION
// =============================================================================

/**
 * Create all bot empires for a game using persona-based selection.
 * Selects personas based on tier distribution for variety.
 *
 * @param gameId - Game to create bots for
 * @param count - Number of bots to create (default 25)
 * @returns Array of created bot empires
 */
export async function createBotEmpires(
  gameId: string,
  count: number = 25
): Promise<Empire[]> {
  const bots: Empire[] = [];

  // Select personas with tier-based distribution
  const selectedPersonas = selectPersonasForGame(count);

  for (let i = 0; i < count; i++) {
    const persona = selectedPersonas[i];

    // Use persona data if available, otherwise fall back to generic names
    const name = persona?.name ?? getBotEmpireName(i);
    const emperorName = persona?.emperorName ?? getBotEmperorName(i);
    const archetype = (persona?.archetype as BotArchetype) ?? getRandomArchetype();
    const llmEnabled = persona?.llmEnabled ?? false;
    const tier = persona ? tierNumberToBotTier(persona.tier, llmEnabled) : "tier4_random";

    const bot = await createBotEmpire(
      gameId,
      name,
      emperorName,
      archetype,
      tier,
      llmEnabled
    );

    bots.push(bot);
  }

  return bots;
}

/**
 * Create bot empires in parallel for better performance.
 * Uses Promise.all to create bots concurrently with persona-based selection.
 *
 * Note: This may cause database connection issues with too many concurrent inserts.
 * Use createBotEmpires for safer sequential creation.
 *
 * @param gameId - Game to create bots for
 * @param count - Number of bots to create (default 25)
 * @returns Array of created bot empires
 */
export async function createBotEmpiresParallel(
  gameId: string,
  count: number = 25
): Promise<Empire[]> {
  const promises: Promise<Empire>[] = [];

  // Select personas with tier-based distribution
  const selectedPersonas = selectPersonasForGame(count);

  for (let i = 0; i < count; i++) {
    const persona = selectedPersonas[i];

    const name = persona?.name ?? getBotEmpireName(i);
    const emperorName = persona?.emperorName ?? getBotEmperorName(i);
    const archetype = (persona?.archetype as BotArchetype) ?? getRandomArchetype();
    const llmEnabled = persona?.llmEnabled ?? false;
    const tier = persona ? tierNumberToBotTier(persona.tier, llmEnabled) : "tier4_random";

    promises.push(
      createBotEmpire(gameId, name, emperorName, archetype, tier, llmEnabled)
    );
  }

  return Promise.all(promises);
}

/**
 * Get all available personas (for debugging/testing).
 */
export function getAllPersonas(): Persona[] {
  return personas;
}

/**
 * Get persona by ID.
 */
export function getPersonaById(id: string): Persona | undefined {
  return personas.find((p) => p.id === id);
}
