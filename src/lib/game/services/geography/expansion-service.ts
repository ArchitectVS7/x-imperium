/**
 * Expansion Options Service (M8.2)
 *
 * Calculates expansion options for the player.
 * Answers "How can I expand?" with clear options.
 *
 * Two main expansion paths:
 * 1. Borders - Adjacent sectors (1.2× attack cost)
 * 2. Wormholes - Any sector (1.5× attack cost, construction required)
 */

import { db } from "@/lib/db";
import {
  regionConnections,
  galaxyRegions,
  empireInfluence,
  empires,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { calculateMaxWormholeSlots } from "./wormhole-construction-service";

// =============================================================================
// CONSTANTS
// =============================================================================

export const EXPANSION_CONSTANTS = {
  /** Attack cost multiplier for cross-border attacks */
  BORDER_ATTACK_MULTIPLIER: 1.2,
  /** Attack cost multiplier for wormhole attacks */
  WORMHOLE_ATTACK_MULTIPLIER: 1.5,
};

// =============================================================================
// TYPES
// =============================================================================

export type BorderStatus = "locked" | "unlocked";
export type ThreatLevelSimple = "low" | "medium" | "high";

export interface BorderOption {
  regionId: string;
  regionName: string;
  regionType: string;
  status: BorderStatus;
  unlockTurn?: number;
  attackCostModifier: number;
  empireCount: number;
  threatLevel: ThreatLevelSimple;
  connectionId: string;
}

export interface WormholeOption {
  regionId: string;
  regionName: string;
  regionType: string;
  cost: { credits: number; petroleum: number };
  buildTime: number;
  attackCostModifier: number;
  canAfford: boolean;
  distance: number;
}

export interface WormholeInProgress {
  id: string;
  toRegionId: string;
  toRegionName: string;
  startTurn: number;
  completionTurn: number;
  turnsRemaining: number;
}

export interface ExpansionOptionsResult {
  playerRegionId: string;
  playerRegionName: string;
  borders: BorderOption[];
  wormholeSlots: {
    used: number;
    max: number;
    available: number;
  };
  wormholesInProgress: WormholeInProgress[];
  wormholeOptions: WormholeOption[];
}

// =============================================================================
// PURE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate simple threat level for a region based on empire count.
 */
export function calculateRegionThreatLevel(
  empireCount: number,
  maxEmpires: number
): ThreatLevelSimple {
  // Guard against division by zero
  if (maxEmpires <= 0) return "low";

  const density = empireCount / maxEmpires;

  if (density >= 0.8) return "high";
  if (density >= 0.5) return "medium";
  return "low";
}

/**
 * Calculate border status based on discovery turn.
 */
export function calculateBorderStatus(
  discoveryTurn: number | null,
  currentTurn: number
): { status: BorderStatus; unlockTurn?: number } {
  if (discoveryTurn === null) {
    // No discovery turn set = always unlocked
    return { status: "unlocked" };
  }

  if (currentTurn >= discoveryTurn) {
    return { status: "unlocked" };
  }

  return { status: "locked", unlockTurn: discoveryTurn };
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Get expansion options for a player.
 */
export async function getExpansionOptions(
  gameId: string,
  playerEmpireId: string,
  currentTurn: number
): Promise<ExpansionOptionsResult | null> {
  // Get player's empire and influence
  const playerEmpire = await db.query.empires.findFirst({
    where: eq(empires.id, playerEmpireId),
  });

  if (!playerEmpire) return null;

  const playerInfluence = await db.query.empireInfluence.findFirst({
    where: eq(empireInfluence.empireId, playerEmpireId),
  });

  if (!playerInfluence) return null;

  const playerRegionId = playerInfluence.primaryRegionId;

  // Get player's region
  const playerRegion = await db.query.galaxyRegions.findFirst({
    where: eq(galaxyRegions.id, playerRegionId),
  });

  if (!playerRegion) return null;

  // Get all regions for reference
  const allRegions = await db.query.galaxyRegions.findMany({
    where: eq(galaxyRegions.gameId, gameId),
  });
  const regionMap = new Map(allRegions.map((r) => [r.id, r]));

  // Get all empires and count per region
  const allEmpires = await db.query.empires.findMany({
    where: and(eq(empires.gameId, gameId), eq(empires.isEliminated, false)),
  });

  const allInfluences = await db.query.empireInfluence.findMany({
    where: eq(empireInfluence.gameId, gameId),
  });

  const empireCountByRegion = new Map<string, number>();
  for (const inf of allInfluences) {
    const empire = allEmpires.find((e) => e.id === inf.empireId);
    if (empire && !empire.isEliminated) {
      const count = empireCountByRegion.get(inf.primaryRegionId) ?? 0;
      empireCountByRegion.set(inf.primaryRegionId, count + 1);
    }
  }

  // Get border connections from player's region
  const connections = await db.query.regionConnections.findMany({
    where: and(
      eq(regionConnections.gameId, gameId),
      or(
        eq(regionConnections.fromRegionId, playerRegionId),
        eq(regionConnections.toRegionId, playerRegionId)
      )
    ),
  });

  // Separate borders and wormholes
  const borders: BorderOption[] = [];
  const wormholesInProgress: WormholeInProgress[] = [];

  for (const conn of connections) {
    const otherRegionId =
      conn.fromRegionId === playerRegionId ? conn.toRegionId : conn.fromRegionId;
    const otherRegion = regionMap.get(otherRegionId);

    if (!otherRegion) continue;

    if (conn.connectionType === "wormhole") {
      // Check if this is a wormhole in progress owned by player
      if (
        conn.discoveredByEmpireId === playerEmpireId &&
        conn.wormholeStatus === "constructing"
      ) {
        const startTurn = conn.discoveredAtTurn ?? currentTurn;
        const buildTime = 10; // Default, could calculate from distance
        const completionTurn = startTurn + buildTime;

        wormholesInProgress.push({
          id: conn.id,
          toRegionId: otherRegionId,
          toRegionName: otherRegion.name,
          startTurn,
          completionTurn,
          turnsRemaining: Math.max(0, completionTurn - currentTurn),
        });
      }
    } else {
      // Regular border connection
      const { status, unlockTurn } = calculateBorderStatus(
        conn.discoveredAtTurn,
        currentTurn
      );

      const empireCount = empireCountByRegion.get(otherRegionId) ?? 0;
      const threatLevel = calculateRegionThreatLevel(
        empireCount,
        otherRegion.maxEmpires
      );

      borders.push({
        regionId: otherRegionId,
        regionName: otherRegion.name,
        regionType: otherRegion.regionType,
        status,
        unlockTurn,
        attackCostModifier: EXPANSION_CONSTANTS.BORDER_ATTACK_MULTIPLIER,
        empireCount,
        threatLevel,
        connectionId: conn.id,
      });
    }
  }

  // Calculate wormhole slots
  const maxSlots = calculateMaxWormholeSlots(playerEmpire.fundamentalResearchLevel);
  const ownedWormholes = connections.filter(
    (c) =>
      c.connectionType === "wormhole" &&
      c.discoveredByEmpireId === playerEmpireId
  );
  const usedSlots = ownedWormholes.length;

  // Get potential wormhole destinations (regions we don't have connection to)
  const connectedRegionIds = new Set(
    connections.map((c) =>
      c.fromRegionId === playerRegionId ? c.toRegionId : c.fromRegionId
    )
  );
  connectedRegionIds.add(playerRegionId);

  const wormholeOptions: WormholeOption[] = [];

  for (const region of allRegions) {
    if (connectedRegionIds.has(region.id)) continue;

    // Calculate distance (simplified)
    const dx = Number(region.positionX) - Number(playerRegion.positionX);
    const dy = Number(region.positionY) - Number(playerRegion.positionY);
    const rawDistance = Math.sqrt(dx * dx + dy * dy);
    const distance = Math.min(5, rawDistance / 40);

    // Calculate costs
    const baseCreditCost = 15000;
    const creditCostPerDistance = 5000;
    const credits = Math.min(40000, baseCreditCost + Math.floor(distance * creditCostPerDistance));

    const basePetroCost = 300;
    const petroCostPerDistance = 100;
    const petroleum = Math.min(800, basePetroCost + Math.floor(distance * petroCostPerDistance));

    const baseBuildTime = 6;
    const buildTimePerDistance = 2;
    const buildTime = Math.min(15, baseBuildTime + Math.floor(distance * buildTimePerDistance));

    wormholeOptions.push({
      regionId: region.id,
      regionName: region.name,
      regionType: region.regionType,
      cost: { credits, petroleum },
      buildTime,
      attackCostModifier: EXPANSION_CONSTANTS.WORMHOLE_ATTACK_MULTIPLIER,
      canAfford: playerEmpire.credits >= credits && playerEmpire.petroleum >= petroleum,
      distance,
    });
  }

  // Sort wormhole options by distance
  wormholeOptions.sort((a, b) => a.distance - b.distance);

  return {
    playerRegionId,
    playerRegionName: playerRegion.name,
    borders,
    wormholeSlots: {
      used: usedSlots,
      max: maxSlots,
      available: maxSlots - usedSlots,
    },
    wormholesInProgress,
    wormholeOptions: wormholeOptions.slice(0, 5), // Top 5 closest
  };
}
