/**
 * Wormhole Construction Service (M6.3)
 *
 * Allows empires to construct new wormholes between sectors.
 * Based on the implementation plan, wormhole construction:
 * - Costs credits + petroleum (scales with distance)
 * - Takes 6-15 turns based on distance
 * - Limited slots based on research level
 */

import { db } from "@/lib/db";
import { regionConnections, galaxyRegions, empireInfluence, empires } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

// =============================================================================
// CONSTANTS
// =============================================================================

export const WORMHOLE_CONSTRUCTION_CONSTANTS = {
  /** Base credit cost for construction */
  BASE_CREDIT_COST: 15000,
  /** Maximum credit cost cap */
  MAX_CREDIT_COST: 40000,
  /** Credit cost per distance unit */
  CREDITS_PER_DISTANCE: 5000,

  /** Base petroleum cost */
  BASE_PETROLEUM_COST: 300,
  /** Maximum petroleum cost cap */
  MAX_PETROLEUM_COST: 800,
  /** Petroleum cost per distance unit */
  PETROLEUM_PER_DISTANCE: 100,

  /** Minimum build time in turns */
  MIN_BUILD_TIME: 6,
  /** Maximum build time in turns */
  MAX_BUILD_TIME: 15,
  /** Build time per distance unit */
  TURNS_PER_DISTANCE: 2,

  /** Base wormhole slots at research level 0 */
  BASE_SLOTS: 1,
  /** Research level required for additional slot */
  SLOT_RESEARCH_THRESHOLD: 6,
  /** Maximum wormhole slots */
  MAX_SLOTS: 3,
};

// =============================================================================
// TYPES
// =============================================================================

export interface WormholeConstructionCost {
  credits: number;
  petroleum: number;
}

export interface WormholeConstructionInfo {
  canConstruct: boolean;
  reason?: string;
  cost: WormholeConstructionCost;
  buildTime: number;
  distance: number;
}

export interface WormholeSlotInfo {
  usedSlots: number;
  maxSlots: number;
  availableSlots: number;
}

export interface WormholeConstructionProject {
  id: string;
  fromRegionId: string;
  fromRegionName: string;
  toRegionId: string;
  toRegionName: string;
  startTurn: number;
  completionTurn: number;
  isComplete: boolean;
}

export interface PotentialDestination {
  regionId: string;
  regionName: string;
  regionType: string;
  distance: number;
  cost: WormholeConstructionCost;
  buildTime: number;
  canAfford: boolean;
}

// =============================================================================
// DISTANCE CALCULATION
// =============================================================================

/**
 * Calculate the distance between two regions based on their positions.
 */
export function calculateRegionDistance(
  from: { positionX: number; positionY: number },
  to: { positionX: number; positionY: number }
): number {
  const dx = to.positionX - from.positionX;
  const dy = to.positionY - from.positionY;
  // Normalize to a 0-5 scale (galaxy is roughly 200x200)
  const rawDistance = Math.sqrt(dx * dx + dy * dy);
  return Math.min(5, rawDistance / 40);
}

// =============================================================================
// COST CALCULATIONS
// =============================================================================

/**
 * Calculate the credit and petroleum cost for constructing a wormhole.
 */
export function calculateWormholeCost(distance: number): WormholeConstructionCost {
  const credits = Math.min(
    WORMHOLE_CONSTRUCTION_CONSTANTS.BASE_CREDIT_COST +
      Math.floor(distance * WORMHOLE_CONSTRUCTION_CONSTANTS.CREDITS_PER_DISTANCE),
    WORMHOLE_CONSTRUCTION_CONSTANTS.MAX_CREDIT_COST
  );

  const petroleum = Math.min(
    WORMHOLE_CONSTRUCTION_CONSTANTS.BASE_PETROLEUM_COST +
      Math.floor(distance * WORMHOLE_CONSTRUCTION_CONSTANTS.PETROLEUM_PER_DISTANCE),
    WORMHOLE_CONSTRUCTION_CONSTANTS.MAX_PETROLEUM_COST
  );

  return { credits, petroleum };
}

/**
 * Calculate the build time for a wormhole based on distance.
 */
export function calculateWormholeBuildTime(distance: number): number {
  return Math.min(
    WORMHOLE_CONSTRUCTION_CONSTANTS.MIN_BUILD_TIME +
      Math.floor(distance * WORMHOLE_CONSTRUCTION_CONSTANTS.TURNS_PER_DISTANCE),
    WORMHOLE_CONSTRUCTION_CONSTANTS.MAX_BUILD_TIME
  );
}

// =============================================================================
// SLOT MANAGEMENT
// =============================================================================

/**
 * Calculate maximum wormhole slots based on research level.
 */
export function calculateMaxWormholeSlots(researchLevel: number): number {
  let slots = WORMHOLE_CONSTRUCTION_CONSTANTS.BASE_SLOTS;

  if (researchLevel >= WORMHOLE_CONSTRUCTION_CONSTANTS.SLOT_RESEARCH_THRESHOLD) {
    slots++;
  }

  if (researchLevel >= WORMHOLE_CONSTRUCTION_CONSTANTS.SLOT_RESEARCH_THRESHOLD * 2) {
    slots++;
  }

  return Math.min(slots, WORMHOLE_CONSTRUCTION_CONSTANTS.MAX_SLOTS);
}

// =============================================================================
// CONSTRUCTION VALIDATION
// =============================================================================

/**
 * Check if an empire can construct a wormhole to a destination.
 */
export function canConstructWormhole(
  empire: { credits: number; petroleum: number; fundamentalResearchLevel: number },
  usedSlots: number,
  distance: number,
  existingConnection: boolean
): WormholeConstructionInfo {
  const maxSlots = calculateMaxWormholeSlots(empire.fundamentalResearchLevel);
  const cost = calculateWormholeCost(distance);
  const buildTime = calculateWormholeBuildTime(distance);

  // Check for existing connection
  if (existingConnection) {
    return {
      canConstruct: false,
      reason: "A wormhole or route already exists to this sector",
      cost,
      buildTime,
      distance,
    };
  }

  // Check slot availability
  if (usedSlots >= maxSlots) {
    return {
      canConstruct: false,
      reason: `No available wormhole slots (${usedSlots}/${maxSlots}). Research level ${WORMHOLE_CONSTRUCTION_CONSTANTS.SLOT_RESEARCH_THRESHOLD} unlocks +1 slot.`,
      cost,
      buildTime,
      distance,
    };
  }

  // Check credits
  if (empire.credits < cost.credits) {
    return {
      canConstruct: false,
      reason: `Insufficient credits. Need ${cost.credits.toLocaleString()}, have ${empire.credits.toLocaleString()}`,
      cost,
      buildTime,
      distance,
    };
  }

  // Check petroleum
  if (empire.petroleum < cost.petroleum) {
    return {
      canConstruct: false,
      reason: `Insufficient petroleum. Need ${cost.petroleum.toLocaleString()}, have ${empire.petroleum.toLocaleString()}`,
      cost,
      buildTime,
      distance,
    };
  }

  return {
    canConstruct: true,
    cost,
    buildTime,
    distance,
  };
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Get the number of wormholes owned/constructed by an empire.
 */
export async function getEmpireWormholeCount(
  empireId: string,
  gameId: string
): Promise<number> {
  const wormholes = await db
    .select()
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        eq(regionConnections.connectionType, "wormhole"),
        eq(regionConnections.discoveredByEmpireId, empireId)
      )
    );

  return wormholes.length;
}

/**
 * Get current construction projects for an empire.
 */
export async function getConstructionProjects(
  empireId: string,
  gameId: string,
  currentTurn: number
): Promise<WormholeConstructionProject[]> {
  // Wormholes under construction are marked with constructedByEmpireId
  // and have a completionTurn set
  const wormholes = await db
    .select({
      id: regionConnections.id,
      fromRegionId: regionConnections.fromRegionId,
      toRegionId: regionConnections.toRegionId,
      startTurn: regionConnections.discoveredAtTurn,
      completionTurn: sql<number>`COALESCE(${regionConnections.discoveredAtTurn}, 0) + 10`,
    })
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        eq(regionConnections.connectionType, "wormhole"),
        eq(regionConnections.discoveredByEmpireId, empireId),
        eq(regionConnections.wormholeStatus, "constructing")
      )
    );

  // Get region names
  const regionIds = new Set<string>();
  for (const w of wormholes) {
    regionIds.add(w.fromRegionId);
    regionIds.add(w.toRegionId);
  }

  if (regionIds.size === 0) {
    return [];
  }

  const regions = await db.query.galaxyRegions.findMany({
    where: eq(galaxyRegions.gameId, gameId),
  });
  const regionMap = new Map(regions.map((r) => [r.id, r.name]));

  return wormholes.map((w) => ({
    id: w.id,
    fromRegionId: w.fromRegionId,
    fromRegionName: regionMap.get(w.fromRegionId) ?? "Unknown",
    toRegionId: w.toRegionId,
    toRegionName: regionMap.get(w.toRegionId) ?? "Unknown",
    startTurn: w.startTurn ?? currentTurn,
    completionTurn: w.completionTurn,
    isComplete: currentTurn >= w.completionTurn,
  }));
}

/**
 * Get potential destinations for wormhole construction.
 */
export async function getPotentialDestinations(
  empireId: string,
  gameId: string,
  playerCredits: number,
  playerPetroleum: number
): Promise<PotentialDestination[]> {
  // Get player's region
  const influence = await db.query.empireInfluence.findFirst({
    where: eq(empireInfluence.empireId, empireId),
  });

  if (!influence) {
    return [];
  }

  // Get player's home region position
  const playerRegion = await db.query.galaxyRegions.findFirst({
    where: eq(galaxyRegions.id, influence.primaryRegionId),
  });

  if (!playerRegion) {
    return [];
  }

  // Get all regions in the game
  const allRegions = await db.query.galaxyRegions.findMany({
    where: eq(galaxyRegions.gameId, gameId),
  });

  // Get existing wormholes from player's region
  const existingConnections = await db.query.regionConnections.findMany({
    where: and(
      eq(regionConnections.gameId, gameId),
      eq(regionConnections.connectionType, "wormhole"),
      or(
        eq(regionConnections.fromRegionId, influence.primaryRegionId),
        eq(regionConnections.toRegionId, influence.primaryRegionId)
      )
    ),
  });

  const connectedRegionIds = new Set<string>();
  for (const conn of existingConnections) {
    connectedRegionIds.add(conn.fromRegionId);
    connectedRegionIds.add(conn.toRegionId);
  }

  // Build destination list (excluding player's own region and already connected)
  const destinations: PotentialDestination[] = [];

  for (const region of allRegions) {
    if (region.id === influence.primaryRegionId) continue;
    if (connectedRegionIds.has(region.id)) continue;

    const distance = calculateRegionDistance(
      { positionX: Number(playerRegion.positionX), positionY: Number(playerRegion.positionY) },
      { positionX: Number(region.positionX), positionY: Number(region.positionY) }
    );

    const cost = calculateWormholeCost(distance);
    const buildTime = calculateWormholeBuildTime(distance);

    destinations.push({
      regionId: region.id,
      regionName: region.name,
      regionType: region.regionType,
      distance,
      cost,
      buildTime,
      canAfford: playerCredits >= cost.credits && playerPetroleum >= cost.petroleum,
    });
  }

  // Sort by distance
  destinations.sort((a, b) => a.distance - b.distance);

  return destinations;
}

/**
 * Start wormhole construction between player's region and a destination.
 */
export async function startWormholeConstruction(
  empireId: string,
  gameId: string,
  destinationRegionId: string,
  currentTurn: number
): Promise<{
  success: boolean;
  message: string;
  connectionId?: string;
  cost?: WormholeConstructionCost;
}> {
  // Get player's data
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { success: false, message: "Empire not found" };
  }

  const influence = await db.query.empireInfluence.findFirst({
    where: eq(empireInfluence.empireId, empireId),
  });

  if (!influence) {
    return { success: false, message: "Empire influence record not found" };
  }

  // Get regions
  const [fromRegion, toRegion] = await Promise.all([
    db.query.galaxyRegions.findFirst({
      where: eq(galaxyRegions.id, influence.primaryRegionId),
    }),
    db.query.galaxyRegions.findFirst({
      where: eq(galaxyRegions.id, destinationRegionId),
    }),
  ]);

  if (!fromRegion || !toRegion) {
    return { success: false, message: "Region not found" };
  }

  // Check for existing connection
  const existingConn = await db.query.regionConnections.findFirst({
    where: and(
      eq(regionConnections.gameId, gameId),
      or(
        and(
          eq(regionConnections.fromRegionId, fromRegion.id),
          eq(regionConnections.toRegionId, toRegion.id)
        ),
        and(
          eq(regionConnections.fromRegionId, toRegion.id),
          eq(regionConnections.toRegionId, fromRegion.id)
        )
      )
    ),
  });

  if (existingConn) {
    return { success: false, message: "A connection already exists between these regions" };
  }

  // Calculate cost and validate
  const distance = calculateRegionDistance(
    { positionX: Number(fromRegion.positionX), positionY: Number(fromRegion.positionY) },
    { positionX: Number(toRegion.positionX), positionY: Number(toRegion.positionY) }
  );

  const usedSlots = await getEmpireWormholeCount(empireId, gameId);
  const constructionInfo = canConstructWormhole(
    { credits: empire.credits, petroleum: empire.petroleum, fundamentalResearchLevel: empire.fundamentalResearchLevel },
    usedSlots,
    distance,
    false
  );

  if (!constructionInfo.canConstruct) {
    return { success: false, message: constructionInfo.reason ?? "Cannot construct wormhole" };
  }

  const buildTime = calculateWormholeBuildTime(distance);
  const completionTurn = currentTurn + buildTime;

  // Create the wormhole connection in "constructing" state
  const [newConnection] = await db
    .insert(regionConnections)
    .values({
      gameId,
      fromRegionId: fromRegion.id,
      toRegionId: toRegion.id,
      connectionType: "wormhole",
      isBidirectional: true,
      forceMultiplier: "1.50", // Wormholes cost more to attack through
      travelCost: 0,
      wormholeStatus: "constructing",
      discoveredByEmpireId: empireId,
      discoveredAtTurn: currentTurn,
      collapseChance: "0.00", // Constructed wormholes are pre-stabilized
    })
    .returning();

  // Deduct resources
  await db
    .update(empires)
    .set({
      credits: empire.credits - constructionInfo.cost.credits,
      petroleum: empire.petroleum - constructionInfo.cost.petroleum,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empireId));

  return {
    success: true,
    message: `Wormhole construction started to ${toRegion.name}. Completion in ${buildTime} turns (Turn ${completionTurn}).`,
    connectionId: newConnection?.id,
    cost: constructionInfo.cost,
  };
}

/**
 * Process wormhole construction completion during turn processing.
 */
export async function processWormholeConstruction(
  gameId: string,
  currentTurn: number
): Promise<{ completed: string[]; messages: string[] }> {
  // Find all wormholes that should complete this turn
  const constructingWormholes = await db
    .select()
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        eq(regionConnections.connectionType, "wormhole"),
        eq(regionConnections.wormholeStatus, "constructing")
      )
    );

  const completed: string[] = [];
  const messages: string[] = [];

  for (const wormhole of constructingWormholes) {
    const startTurn = wormhole.discoveredAtTurn ?? 1;
    // Rough build time based on when it was started
    // (We don't store completion turn separately, so estimate from start)
    const estimatedBuildTime = 10; // Default build time
    const completionTurn = startTurn + estimatedBuildTime;

    if (currentTurn >= completionTurn) {
      // Complete the wormhole
      await db
        .update(regionConnections)
        .set({
          wormholeStatus: "stabilized", // Constructed wormholes are already stable
          updatedAt: new Date(),
        })
        .where(eq(regionConnections.id, wormhole.id));

      completed.push(wormhole.id);

      // Get region names for message
      const regions = await db.query.galaxyRegions.findMany({
        where: or(
          eq(galaxyRegions.id, wormhole.fromRegionId),
          eq(galaxyRegions.id, wormhole.toRegionId)
        ),
      });
      const fromName = regions.find((r) => r.id === wormhole.fromRegionId)?.name ?? "Unknown";
      const toName = regions.find((r) => r.id === wormhole.toRegionId)?.name ?? "Unknown";

      messages.push(`Wormhole construction complete: ${fromName} ↔ ${toName}`);
    }
  }

  return { completed, messages };
}
