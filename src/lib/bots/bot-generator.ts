/**
 * Bot Empire Generator
 *
 * Creates bot empires for a game. Each bot gets:
 * - Unique persona from personas.json with name, archetype, and tier
 * - Tier-based selection (LLM Elite, Strategic, Simple, Random)
 * - Same starting resources/planets as player (9 planets)
 * - Initialized research & upgrades
 */

import { db } from "@/lib/db";
import { empires, planets, type NewEmpire, type NewPlanet, type Empire } from "@/lib/db/schema";
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
import personasData from "../../../data/personas.json";

// =============================================================================
// PERSONA TYPES
// =============================================================================

interface Persona {
  id: string;
  name: string;
  emperorName: string;
  archetype: BotArchetype;
  tier: number;
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
 * Maps tier numbers (1-4) to how many bots should be created.
 */
interface TierDistribution {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
}

/**
 * Get the tier distribution for a given bot count.
 * Distribution:
 * - 10 bots: 2 T1, 2 T2, 3 T3, 3 T4
 * - 25 bots: 5 T1, 6 T2, 7 T3, 7 T4
 * - 50 bots: 10 T1, 12 T2, 14 T3, 14 T4
 */
export function getTierDistribution(botCount: number): TierDistribution {
  switch (botCount) {
    case 10:
      return { tier1: 2, tier2: 2, tier3: 3, tier4: 3 };
    case 50:
      return { tier1: 10, tier2: 12, tier3: 14, tier4: 14 };
    case 25:
    default:
      return { tier1: 5, tier2: 6, tier3: 7, tier4: 7 };
  }
}

/**
 * Convert tier number (1-4) to BotTier enum value.
 */
function tierNumberToBotTier(tier: number): BotTier {
  switch (tier) {
    case 1:
      return "tier1_llm";
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
 */
export function selectPersonasForGame(botCount: number): Persona[] {
  const distribution = getTierDistribution(botCount);
  const selected: Persona[] = [];

  // Group personas by tier
  const tier1 = personas.filter((p) => p.tier === 1);
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

  // Select from each tier
  selected.push(...shuffle(tier1).slice(0, distribution.tier1));
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
 * Create a single bot empire with starting planets.
 * Follows the same pattern as createPlayerEmpire.
 *
 * @param gameId - Game to create bot for
 * @param name - Bot empire name
 * @param emperorName - Bot emperor name
 * @param archetype - Bot archetype (affects behavior in M9+)
 * @param tier - Bot tier (tier4_random for M5)
 */
export async function createBotEmpire(
  gameId: string,
  name: string,
  emperorName: string,
  archetype: BotArchetype,
  tier: BotTier = "tier4_random"
): Promise<Empire> {
  // Calculate starting networth (same as player)
  const networth = calculateNetworth({
    planetCount: TOTAL_STARTING_PLANETS,
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
    ...STARTING_RESOURCES,
    ...STARTING_MILITARY,
    ...STARTING_POPULATION,
    networth,
    planetCount: TOTAL_STARTING_PLANETS,
  };

  const [empire] = await db.insert(empires).values(empireData).returning();
  if (!empire) {
    throw new Error(`Failed to create bot empire: ${name}`);
  }

  // Create starting planets (same as player)
  await createBotStartingPlanets(empire.id, gameId);

  // Initialize M3 systems (research & upgrades)
  await initializeResearch(empire.id, gameId);
  await initializeUnitUpgrades(empire.id, gameId);

  return empire;
}

/**
 * Create the 9 starting planets for a bot empire.
 * Same distribution as player: 2 Food, 2 Ore, 1 Petroleum, 1 Tourism, 1 Urban, 1 Government, 1 Research
 */
async function createBotStartingPlanets(
  empireId: string,
  gameId: string
): Promise<void> {
  const planetValues: NewPlanet[] = [];

  for (const { type, count } of STARTING_PLANETS) {
    for (let i = 0; i < count; i++) {
      planetValues.push({
        empireId,
        gameId,
        type,
        productionRate: String(PLANET_PRODUCTION[type]),
        purchasePrice: PLANET_COSTS[type],
      });
    }
  }

  await db.insert(planets).values(planetValues);
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
    const tier = persona ? tierNumberToBotTier(persona.tier) : "tier4_random";

    const bot = await createBotEmpire(
      gameId,
      name,
      emperorName,
      archetype,
      tier
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
    const tier = persona ? tierNumberToBotTier(persona.tier) : "tier4_random";

    promises.push(
      createBotEmpire(gameId, name, emperorName, archetype, tier)
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
