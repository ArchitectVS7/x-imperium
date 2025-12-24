import { db } from "@/lib/db";
import {
  games,
  empires,
  planets,
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
 * Start a new game with a player empire.
 * Returns both the game and the player's empire.
 */
export async function startNewGame(
  gameName: string,
  empireName: string,
  emperorName?: string
): Promise<{ game: Game; empire: Empire }> {
  const game = await createGame(gameName);
  const empire = await createPlayerEmpire(game.id, empireName, emperorName);

  // Update game status to active
  await db
    .update(games)
    .set({
      status: "active",
      startedAt: new Date(),
    })
    .where(eq(games.id, game.id));

  return { game, empire };
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
