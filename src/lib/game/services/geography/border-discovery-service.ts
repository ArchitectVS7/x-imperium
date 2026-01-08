/**
 * Border Discovery Service (M6.2)
 *
 * Implements phased expansion through border discovery:
 * - Turns 1-10: Focus on your sector only
 * - Turns 10-15: Borders gradually unlock (discovery)
 * - Turn 15+: All borders discovered, expansion possible
 *
 * Design Philosophy (from VISION.md):
 * "First master your neighborhood, then expand"
 */

import { db } from "@/lib/db";
import { regionConnections } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// =============================================================================
// CONSTANTS
// =============================================================================

export const BORDER_CONSTANTS = {
  /** Earliest turn borders can be discovered */
  MIN_DISCOVERY_TURN: 10,
  /** Latest turn all borders should be discovered */
  MAX_DISCOVERY_TURN: 15,
  /** Attack cost modifier for cross-border attacks */
  BORDER_FORCE_MULTIPLIER: 1.2,
  /** Connection types that support discovery mechanics */
  DISCOVERABLE_TYPES: ["adjacent", "hazardous", "contested"] as const,
};

// =============================================================================
// TYPES
// =============================================================================

export interface BorderInfo {
  connectionId: string;
  fromRegionId: string;
  toRegionId: string;
  connectionType: string;
  forceMultiplier: number;
  isDiscovered: boolean;
  discoveryTurn: number | null;
  turnsUntilDiscovery: number | null; // null if already discovered
}

export interface BorderDiscoveryUpdate {
  connectionId: string;
  newlyDiscovered: boolean;
}

// =============================================================================
// DISCOVERY TURN ASSIGNMENT
// =============================================================================

/**
 * Calculate a discovery turn for a border connection.
 * Distributes discovery turns evenly across the 10-15 turn range.
 *
 * @param index - Index of this connection in the list
 * @param totalConnections - Total number of connections to distribute
 * @param random - Random function for variance
 * @returns Turn number when this border will be discovered
 */
export function calculateDiscoveryTurn(
  index: number,
  totalConnections: number,
  random: () => number = Math.random
): number {
  const range = BORDER_CONSTANTS.MAX_DISCOVERY_TURN - BORDER_CONSTANTS.MIN_DISCOVERY_TURN;

  if (totalConnections <= 1) {
    // Single connection: random turn in range
    return BORDER_CONSTANTS.MIN_DISCOVERY_TURN + Math.floor(random() * (range + 1));
  }

  // Distribute evenly with small random variance
  const baseStep = range / (totalConnections - 1);
  const baseTurn = BORDER_CONSTANTS.MIN_DISCOVERY_TURN + (index * baseStep);

  // Add small variance (±1 turn)
  const variance = (random() - 0.5) * 2; // -1 to +1
  const turn = Math.round(baseTurn + variance);

  // Clamp to valid range
  return Math.max(
    BORDER_CONSTANTS.MIN_DISCOVERY_TURN,
    Math.min(BORDER_CONSTANTS.MAX_DISCOVERY_TURN, turn)
  );
}

/**
 * Initialize discovery turns for all discoverable borders in a game.
 * Call this during game creation after connections are generated.
 *
 * @param gameId - Game ID
 * @param connections - Array of connection records (with IDs)
 * @param random - Random function for reproducibility
 * @returns Map of connectionId -> discoveryTurn
 */
export function assignDiscoveryTurns(
  connections: Array<{ id: string; connectionType: string }>,
  random: () => number = Math.random
): Map<string, number> {
  const discoverableConnections = connections.filter((c) =>
    BORDER_CONSTANTS.DISCOVERABLE_TYPES.includes(
      c.connectionType as (typeof BORDER_CONSTANTS.DISCOVERABLE_TYPES)[number]
    )
  );

  // Shuffle for random distribution
  const shuffled = [...discoverableConnections].sort(() => random() - 0.5);

  const assignments = new Map<string, number>();

  for (let i = 0; i < shuffled.length; i++) {
    const turn = calculateDiscoveryTurn(i, shuffled.length, random);
    assignments.set(shuffled[i]!.id, turn);
  }

  return assignments;
}

// =============================================================================
// DISCOVERY PROCESSING (TURN PHASE)
// =============================================================================

/**
 * Process border discovery for a game turn.
 * Call this during turn processing to unlock borders.
 *
 * @param gameId - Game ID
 * @param currentTurn - Current turn number
 * @returns List of newly discovered borders
 */
export async function processBorderDiscovery(
  gameId: string,
  currentTurn: number
): Promise<BorderDiscoveryUpdate[]> {
  // Skip if before discovery window
  if (currentTurn < BORDER_CONSTANTS.MIN_DISCOVERY_TURN) {
    return [];
  }

  // Find borders that should be discovered this turn
  // Look for connections where:
  // 1. discoveredAtTurn matches the current turn exactly (process once per turn)
  // 2. wormholeStatus is null (not a wormhole) - wormholes use different discovery
  // Note: We use exact turn match instead of <= to avoid needing a "processed" flag

  const bordersToDiscover = await db
    .select()
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        sql`${regionConnections.discoveredAtTurn} = ${currentTurn}`,
        sql`${regionConnections.wormholeStatus} IS NULL`
      )
    );

  if (bordersToDiscover.length === 0) {
    return [];
  }

  // Build updates list - no need to set a sentinel value
  // Discovery is tracked by discoveredAtTurn field itself
  // (discoveredAtTurn <= currentTurn means discovered)
  const updates: BorderDiscoveryUpdate[] = [];

  for (const border of bordersToDiscover) {
    // Just update the timestamp to record when processing occurred
    await db
      .update(regionConnections)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(regionConnections.id, border.id));

    updates.push({
      connectionId: border.id,
      newlyDiscovered: true,
    });
  }

  return updates;
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get all borders for a region with discovery status.
 *
 * @param gameId - Game ID
 * @param regionId - Region to get borders for
 * @param currentTurn - Current turn (for calculating turnsUntilDiscovery)
 * @returns Array of border info
 */
export async function getRegionBorders(
  gameId: string,
  regionId: string,
  currentTurn: number
): Promise<BorderInfo[]> {
  const connections = await db
    .select()
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        sql`(${regionConnections.fromRegionId} = ${regionId} OR ${regionConnections.toRegionId} = ${regionId})`,
        sql`${regionConnections.wormholeStatus} IS NULL` // Exclude wormholes
      )
    );

  return connections.map((conn) => {
    const discoveryTurn = conn.discoveredAtTurn;
    // Border is discovered if discoveredAtTurn has passed or if empire-specific discovery
    const isDiscovered =
      conn.discoveredByEmpireId !== null ||
      (discoveryTurn !== null && discoveryTurn <= currentTurn);

    let turnsUntilDiscovery: number | null = null;
    if (!isDiscovered && discoveryTurn !== null) {
      turnsUntilDiscovery = Math.max(0, discoveryTurn - currentTurn);
    }

    return {
      connectionId: conn.id,
      fromRegionId: conn.fromRegionId,
      toRegionId: conn.toRegionId,
      connectionType: conn.connectionType,
      forceMultiplier: parseFloat(conn.forceMultiplier ?? "1.00"),
      isDiscovered,
      discoveryTurn,
      turnsUntilDiscovery,
    };
  });
}

/**
 * Check if an attack across a border is allowed.
 *
 * @param gameId - Game ID
 * @param fromRegionId - Attacker's region
 * @param toRegionId - Target's region
 * @param currentTurn - Current turn
 * @returns Object with canAttack and reason
 */
export async function canAttackViaBorder(
  gameId: string,
  fromRegionId: string,
  toRegionId: string,
  currentTurn: number
): Promise<{ canAttack: boolean; forceMultiplier: number; reason?: string }> {
  // Find the connection between these regions
  const connection = await db
    .select()
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        sql`(
          (${regionConnections.fromRegionId} = ${fromRegionId} AND ${regionConnections.toRegionId} = ${toRegionId})
          OR
          (${regionConnections.fromRegionId} = ${toRegionId} AND ${regionConnections.toRegionId} = ${fromRegionId} AND ${regionConnections.isBidirectional} = true)
        )`
      )
    )
    .limit(1);

  if (connection.length === 0) {
    return {
      canAttack: false,
      forceMultiplier: 1.0,
      reason: "No connection exists between these regions",
    };
  }

  const conn = connection[0]!;

  // Wormholes have separate rules
  if (conn.wormholeStatus !== null) {
    if (conn.wormholeStatus !== "stabilized" && conn.wormholeStatus !== "discovered") {
      return {
        canAttack: false,
        forceMultiplier: 1.0,
        reason: "Wormhole is not usable",
      };
    }
    return {
      canAttack: true,
      forceMultiplier: parseFloat(conn.forceMultiplier ?? "1.50"), // Wormholes cost more
    };
  }

  // Check border discovery
  const discoveryTurn = conn.discoveredAtTurn;
  // Border is discovered if discoveredAtTurn has passed or if empire-specific discovery
  const isDiscovered =
    conn.discoveredByEmpireId !== null ||
    (discoveryTurn !== null && discoveryTurn <= currentTurn);

  if (!isDiscovered && discoveryTurn !== null) {
    return {
      canAttack: false,
      forceMultiplier: 1.0,
      reason: `Border will be discovered on Turn ${discoveryTurn}`,
    };
  }

  // Border is accessible
  return {
    canAttack: true,
    forceMultiplier: parseFloat(conn.forceMultiplier ?? "1.20"),
  };
}

// =============================================================================
// INITIALIZATION (GAME CREATION)
// =============================================================================

/**
 * Initialize border discovery turns for a new game.
 * Call this after connections are created but before game starts.
 *
 * @param gameId - Game ID
 * @param random - Random function for reproducibility
 */
export async function initializeBorderDiscovery(
  gameId: string,
  random: () => number = Math.random
): Promise<void> {
  // Get all non-wormhole connections for this game
  const connections = await db
    .select({ id: regionConnections.id, connectionType: regionConnections.connectionType })
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        sql`${regionConnections.wormholeStatus} IS NULL`
      )
    );

  // Assign discovery turns
  const assignments = assignDiscoveryTurns(connections, random);

  // Update connections with discovery turns
  for (const [connectionId, discoveryTurn] of Array.from(assignments.entries())) {
    await db
      .update(regionConnections)
      .set({
        discoveredAtTurn: discoveryTurn,
        updatedAt: new Date(),
      })
      .where(eq(regionConnections.id, connectionId));
  }
}

// =============================================================================
// UI HELPERS
// =============================================================================

/**
 * Get border discovery status for UI display.
 *
 * @param gameId - Game ID
 * @param currentTurn - Current turn for discovery calculation
 * @returns Summary of border discovery status
 */
export async function getBorderDiscoveryStatus(
  gameId: string,
  currentTurn: number = 0
): Promise<{
  totalBorders: number;
  discoveredBorders: number;
  pendingBorders: number;
  nextDiscoveryTurn: number | null;
  allDiscovered: boolean;
}> {
  const connections = await db
    .select()
    .from(regionConnections)
    .where(
      and(
        eq(regionConnections.gameId, gameId),
        sql`${regionConnections.wormholeStatus} IS NULL`
      )
    );

  let discoveredCount = 0;
  let pendingCount = 0;
  let nextTurn: number | null = null;

  for (const conn of connections) {
    const discoveryTurn = conn.discoveredAtTurn;
    // Border is discovered if discoveredAtTurn has passed or if empire-specific discovery
    const isDiscovered =
      conn.discoveredByEmpireId !== null ||
      (discoveryTurn !== null && discoveryTurn <= currentTurn);

    if (isDiscovered) {
      discoveredCount++;
    } else if (discoveryTurn !== null) {
      pendingCount++;
      if (nextTurn === null || discoveryTurn < nextTurn) {
        nextTurn = discoveryTurn;
      }
    }
  }

  return {
    totalBorders: connections.length,
    discoveredBorders: discoveredCount,
    pendingBorders: pendingCount,
    nextDiscoveryTurn: nextTurn,
    allDiscovered: pendingCount === 0,
  };
}
