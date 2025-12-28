/**
 * Empire Factory
 *
 * Creates simulated empires for bot battle testing.
 * Mirrors the real game's starting configuration.
 */

import type { SimulatedEmpire, SimulatedPlanet, SimulationConfig } from "./types";
import type { BotArchetype, PlanetType } from "@/lib/bots/types";
import { PLANET_PRODUCTION, STARTING_CREDITS, STARTING_POPULATION } from "@/lib/game/constants";
import { calculateNetworth } from "@/lib/game/networth";

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

// Starting planet configuration (PRD 5.1)
const STARTING_PLANETS: PlanetType[] = [
  "food", "food",           // 2 Food planets
  "ore", "ore",             // 2 Ore planets
  "petroleum",              // 1 Petroleum planet
  "tourism",                // 1 Tourism planet
  "urban",                  // 1 Urban planet
  "government",             // 1 Government planet
  "research"                // 1 Research planet
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
  customName?: string
): SimulatedEmpire {
  const id = `empire-${index}`;
  const name = customName ?? (isPlayer ? "Player Empire" : `Empire ${BOT_NAMES[index] ?? index}`);
  const planets = createStartingPlanets(id);

  const empire: SimulatedEmpire = {
    id,
    name,
    archetype,

    // Starting resources (from constants)
    credits: STARTING_CREDITS ?? 50000,
    food: 1000,
    ore: 500,
    petroleum: 200,
    researchPoints: 0,

    // Population
    population: STARTING_POPULATION ?? 10000,
    populationCap: 100000,
    civilStatus: "content",

    // Starting military (modest defensive force)
    soldiers: 100,
    fighters: 20,
    stations: 2,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 5,
    covertAgents: 10,
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
    planetCount: empire.planets.length,
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
      empires.push(createSimulatedEmpire(i, customBot.archetype, false, customBot.name));
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
