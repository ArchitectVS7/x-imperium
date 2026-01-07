/**
 * Empire Factory
 *
 * Creates simulated empires for bot battle testing.
 * Mirrors the real game's starting configuration.
 */

import type { SimulatedEmpire, SimulatedPlanet, SimulationConfig, BotTier } from "./types";
import type { BotArchetype, PlanetType } from "@/lib/bots/types";
import { PLANET_PRODUCTION, STARTING_RESOURCES, STARTING_POPULATION as STARTING_POP } from "@/lib/game/constants";
import { calculateNetworth } from "@/lib/game/networth";

// =============================================================================
// TIER SYSTEM
// =============================================================================

export interface TierModifiers {
  resourceMultiplier: number; // Starting resource bonus
  unitMultiplier: number; // Starting unit bonus
}

export const TIER_MODIFIERS: Record<BotTier, TierModifiers> = {
  overpowered: {
    resourceMultiplier: 2.0,  // 2× starting credits/resources
    unitMultiplier: 3.0,      // 3× starting military (300 soldiers, 60 fighters, etc.)
  },
  normal: {
    resourceMultiplier: 1.0,
    unitMultiplier: 1.0,
  },
  underpowered: {
    resourceMultiplier: 0.5,  // Half starting resources
    unitMultiplier: 0.4,      // 40% starting military (40 soldiers, 8 fighters)
  },
};

// Re-export BotTier for convenience
export type { BotTier };

// Bot names for variety
const BOT_NAMES = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
  "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
  "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega",
  "Nexus", "Vortex", "Zenith", "Nova", "Apex", "Prism", "Helix", "Quasar",
  "Nebula", "Pulsar", "Titan", "Atlas", "Orion", "Phoenix", "Helios", "Kronos"
];

const ARCHETYPES: BotArchetype[] = [
  "warlord", "diplomat", "merchant", "schemer",
  "turtle", "blitzkrieg", "tech_rush", "opportunist"
];

// Starting planet configuration - reduced to 5 for faster eliminations (see IMPLEMENTATION-PLAN.md M1.1)
// Players must purchase Research planets, encouraging strategic choices early game
const STARTING_PLANETS: PlanetType[] = [
  "food",                   // 1 Food planet (reduced from 2)
  "ore",                    // 1 Ore planet (reduced from 2)
  "petroleum",              // 1 Petroleum planet
  "tourism",                // 1 Tourism planet
  "government",             // 1 Government planet (keeps covert ops capacity)
];

/**
 * Create a simulated planet
 */
function createPlanet(type: PlanetType, index: number, empireId: string): SimulatedPlanet {
  return {
    id: `${empireId}-planet-${index}`,
    type,
    productionRate: PLANET_PRODUCTION[type] ?? 0,
  };
}

/**
 * Create starting planets for an empire
 */
function createStartingPlanets(empireId: string): SimulatedPlanet[] {
  return STARTING_PLANETS.map((type, index) => createPlanet(type, index, empireId));
}

/**
 * Create a single simulated empire
 */
export function createSimulatedEmpire(
  index: number,
  archetype: BotArchetype,
  isPlayer: boolean = false,
  customName?: string,
  tier: BotTier = "normal"
): SimulatedEmpire {
  const id = `empire-${index}`;
  const name = customName ?? (isPlayer ? "Player Empire" : `Empire ${BOT_NAMES[index] ?? index}`);
  const planets = createStartingPlanets(id);

  // Get tier modifiers
  const modifiers = TIER_MODIFIERS[tier];
  const resourceMult = modifiers.resourceMultiplier;
  const unitMult = modifiers.unitMultiplier;

  const empire: SimulatedEmpire = {
    id,
    name,
    archetype,

    // Starting resources (scaled by tier)
    credits: Math.floor(STARTING_RESOURCES.credits * resourceMult),
    food: Math.floor(STARTING_RESOURCES.food * resourceMult),
    ore: Math.floor(STARTING_RESOURCES.ore * resourceMult),
    petroleum: Math.floor(STARTING_RESOURCES.petroleum * resourceMult),
    researchPoints: 0,

    // Population
    population: STARTING_POP.population,
    populationCap: STARTING_POP.populationCap,
    civilStatus: "content",

    // Starting military (scaled by tier)
    soldiers: Math.floor(100 * unitMult),
    fighters: Math.floor(20 * unitMult),
    stations: Math.floor(2 * unitMult),
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: Math.floor(5 * unitMult),
    covertAgents: Math.floor(10 * unitMult),
    armyEffectiveness: 100,

    // Planets
    planets,

    // State
    isEliminated: false,

    // Stats
    researchLevel: 0,
    covertPoints: 0,
    networth: 0,
  };

  // Calculate initial networth
  empire.networth = calculateSimulatedNetworth(empire);

  return empire;
}

/**
 * Calculate networth for a simulated empire
 */
export function calculateSimulatedNetworth(empire: SimulatedEmpire): number {
  return calculateNetworth({
    sectorCount: empire.planets.length,
    soldiers: empire.soldiers,
    fighters: empire.fighters,
    stations: empire.stations,
    lightCruisers: empire.lightCruisers,
    heavyCruisers: empire.heavyCruisers,
    carriers: empire.carriers,
    covertAgents: empire.covertAgents,
  });
}

/**
 * Select an archetype based on distribution or random
 */
function selectArchetype(
  index: number,
  distribution?: Partial<Record<BotArchetype, number>>,
  rng: () => number = Math.random
): BotArchetype {
  if (!distribution) {
    // Random selection
    return ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)]!;
  }

  // Weighted selection based on distribution
  const weights: [BotArchetype, number][] = [];
  let totalWeight = 0;

  for (const archetype of ARCHETYPES) {
    const weight = distribution[archetype] ?? 1;
    weights.push([archetype, weight]);
    totalWeight += weight;
  }

  let roll = rng() * totalWeight;
  for (const [archetype, weight] of weights) {
    roll -= weight;
    if (roll <= 0) {
      return archetype;
    }
  }

  return ARCHETYPES[0]!;
}

/**
 * Create all empires for a simulation
 */
export function createEmpires(config: SimulationConfig): SimulatedEmpire[] {
  const empires: SimulatedEmpire[] = [];

  // Create seeded RNG if seed provided
  const rng = config.seed !== undefined ? seededRandom(config.seed) : Math.random;

  // Determine empire count (support both empireCount and botCount)
  const empireCount = config.empireCount ?? config.botCount ?? 4;

  // Use custom bots if provided
  if (config.customBots && config.customBots.length > 0) {
    for (let i = 0; i < config.customBots.length; i++) {
      const customBot = config.customBots[i]!;
      empires.push(
        createSimulatedEmpire(
          i,
          customBot.archetype,
          false,
          customBot.name,
          customBot.tier ?? "normal"
        )
      );
    }
    return empires;
  }

  // Default behavior: random archetypes
  for (let i = 0; i < empireCount; i++) {
    const isPlayer = config.includePlayer && i === 0;
    const archetype = selectArchetype(i, config.archetypeDistribution, rng);

    empires.push(createSimulatedEmpire(i, archetype, isPlayer));
  }

  return empires;
}

/**
 * Simple seeded random number generator (LCG)
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2147483648;
    return state / 2147483648;
  };
}
