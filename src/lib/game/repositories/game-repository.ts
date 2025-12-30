import { db } from "@/lib/db";
import {
  games,
  empires,
  planets,
  galaxyRegions,
  regionConnections,
  empireInfluence,
  type NewEmpire,
  type NewPlanet,
  type Game,
  type Empire,
  type Planet,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  STARTING_RESOURCES,
  STARTING_MILITARY,
  STARTING_POPULATION,
  STARTING_PLANETS,
  PLANET_PRODUCTION,
  PLANET_COSTS,
  TOTAL_STARTING_PLANETS,
} from "../constants";
import { calculateNetworth } from "../networth";
import { initializeResearch } from "../services/research-service";
import { initializeUnitUpgrades } from "../services/upgrade-service";
import { createBotEmpires } from "@/lib/bots/bot-generator";
import type { Difficulty } from "@/lib/bots/types";
import { initializeMarketPrices } from "@/lib/market";
import {
  generateGalaxy,
  createSeededRandom,
} from "../services/galaxy-generation-service";

// =============================================================================
// GAME OPERATIONS
// =============================================================================

/**
 * Create a new game instance.
 */
export async function createGame(name: string): Promise<Game> {
  const [game] = await db.insert(games).values({ name }).returning();
  if (!game) {
    throw new Error("Failed to create game");
  }
  return game;
}

/**
 * Get a game by ID.
 */
export async function getGameById(gameId: string): Promise<Game | undefined> {
  return db.query.games.findFirst({
    where: eq(games.id, gameId),
  });
}

/**
 * Get a game with all empires and their planets.
 */
export async function getGameWithEmpires(gameId: string) {
  return db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: {
      empires: {
        with: {
          planets: true,
        },
      },
    },
  });
}

// =============================================================================
// EMPIRE OPERATIONS
// =============================================================================

/**
 * Create a player empire with 9 starting planets.
 */
export async function createPlayerEmpire(
  gameId: string,
  name: string,
  emperorName?: string
): Promise<Empire> {
  // Calculate starting networth
  const networth = calculateNetworth({
    planetCount: TOTAL_STARTING_PLANETS,
    ...STARTING_MILITARY,
  });

  // Create the empire
  const empireData: NewEmpire = {
    gameId,
    name,
    emperorName: emperorName ?? null,
    type: "player",
    ...STARTING_RESOURCES,
    ...STARTING_MILITARY,
    ...STARTING_POPULATION,
    networth,
    planetCount: TOTAL_STARTING_PLANETS,
  };

  const [empire] = await db.insert(empires).values(empireData).returning();
  if (!empire) {
    throw new Error("Failed to create empire");
  }

  // Create starting planets
  await createStartingPlanets(empire.id, gameId);

  // Initialize M3 systems (research & upgrades)
  await initializeResearch(empire.id, gameId);
  await initializeUnitUpgrades(empire.id, gameId);

  return empire;
}

/**
 * Create the 9 starting planets for an empire.
 */
async function createStartingPlanets(
  empireId: string,
  gameId: string
): Promise<Planet[]> {
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

  const createdPlanets = await db.insert(planets).values(planetValues).returning();
  return createdPlanets;
}

/**
 * Get an empire by ID.
 */
export async function getEmpireById(empireId: string): Promise<Empire | undefined> {
  return db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });
}

/**
 * Get an empire with all its planets.
 */
export async function getEmpireWithPlanets(empireId: string) {
  return db.query.empires.findFirst({
    where: eq(empires.id, empireId),
    with: {
      planets: true,
    },
  });
}

/**
 * Get the player empire for a game (assumes single player).
 */
export async function getPlayerEmpire(gameId: string) {
  return db.query.empires.findFirst({
    where: eq(empires.gameId, gameId),
    with: {
      planets: true,
    },
  });
}

// =============================================================================
// PLANET OPERATIONS
// =============================================================================

/**
 * Get all planets for an empire.
 */
export async function getPlanetsByEmpireId(empireId: string): Promise<Planet[]> {
  return db.query.planets.findMany({
    where: eq(planets.empireId, empireId),
  });
}

/**
 * Get planet counts by type for an empire.
 */
export async function getPlanetCountsByType(
  empireId: string
): Promise<Record<string, number>> {
  const empirePlanets = await getPlanetsByEmpireId(empireId);

  return empirePlanets.reduce(
    (acc, planet) => {
      acc[planet.type] = (acc[planet.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

// =============================================================================
// COMPOSITE OPERATIONS
// =============================================================================

/**
 * Start a new game with a player empire and bot empires.
 * Returns the game, player's empire, and all bot empires.
 *
 * @param gameName - Name of the game
 * @param empireName - Player's empire name
 * @param emperorName - Player's emperor name (optional)
 * @param difficulty - Game difficulty (easy/normal/hard/nightmare)
 * @param botCount - Number of bot empires to create (default 25)
 */
export async function startNewGame(
  gameName: string,
  empireName: string,
  emperorName?: string,
  difficulty: Difficulty = "normal",
  botCount: number = 25
): Promise<{ game: Game; empire: Empire; bots: Empire[] }> {
  const game = await createGame(gameName);

  // Set game difficulty and bot count
  await db
    .update(games)
    .set({
      difficulty,
      botCount,
    })
    .where(eq(games.id, game.id));

  // Create player empire
  const empire = await createPlayerEmpire(game.id, empireName, emperorName);

  // Create bot empires (M5)
  const bots = await createBotEmpires(game.id, botCount);

  // Initialize market prices (M7)
  await initializeMarketPrices(game.id);

  // ============================================================================
  // GENERATE GALAXY GEOGRAPHY
  // ============================================================================
  // Creates regions, connections, wormholes, and assigns empires to regions
  await initializeGalaxyGeography(game.id, [empire, ...bots]);

  // Update game status to active
  await db
    .update(games)
    .set({
      status: "active",
      startedAt: new Date(),
    })
    .where(eq(games.id, game.id));

  return { game, empire, bots };
}

/**
 * Initialize galaxy geography for a game.
 * Creates regions, connections, wormholes, and assigns empires to starting regions.
 */
async function initializeGalaxyGeography(
  gameId: string,
  allEmpires: Empire[]
): Promise<void> {
  // Generate galaxy structure with seeded random for reproducibility
  const seed = Date.now();
  const empireData = allEmpires.map((e) => ({
    id: e.id,
    type: e.type as "player" | "bot",
    botTier: e.botTier,
    planetCount: e.planetCount,
  }));

  const galaxy = generateGalaxy(gameId, empireData, { seed });

  // Insert regions and get their actual IDs
  const insertedRegions = await db
    .insert(galaxyRegions)
    .values(galaxy.regions)
    .returning();

  // Create ID mapping (placeholder -> actual)
  const regionIdMap = new Map<string, string>();
  for (let i = 0; i < galaxy.regions.length; i++) {
    regionIdMap.set(`region-${i}`, insertedRegions[i]!.id);
  }

  // Update connections with actual region IDs
  const connectionsWithRealIds = galaxy.connections.map((conn) => ({
    ...conn,
    fromRegionId: regionIdMap.get(conn.fromRegionId) ?? conn.fromRegionId,
    toRegionId: regionIdMap.get(conn.toRegionId) ?? conn.toRegionId,
  }));

  // Update wormholes with actual region IDs
  const wormholesWithRealIds = galaxy.wormholes.map((wh) => ({
    ...wh,
    fromRegionId: regionIdMap.get(wh.fromRegionId) ?? wh.fromRegionId,
    toRegionId: regionIdMap.get(wh.toRegionId) ?? wh.toRegionId,
  }));

  // Insert connections and wormholes
  if (connectionsWithRealIds.length > 0) {
    await db.insert(regionConnections).values(connectionsWithRealIds);
  }
  if (wormholesWithRealIds.length > 0) {
    await db.insert(regionConnections).values(wormholesWithRealIds);
  }

  // Update empire assignments with actual region IDs
  const influenceRecordsWithRealIds = galaxy.empireInfluenceRecords.map((record) => {
    const realHomeRegionId = regionIdMap.get(record.homeRegionId) ?? record.homeRegionId;
    const realPrimaryRegionId = regionIdMap.get(record.primaryRegionId) ?? record.primaryRegionId;
    const controlledIds = JSON.parse(record.controlledRegionIds as string) as string[];
    const realControlledIds = controlledIds.map((id) => regionIdMap.get(id) ?? id);

    return {
      ...record,
      homeRegionId: realHomeRegionId,
      primaryRegionId: realPrimaryRegionId,
      controlledRegionIds: JSON.stringify(realControlledIds),
    };
  });

  // Insert empire influence records
  if (influenceRecordsWithRealIds.length > 0) {
    await db.insert(empireInfluence).values(influenceRecordsWithRealIds);
  }

  // Update region empire counts
  const regionCounts = new Map<string, number>();
  for (const record of influenceRecordsWithRealIds) {
    const regionId = record.homeRegionId;
    regionCounts.set(regionId, (regionCounts.get(regionId) ?? 0) + 1);
  }

  for (const [regionId, count] of regionCounts) {
    await db
      .update(galaxyRegions)
      .set({ currentEmpireCount: count })
      .where(eq(galaxyRegions.id, regionId));
  }
}

/**
 * Get the full dashboard data for an empire.
 */
export interface DashboardData {
  empire: Empire;
  planets: Planet[];
  resources: {
    credits: number;
    food: number;
    ore: number;
    petroleum: number;
    researchPoints: number;
  };
  military: {
    soldiers: number;
    fighters: number;
    stations: number;
    lightCruisers: number;
    heavyCruisers: number;
    carriers: number;
    covertAgents: number;
  };
  stats: {
    networth: number;
    planetCount: number;
    population: number;
    civilStatus: string;
  };
  turn: {
    currentTurn: number;
    turnLimit: number;
  };
}

export async function getDashboardData(
  empireId: string
): Promise<DashboardData | null> {
  const empireWithPlanets = await getEmpireWithPlanets(empireId);

  if (!empireWithPlanets) {
    return null;
  }

  // Fetch game data for turn info
  const game = await getGameById(empireWithPlanets.gameId);

  if (!game) {
    return null;
  }

  return {
    empire: empireWithPlanets,
    planets: empireWithPlanets.planets,
    resources: {
      credits: empireWithPlanets.credits,
      food: empireWithPlanets.food,
      ore: empireWithPlanets.ore,
      petroleum: empireWithPlanets.petroleum,
      researchPoints: empireWithPlanets.researchPoints,
    },
    military: {
      soldiers: empireWithPlanets.soldiers,
      fighters: empireWithPlanets.fighters,
      stations: empireWithPlanets.stations,
      lightCruisers: empireWithPlanets.lightCruisers,
      heavyCruisers: empireWithPlanets.heavyCruisers,
      carriers: empireWithPlanets.carriers,
      covertAgents: empireWithPlanets.covertAgents,
    },
    stats: {
      networth: empireWithPlanets.networth,
      planetCount: empireWithPlanets.planetCount,
      population: empireWithPlanets.population,
      civilStatus: empireWithPlanets.civilStatus,
    },
    turn: {
      currentTurn: game.currentTurn,
      turnLimit: game.turnLimit,
    },
  };
}
