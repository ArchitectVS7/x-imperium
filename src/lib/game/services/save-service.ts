/**
 * Save Service (M6)
 *
 * Handles auto-save (ironman) functionality for game persistence.
 * - Creates snapshots of game state each turn
 * - Maintains only the latest save per game (ironman mode)
 * - Enables game resume from last save
 *
 * @see docs/MILESTONES.md Milestone 6
 */

import { db } from "@/lib/db";
import {
  games,
  gameSaves,
  buildQueue,
  researchProgress,
  unitUpgrades,
} from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Full game state snapshot for serialization.
 */
export interface GameSnapshot {
  /** Snapshot version for future compatibility */
  version: number;
  /** Timestamp when snapshot was created */
  timestamp: string;
  /** Game settings and state */
  game: {
    id: string;
    name: string;
    status: string;
    currentTurn: number;
    turnLimit: number;
    difficulty: string;
    botCount: number;
    protectionTurns: number;
  };
  /** All empires with their full state */
  empires: EmpireSnapshot[];
}

export interface EmpireSnapshot {
  id: string;
  name: string;
  type: "player" | "bot";
  /** Resources */
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
  /** Population */
  population: number;
  populationCap: number;
  /** Military */
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
  covertPoints: number;
  /** Status */
  civilStatus: string;
  networth: number;
  armyEffectiveness: number;
  /** Planets */
  sectors: PlanetSnapshot[];
  /** Build queue */
  buildQueue: BuildQueueSnapshot[];
  /** Research */
  research: ResearchSnapshot | null;
  /** Upgrades */
  upgrades: UpgradeSnapshot[];
}

export interface PlanetSnapshot {
  id: string;
  name: string;
  type: string;
  productionRate: number;
  purchasePrice: number;
}

export interface BuildQueueSnapshot {
  unitType: string;
  quantity: number;
  turnsRemaining: number;
}

export interface ResearchSnapshot {
  researchLevel: number;
  currentInvestment: number;
  requiredInvestment: number;
}

export interface UpgradeSnapshot {
  unitType: string;
  upgradeLevel: number;
}

export interface SaveResult {
  success: boolean;
  saveId?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  gameId?: string;
  turn?: number;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Current snapshot version */
const SNAPSHOT_VERSION = 1;

// =============================================================================
// AUTO-SAVE FUNCTIONS
// =============================================================================

/**
 * Create an auto-save snapshot of the current game state.
 * Replaces any existing save for this game (ironman mode).
 *
 * @param gameId - Game UUID to save
 * @param turn - Current turn number
 * @returns SaveResult with success status
 */
export async function createAutoSave(
  gameId: string,
  turn: number
): Promise<SaveResult> {
  try {
    // Serialize current game state
    const snapshot = await serializeGameState(gameId);
    if (!snapshot) {
      return { success: false, error: "Failed to serialize game state" };
    }

    // Delete any existing saves for this game (ironman - only keep latest)
    await db.delete(gameSaves).where(eq(gameSaves.gameId, gameId));

    // Create new save
    const [newSave] = await db
      .insert(gameSaves)
      .values({
        gameId,
        turn,
        snapshot: snapshot as unknown as Record<string, unknown>,
      })
      .returning({ id: gameSaves.id });

    return {
      success: true,
      saveId: newSave?.id,
    };
  } catch (error) {
    console.error("Failed to create auto-save:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the latest save for a game.
 *
 * @param gameId - Game UUID
 * @returns GameSnapshot or null if no save exists
 */
export async function getLatestSave(
  gameId: string
): Promise<GameSnapshot | null> {
  try {
    const save = await db.query.gameSaves.findFirst({
      where: eq(gameSaves.gameId, gameId),
      orderBy: [desc(gameSaves.createdAt)],
    });

    if (!save) return null;

    return save.snapshot as unknown as GameSnapshot;
  } catch (error) {
    console.error("Failed to get latest save:", error);
    return null;
  }
}

/**
 * Check if a game has a saved state.
 *
 * @param gameId - Game UUID
 * @returns True if save exists
 */
export async function hasSave(gameId: string): Promise<boolean> {
  try {
    const save = await db.query.gameSaves.findFirst({
      where: eq(gameSaves.gameId, gameId),
      columns: { id: true },
    });

    return save !== undefined;
  } catch (error) {
    console.error("Failed to check for save:", error);
    return false;
  }
}

/**
 * Get all games that have saves (for resume game list).
 *
 * @returns List of resumable games with basic info
 */
export async function getResumableGames(): Promise<
  Array<{
    gameId: string;
    gameName: string;
    empireName: string;
    empireId: string;
    turn: number;
    savedAt: Date;
    status: string;
  }>
> {
  try {
    const saves = await db.query.gameSaves.findMany({
      orderBy: [desc(gameSaves.createdAt)],
      with: {
        game: {
          columns: {
            id: true,
            name: true,
            difficulty: true,
            status: true,
          },
          with: {
            empires: {
              columns: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    // Filter to only active games and find player empire
    return saves
      .filter((save) => save.game.status === "active")
      .map((save) => {
        const playerEmpire = save.game.empires.find((e) => e.type === "player");
        return {
          gameId: save.gameId,
          gameName: save.game.name,
          empireName: playerEmpire?.name ?? "Unknown Empire",
          empireId: playerEmpire?.id ?? "",
          turn: save.turn,
          savedAt: save.createdAt,
          status: save.game.status,
        };
      })
      .filter((game) => game.empireId !== ""); // Filter out games without player empire
  } catch (error) {
    console.error("Failed to get resumable games:", error);
    return [];
  }
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serialize the complete game state to a snapshot.
 *
 * @param gameId - Game UUID
 * @returns GameSnapshot or null on error
 */
export async function serializeGameState(
  gameId: string
): Promise<GameSnapshot | null> {
  try {
    // Load game with all related data
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        empires: {
          with: {
            sectors: true,
          },
        },
      },
    });

    if (!game) return null;

    // PERFORMANCE: Batch load additional data for all empires to avoid N+1 queries
    // Collect all empire IDs
    const empireIds = game.empires.map((e) => e.id);

    // Batch query all build queues, research progress, and upgrades
    const [allQueues, allResearch, allUpgrades] = await Promise.all([
      db.query.buildQueue.findMany({
        where: inArray(buildQueue.empireId, empireIds),
      }),
      db.query.researchProgress.findMany({
        where: inArray(researchProgress.empireId, empireIds),
      }),
      db.query.unitUpgrades.findMany({
        where: inArray(unitUpgrades.empireId, empireIds),
      }),
    ]);

    // Group results by empire ID for fast lookup
    const queuesByEmpire = new Map<string, typeof allQueues>();
    const researchByEmpire = new Map<string, typeof allResearch[number]>();
    const upgradesByEmpire = new Map<string, typeof allUpgrades>();

    for (const queue of allQueues) {
      const existing = queuesByEmpire.get(queue.empireId) ?? [];
      existing.push(queue);
      queuesByEmpire.set(queue.empireId, existing);
    }

    for (const research of allResearch) {
      researchByEmpire.set(research.empireId, research);
    }

    for (const upgrade of allUpgrades) {
      const existing = upgradesByEmpire.get(upgrade.empireId) ?? [];
      existing.push(upgrade);
      upgradesByEmpire.set(upgrade.empireId, existing);
    }

    // Map empires to snapshots using grouped data
    const empireSnapshots: EmpireSnapshot[] = game.empires.map((empire) => {
      const queue = queuesByEmpire.get(empire.id) ?? [];
      const research = researchByEmpire.get(empire.id);
      const upgrades = upgradesByEmpire.get(empire.id) ?? [];

      const snapshot: EmpireSnapshot = {
        id: empire.id,
        name: empire.name,
        type: empire.type,
        credits: empire.credits,
        food: empire.food,
        ore: empire.ore,
        petroleum: empire.petroleum,
        researchPoints: empire.researchPoints,
        population: empire.population,
        populationCap: empire.populationCap,
        soldiers: empire.soldiers,
        fighters: empire.fighters,
        stations: empire.stations,
        lightCruisers: empire.lightCruisers,
        heavyCruisers: empire.heavyCruisers,
        carriers: empire.carriers,
        covertAgents: empire.covertAgents,
        covertPoints: empire.covertPoints,
        civilStatus: empire.civilStatus,
        networth: Number(empire.networth),
        armyEffectiveness: Number(empire.armyEffectiveness),
        sectors: empire.sectors.map((sector) => ({
          id: sector.id,
          name: sector.name ?? `Sector ${sector.id.slice(0, 8)}`,
          type: sector.type,
          productionRate: Number(sector.productionRate),
          purchasePrice: sector.purchasePrice,
        })),
        buildQueue: queue.map((item) => ({
          unitType: item.unitType,
          quantity: item.quantity,
          turnsRemaining: item.turnsRemaining,
        })),
        research: research
          ? {
              researchLevel: research.researchLevel,
              currentInvestment: research.currentInvestment,
              requiredInvestment: research.requiredInvestment,
            }
          : null,
        upgrades: upgrades.map((upgrade) => ({
          unitType: upgrade.unitType,
          upgradeLevel: upgrade.upgradeLevel,
        })),
      };
      return snapshot;
    });

    return {
      version: SNAPSHOT_VERSION,
      timestamp: new Date().toISOString(),
      game: {
        id: game.id,
        name: game.name,
        status: game.status,
        currentTurn: game.currentTurn,
        turnLimit: game.turnLimit,
        difficulty: game.difficulty ?? "normal",
        botCount: game.botCount,
        protectionTurns: game.protectionTurns,
      },
      empires: empireSnapshots,
    };
  } catch (error) {
    console.error("Failed to serialize game state:", error);
    return null;
  }
}

/**
 * Restore game state from a snapshot.
 * This is used when resuming a game - it ensures the database
 * matches the saved state.
 *
 * @param saveId - Save UUID to restore from
 * @returns RestoreResult with success status
 */
export async function restoreFromSave(saveId: string): Promise<RestoreResult> {
  try {
    // Get the save
    const save = await db.query.gameSaves.findFirst({
      where: eq(gameSaves.id, saveId),
    });

    if (!save) {
      return { success: false, error: "Save not found" };
    }

    const snapshot = save.snapshot as unknown as GameSnapshot;

    // Verify snapshot version
    if (snapshot.version !== SNAPSHOT_VERSION) {
      return {
        success: false,
        error: `Incompatible save version: ${snapshot.version}`,
      };
    }

    // The game state should already be in sync with the save
    // (since we save after each turn and don't allow modification without saving)
    // This function mainly serves to validate the save and return game info

    return {
      success: true,
      gameId: snapshot.game.id,
      turn: snapshot.game.currentTurn,
    };
  } catch (error) {
    console.error("Failed to restore from save:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a save (for cleanup or when game is abandoned).
 *
 * @param gameId - Game UUID
 * @returns True if deleted successfully
 */
export async function deleteSave(gameId: string): Promise<boolean> {
  try {
    await db.delete(gameSaves).where(eq(gameSaves.gameId, gameId));
    return true;
  } catch (error) {
    console.error("Failed to delete save:", error);
    return false;
  }
}
