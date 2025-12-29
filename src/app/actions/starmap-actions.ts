"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { games, empires, treaties, attacks } from "@/lib/db/schema";
import { eq, and, or, desc, gte } from "drizzle-orm";
import type {
  EmpireMapData,
  TreatyConnection,
  IntelLevel,
  ThreatLevel,
  EmpireArchetype,
} from "@/components/game/starmap/types";

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
