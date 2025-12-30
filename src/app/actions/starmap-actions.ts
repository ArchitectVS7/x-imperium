"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  games,
  empires,
  treaties,
  attacks,
  regionConnections,
  empireInfluence,
  galaxyRegions,
} from "@/lib/db/schema";
import { eq, and, or, desc, gte } from "drizzle-orm";
import type {
  EmpireMapData,
  TreatyConnection,
  IntelLevel,
  ThreatLevel,
  EmpireArchetype,
} from "@/components/game/starmap/types";
import {
  canStabilizeWormhole,
  stabilizeWormhole,
  WORMHOLE_CONSTANTS,
} from "@/lib/game/services/wormhole-service";

// =============================================================================
// COOKIE HELPERS
// =============================================================================

async function getGameCookies(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    gameId: cookieStore.get("gameId")?.value,
    empireId: cookieStore.get("empireId")?.value,
  };
}

// =============================================================================
// INTEL LEVEL CALCULATION
// =============================================================================

/**
 * Calculate intel level for an empire based on relationships with player.
 *
 * Intel levels:
 * - full: Player's own empire, alliance partner, or recent combat opponent
 * - moderate: NAP partner, or intel from recent spy operations
 * - basic: Empire that has sent/received messages
 * - unknown: No relationship with player
 */
function calculateIntelLevel(
  targetEmpireId: string,
  playerEmpireId: string,
  treatyMap: Map<string, "alliance" | "nap">,
  recentCombatIds: Set<string>
): IntelLevel {
  // Player always has full intel on themselves
  if (targetEmpireId === playerEmpireId) {
    return "full";
  }

  // Alliance partners get full intel
  if (treatyMap.get(targetEmpireId) === "alliance") {
    return "full";
  }

  // Recent combat opponents get moderate intel (you've seen their forces)
  if (recentCombatIds.has(targetEmpireId)) {
    return "moderate";
  }

  // NAP partners get basic intel
  if (treatyMap.get(targetEmpireId) === "nap") {
    return "basic";
  }

  // Everyone else is unknown
  return "unknown";
}

/**
 * Calculate threat level based on recent interactions.
 */
function calculateThreatLevel(
  targetEmpireId: string,
  playerEmpireId: string,
  attackedPlayerIds: Set<string>,
  attackedByPlayerIds: Set<string>,
  treatyMap: Map<string, "alliance" | "nap">
): ThreatLevel {
  if (targetEmpireId === playerEmpireId) {
    return "neutral";
  }

  // At war if recently attacked player or was attacked by player
  if (attackedPlayerIds.has(targetEmpireId) || attackedByPlayerIds.has(targetEmpireId)) {
    return "at_war";
  }

  // Treaty partners are peaceful
  if (treatyMap.has(targetEmpireId)) {
    return "peaceful";
  }

  return "neutral";
}

/**
 * Calculate military tier based on forces.
 */
function calculateMilitaryTier(
  soldiers: number,
  fighters: number,
  lightCruisers: number,
  heavyCruisers: number,
  carriers: number
): "weak" | "moderate" | "strong" | "dominant" {
  // Simplified power calculation
  const power =
    soldiers * 1 +
    fighters * 3 +
    lightCruisers * 5 +
    heavyCruisers * 8 +
    carriers * 12;

  if (power < 500) return "weak";
  if (power < 2000) return "moderate";
  if (power < 5000) return "strong";
  return "dominant";
}

// =============================================================================
// STARMAP DATA
// =============================================================================

export interface StarmapData {
  empires: EmpireMapData[];
  playerEmpireId: string;
  currentTurn: number;
  protectionTurns: number;
  treaties: TreatyConnection[];
}

/**
 * Fetch starmap data for the current game.
 * Returns all empires with fog of war intel levels.
 */
export async function getStarmapDataAction(): Promise<StarmapData | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    // Fetch game info
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return null;
    }

    // Fetch all empires in the game
    const allEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
    });

    // Fetch active treaties in the game involving player
    const activeTreaties = await db.query.treaties.findMany({
      where: and(eq(treaties.gameId, gameId), eq(treaties.status, "active")),
    });

    // Build treaty map for player's treaties
    const treatyMap = new Map<string, "alliance" | "nap">();
    for (const treaty of activeTreaties) {
      if (treaty.proposerId === empireId) {
        treatyMap.set(treaty.recipientId, treaty.treatyType as "alliance" | "nap");
      } else if (treaty.recipientId === empireId) {
        treatyMap.set(treaty.proposerId, treaty.treatyType as "alliance" | "nap");
      }
    }

    // Fetch recent attacks (last 10 turns) involving player
    const recentTurnThreshold = Math.max(1, game.currentTurn - 10);
    const recentAttacks = await db.query.attacks.findMany({
      where: and(
        eq(attacks.gameId, gameId),
        gte(attacks.turn, recentTurnThreshold),
        or(eq(attacks.attackerId, empireId), eq(attacks.defenderId, empireId))
      ),
      orderBy: desc(attacks.turn),
    });

    // Build sets for combat-related intel
    const recentCombatIds = new Set<string>();
    const attackedPlayerIds = new Set<string>(); // Empires that attacked the player
    const attackedByPlayerIds = new Set<string>(); // Empires the player attacked

    for (const attack of recentAttacks) {
      if (attack.attackerId === empireId) {
        recentCombatIds.add(attack.defenderId);
        attackedByPlayerIds.add(attack.defenderId);
      } else if (attack.defenderId === empireId) {
        recentCombatIds.add(attack.attackerId);
        attackedPlayerIds.add(attack.attackerId);
      }
    }

    // Map to EmpireMapData with intel levels
    const empireData: EmpireMapData[] = allEmpires.map((empire) => {
      const isPlayer = empire.id === empireId;
      const intelLevel = calculateIntelLevel(
        empire.id,
        empireId,
        treatyMap,
        recentCombatIds
      );

      const threatLevel = calculateThreatLevel(
        empire.id,
        empireId,
        attackedPlayerIds,
        attackedByPlayerIds,
        treatyMap
      );

      // Base data always available
      const baseData: EmpireMapData = {
        id: empire.id,
        name: empire.name,
        type: empire.type as "player" | "bot",
        planetCount: empire.planetCount,
        networth: empire.networth,
        isEliminated: empire.isEliminated,
        intelLevel,
        recentAggressor: attackedPlayerIds.has(empire.id),
        hasTreaty: treatyMap.has(empire.id),
      };

      // Add detailed info based on intel level
      if (intelLevel === "moderate" || intelLevel === "full" || isPlayer) {
        baseData.threatLevel = threatLevel;
        baseData.militaryTier = calculateMilitaryTier(
          empire.soldiers,
          empire.fighters,
          empire.lightCruisers,
          empire.heavyCruisers,
          empire.carriers
        );

        // Only show archetype with full intel or if player
        if (intelLevel === "full" || isPlayer) {
          // Bot archetype is stored in metadata or we derive from behavior
          // For now, mark as "unknown" for bots since we'd need to track this
          baseData.archetype = isPlayer ? "unknown" : (empire.botArchetype as EmpireArchetype) ?? "unknown";
        }
      }

      return baseData;
    });

    // Map all treaties (not just player's) for visual connections
    const treatyData: TreatyConnection[] = activeTreaties.map((treaty) => ({
      empire1Id: treaty.proposerId,
      empire2Id: treaty.recipientId,
      type: treaty.treatyType as "alliance" | "nap",
    }));

    return {
      empires: empireData,
      playerEmpireId: empireId,
      currentTurn: game.currentTurn,
      protectionTurns: game.protectionTurns,
      treaties: treatyData,
    };
  } catch (error) {
    console.error("Failed to fetch starmap data:", error);
    return null;
  }
}

/**
 * Get all empires for the current game with intel levels.
 */
export async function getAllEmpiresAction(): Promise<EmpireMapData[]> {
  const data = await getStarmapDataAction();
  return data?.empires ?? [];
}

// =============================================================================
// WORMHOLE MANAGEMENT
// =============================================================================

export interface WormholeInfo {
  connectionId: string;
  fromRegionId: string;
  fromRegionName: string;
  toRegionId: string;
  toRegionName: string;
  status: "undiscovered" | "discovered" | "stabilized" | "collapsed";
  collapseChance: number;
  discoveredByEmpireId: string | null;
  discoveredByEmpireName: string | null;
  discoveredAtTurn: number | null;
  isKnownByPlayer: boolean;
  canStabilize: boolean;
  stabilizationReason?: string;
}

export interface WormholeData {
  wormholes: WormholeInfo[];
  stabilizationCost: number;
  stabilizationResearchRequired: number;
  playerCredits: number;
  playerResearchLevel: number;
}

/**
 * Get all known wormholes for the current player.
 */
export async function getWormholesAction(): Promise<WormholeData | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    // Fetch player empire
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return null;
    }

    // Fetch player's influence record
    const influence = await db.query.empireInfluence.findFirst({
      where: eq(empireInfluence.empireId, empireId),
    });

    if (!influence) {
      return null;
    }

    // Fetch all wormholes in the game
    const allConnections = await db.query.regionConnections.findMany({
      where: and(
        eq(regionConnections.gameId, gameId),
        eq(regionConnections.connectionType, "wormhole")
      ),
    });

    // Fetch all regions for names
    const regions = await db.query.galaxyRegions.findMany({
      where: eq(galaxyRegions.gameId, gameId),
    });
    const regionMap = new Map(regions.map((r) => [r.id, r]));

    // Fetch all empires for discoverer names
    const allEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
    });
    const empireMap = new Map(allEmpires.map((e) => [e.id, e]));

    // Map wormholes with additional info
    const wormholes: WormholeInfo[] = [];

    for (const conn of allConnections) {
      const fromRegion = regionMap.get(conn.fromRegionId);
      const toRegion = regionMap.get(conn.toRegionId);
      const discoverer = conn.discoveredByEmpireId
        ? empireMap.get(conn.discoveredByEmpireId)
        : null;

      // Determine if player knows about this wormhole
      const discoveredByPlayer = conn.discoveredByEmpireId === empireId;
      const inPlayerRegion =
        conn.fromRegionId === influence.primaryRegionId ||
        conn.toRegionId === influence.primaryRegionId;
      const isStabilized = conn.wormholeStatus === "stabilized";

      const isKnown =
        discoveredByPlayer ||
        inPlayerRegion ||
        isStabilized ||
        conn.wormholeStatus !== "undiscovered";

      // Skip undiscovered wormholes the player doesn't know about
      if (!isKnown) {
        continue;
      }

      // Check if player can stabilize
      const stabilizationCheck = canStabilizeWormhole(
        empire,
        conn.wormholeStatus as "discovered" | "stabilized" | "collapsed"
      );

      // Additional check: only the discoverer can stabilize
      const isDiscoverer = conn.discoveredByEmpireId === empireId;
      const canPlayerStabilize =
        stabilizationCheck.canStabilize && isDiscoverer;
      const stabilizationReason = !isDiscoverer
        ? "Only the discoverer can stabilize this wormhole"
        : stabilizationCheck.reason;

      wormholes.push({
        connectionId: conn.id,
        fromRegionId: conn.fromRegionId,
        fromRegionName: fromRegion?.name ?? "Unknown",
        toRegionId: conn.toRegionId,
        toRegionName: toRegion?.name ?? "Unknown",
        status: conn.wormholeStatus as WormholeInfo["status"],
        collapseChance: conn.collapseChance
          ? Number(conn.collapseChance)
          : 0,
        discoveredByEmpireId: conn.discoveredByEmpireId,
        discoveredByEmpireName: discoverer?.name ?? null,
        discoveredAtTurn: conn.discoveredAtTurn,
        isKnownByPlayer: discoveredByPlayer || isStabilized,
        canStabilize: canPlayerStabilize,
        stabilizationReason,
      });
    }

    return {
      wormholes,
      stabilizationCost: WORMHOLE_CONSTANTS.STABILIZATION_COST,
      stabilizationResearchRequired: WORMHOLE_CONSTANTS.STABILIZATION_RESEARCH_REQUIREMENT,
      playerCredits: empire.credits,
      playerResearchLevel: empire.fundamentalResearchLevel,
    };
  } catch (error) {
    console.error("Failed to fetch wormhole data:", error);
    return null;
  }
}

export interface StabilizeWormholeResult {
  success: boolean;
  message: string;
  creditsSpent: number;
}

/**
 * Stabilize a discovered wormhole.
 * Requires:
 * - Player discovered the wormhole
 * - Research level >= 5
 * - Credits >= 50,000
 */
export async function stabilizeWormholeAction(
  connectionId: string
): Promise<StabilizeWormholeResult> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return {
      success: false,
      message: "Not logged in",
      creditsSpent: 0,
    };
  }

  try {
    // Fetch player empire
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return {
        success: false,
        message: "Empire not found",
        creditsSpent: 0,
      };
    }

    // Fetch the wormhole
    const wormhole = await db.query.regionConnections.findFirst({
      where: and(
        eq(regionConnections.id, connectionId),
        eq(regionConnections.gameId, gameId),
        eq(regionConnections.connectionType, "wormhole")
      ),
    });

    if (!wormhole) {
      return {
        success: false,
        message: "Wormhole not found",
        creditsSpent: 0,
      };
    }

    // Verify player discovered this wormhole
    if (wormhole.discoveredByEmpireId !== empireId) {
      return {
        success: false,
        message: "Only the discoverer can stabilize a wormhole",
        creditsSpent: 0,
      };
    }

    // Check if can stabilize
    const check = canStabilizeWormhole(
      empire,
      wormhole.wormholeStatus as "discovered" | "stabilized" | "collapsed"
    );

    if (!check.canStabilize) {
      return {
        success: false,
        message: check.reason ?? "Cannot stabilize wormhole",
        creditsSpent: 0,
      };
    }

    // Perform stabilization
    const result = stabilizeWormhole(empire, wormhole);

    if (!result.success) {
      return {
        success: false,
        message: result.message,
        creditsSpent: 0,
      };
    }

    // Update wormhole status
    await db
      .update(regionConnections)
      .set({
        wormholeStatus: "stabilized",
        collapseChance: "0.00",
        updatedAt: new Date(),
      })
      .where(eq(regionConnections.id, connectionId));

    // Deduct credits from empire
    await db
      .update(empires)
      .set({
        credits: empire.credits - result.creditsSpent,
        updatedAt: new Date(),
      })
      .where(eq(empires.id, empireId));

    // Fetch region names for the message
    const regions = await db.query.galaxyRegions.findMany({
      where: or(
        eq(galaxyRegions.id, wormhole.fromRegionId),
        eq(galaxyRegions.id, wormhole.toRegionId)
      ),
    });
    const fromRegion = regions.find((r) => r.id === wormhole.fromRegionId);
    const toRegion = regions.find((r) => r.id === wormhole.toRegionId);

    return {
      success: true,
      message: `Wormhole between ${fromRegion?.name ?? "Unknown"} and ${toRegion?.name ?? "Unknown"} has been stabilized for ${result.creditsSpent.toLocaleString()} credits.`,
      creditsSpent: result.creditsSpent,
    };
  } catch (error) {
    console.error("Failed to stabilize wormhole:", error);
    return {
      success: false,
      message: "An error occurred while stabilizing the wormhole",
      creditsSpent: 0,
    };
  }
}

// =============================================================================
// GALAXY VIEW DATA
// =============================================================================

import type { GalaxyRegion, WormholeData as GalaxyWormholeData } from "@/components/game/starmap/GalaxyView";

export interface GalaxyViewData {
  regions: GalaxyRegion[];
  wormholes: GalaxyWormholeData[];
  playerEmpireId: string;
  playerRegionId: string;
  currentTurn: number;
  protectionTurns: number;
  treaties: {
    empire1Id: string;
    empire2Id: string;
    type: "alliance" | "nap";
  }[];
}

/**
 * Fetch galaxy view data with sectors and empire assignments.
 * Returns regions with empires positioned within them, plus wormhole connections.
 */
export async function getGalaxyViewDataAction(): Promise<GalaxyViewData | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    // Fetch game info
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return null;
    }

    // Fetch all regions for this game
    const allRegions = await db.query.galaxyRegions.findMany({
      where: eq(galaxyRegions.gameId, gameId),
    });

    // Fetch all empires with their influence (region assignments)
    const allEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
    });

    const allInfluence = await db.query.empireInfluence.findMany({
      where: eq(empireInfluence.gameId, gameId),
    });

    // Build influence map (empire -> region)
    const empireToRegion = new Map<string, string>();
    let playerRegionId = "";
    for (const inf of allInfluence) {
      empireToRegion.set(inf.empireId, inf.primaryRegionId);
      if (inf.empireId === empireId) {
        playerRegionId = inf.primaryRegionId;
      }
    }

    // Fetch active treaties
    const activeTreaties = await db.query.treaties.findMany({
      where: and(eq(treaties.gameId, gameId), eq(treaties.status, "active")),
    });

    // Build treaty map for player's treaties
    const treatyMap = new Map<string, "alliance" | "nap">();
    for (const treaty of activeTreaties) {
      if (treaty.proposerId === empireId) {
        treatyMap.set(treaty.recipientId, treaty.treatyType as "alliance" | "nap");
      } else if (treaty.recipientId === empireId) {
        treatyMap.set(treaty.proposerId, treaty.treatyType as "alliance" | "nap");
      }
    }

    // Fetch recent attacks for threat calculation
    const recentTurnThreshold = Math.max(1, game.currentTurn - 10);
    const recentAttacks = await db.query.attacks.findMany({
      where: and(
        eq(attacks.gameId, gameId),
        gte(attacks.turn, recentTurnThreshold),
        or(eq(attacks.attackerId, empireId), eq(attacks.defenderId, empireId))
      ),
      orderBy: desc(attacks.turn),
    });

    // Build combat sets
    const recentCombatIds = new Set<string>();
    const attackedPlayerIds = new Set<string>();

    for (const attack of recentAttacks) {
      if (attack.attackerId === empireId) {
        recentCombatIds.add(attack.defenderId);
      } else if (attack.defenderId === empireId) {
        recentCombatIds.add(attack.attackerId);
        attackedPlayerIds.add(attack.attackerId);
      }
    }

    // Map empires to EmpireMapData format
    const empireDataMap = new Map<string, EmpireMapData>();
    for (const empire of allEmpires) {
      const intelLevel = calculateIntelLevel(
        empire.id,
        empireId,
        treatyMap,
        recentCombatIds
      );

      const empireData: EmpireMapData = {
        id: empire.id,
        name: empire.name,
        type: empire.type as "player" | "bot",
        planetCount: empire.planetCount,
        networth: empire.networth,
        isEliminated: empire.isEliminated,
        intelLevel,
        recentAggressor: attackedPlayerIds.has(empire.id),
        hasTreaty: treatyMap.has(empire.id),
      };

      // Add detailed info for known empires
      if (intelLevel === "moderate" || intelLevel === "full" || empire.id === empireId) {
        empireData.militaryTier = calculateMilitaryTier(
          empire.soldiers,
          empire.fighters,
          empire.lightCruisers,
          empire.heavyCruisers,
          empire.carriers
        );
      }

      empireDataMap.set(empire.id, empireData);
    }

    // Group empires by region
    const regionEmpiresMap = new Map<string, EmpireMapData[]>();
    for (const [empId, regionId] of Array.from(empireToRegion.entries())) {
      const empData = empireDataMap.get(empId);
      if (empData) {
        const existing = regionEmpiresMap.get(regionId) ?? [];
        existing.push(empData);
        regionEmpiresMap.set(regionId, existing);
      }
    }

    // Build region data
    const regions: GalaxyRegion[] = allRegions.map((region) => ({
      id: region.id,
      name: region.name,
      regionType: region.regionType as GalaxyRegion["regionType"],
      positionX: Number(region.positionX),
      positionY: Number(region.positionY),
      wealthModifier: Number(region.wealthModifier),
      dangerLevel: region.dangerLevel,
      maxEmpires: region.maxEmpires,
      empires: regionEmpiresMap.get(region.id) ?? [],
    }));

    // Fetch wormholes
    const allConnections = await db.query.regionConnections.findMany({
      where: and(
        eq(regionConnections.gameId, gameId),
        eq(regionConnections.connectionType, "wormhole")
      ),
    });

    // Filter to known wormholes
    const wormholes: GalaxyWormholeData[] = allConnections
      .filter((conn) => {
        // Show stabilized wormholes to everyone
        if (conn.wormholeStatus === "stabilized") return true;
        // Show discovered wormholes if player discovered them or they're in player's region
        if (conn.discoveredByEmpireId === empireId) return true;
        if (conn.fromRegionId === playerRegionId || conn.toRegionId === playerRegionId) {
          return conn.wormholeStatus !== "undiscovered";
        }
        return false;
      })
      .map((conn) => ({
        id: conn.id,
        fromRegionId: conn.fromRegionId,
        toRegionId: conn.toRegionId,
        status: conn.wormholeStatus as GalaxyWormholeData["status"],
        isKnown: conn.discoveredByEmpireId === empireId || conn.wormholeStatus === "stabilized",
      }));

    // Map treaties
    const treatyData = activeTreaties.map((treaty) => ({
      empire1Id: treaty.proposerId,
      empire2Id: treaty.recipientId,
      type: treaty.treatyType as "alliance" | "nap",
    }));

    return {
      regions,
      wormholes,
      playerEmpireId: empireId,
      playerRegionId,
      currentTurn: game.currentTurn,
      protectionTurns: game.protectionTurns,
      treaties: treatyData,
    };
  } catch (error) {
    console.error("Failed to fetch galaxy view data:", error);
    return null;
  }
}
