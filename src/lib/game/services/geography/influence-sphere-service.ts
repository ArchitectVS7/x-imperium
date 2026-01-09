/**
 * Influence Sphere Service
 *
 * Calculates and manages empire spheres of influence based on:
 * - Galaxy region structure
 * - Empire territory (sector count)
 * - Region connections (including wormholes)
 * - Distance calculations
 *
 * Based on docs/redesign/COMBAT-GEOGRAPHY-TURNS.md
 */

import type {
  Empire,
  GalaxyRegion,
  RegionConnection,
  EmpireInfluence,
} from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

export interface InfluenceSphereResult {
  /** Empire IDs that can be attacked at 1.0x force cost */
  directNeighbors: string[];
  /** Empire IDs that can be attacked at 1.5x force cost */
  extendedNeighbors: string[];
  /** Empire IDs that cannot be attacked (too far) */
  distantEmpires: string[];
  /** Total influence radius (base + bonus from sectors/tech) */
  totalRadius: number;
}

export interface AttackValidationResult {
  /** Whether the attack is valid */
  canAttack: boolean;
  /** Force multiplier for the attack (1.0, 1.25, 1.5) */
  forceMultiplier: number;
  /** Reason if attack is not valid */
  reason?: string;
  /** Path taken (region IDs) if via wormhole */
  pathViaWormhole?: string[];
}

export interface NeighborInfo {
  empireId: string;
  empireName: string;
  regionId: string;
  regionName: string;
  distance: number;
  forceMultiplier: number;
  connectionType: "direct" | "extended" | "wormhole";
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const INFLUENCE_CONSTANTS = {
  /** Base number of direct neighbors */
  BASE_NEIGHBOR_COUNT: 3,
  /** Additional neighbors per 5 sectors owned */
  NEIGHBORS_PER_SECTOR: 5,
  /** Maximum number of direct neighbors */
  MAX_DIRECT_NEIGHBORS: 8,
  /** Maximum number of extended neighbors */
  MAX_EXTENDED_NEIGHBORS: 12,
  /** Force multiplier for direct neighbors */
  DIRECT_FORCE_MULTIPLIER: 1.0,
  /** Force multiplier for extended neighbors */
  EXTENDED_FORCE_MULTIPLIER: 1.5,
  /** Force multiplier for hazardous connections */
  HAZARDOUS_FORCE_MULTIPLIER: 1.5,
  /** Force multiplier for contested connections */
  CONTESTED_FORCE_MULTIPLIER: 1.25,
  /** Base discovery chance for wormholes per turn */
  WORMHOLE_DISCOVERY_BASE_CHANCE: 0.02,
  /** Discovery chance bonus from covert agents */
  WORMHOLE_DISCOVERY_COVERT_BONUS: 0.01,
  /** Discovery chance bonus from research level */
  WORMHOLE_DISCOVERY_RESEARCH_BONUS: 0.005,
};

// =============================================================================
// INFLUENCE RADIUS CALCULATION
// =============================================================================

/**
 * Calculate the total influence radius for an empire
 * Radius determines how many "hops" an empire can project power
 */
export function calculateInfluenceRadius(
  sectorCount: number,
  researchLevel: number = 0,
  techBonuses: number = 0
): { base: number; bonus: number; total: number } {
  const base = INFLUENCE_CONSTANTS.BASE_NEIGHBOR_COUNT;

  // Bonus from sector count: +1 radius per 5 sectors beyond starting 6
  const sectorBonus = Math.floor(Math.max(0, sectorCount - 6) / 5);

  // Bonus from research (propulsion branch could add this)
  const researchBonus = Math.floor(researchLevel / 10);

  // Tech bonuses (from upgrades, etc.)
  const bonus = sectorBonus + researchBonus + techBonuses;

  return {
    base,
    bonus,
    total: Math.min(base + bonus, INFLUENCE_CONSTANTS.MAX_DIRECT_NEIGHBORS),
  };
}

// =============================================================================
// NEIGHBOR CALCULATION
// =============================================================================

/**
 * Calculate distance between two regions using their positions
 */
export function calculateRegionDistance(
  region1: Pick<GalaxyRegion, "positionX" | "positionY">,
  region2: Pick<GalaxyRegion, "positionX" | "positionY">
): number {
  const dx = Number(region1.positionX) - Number(region2.positionX);
  const dy = Number(region1.positionY) - Number(region2.positionY);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get empires sorted by distance from a source empire
 */
export function getEmpiresbyDistance(
  sourceEmpire: {
    id: string;
    regionId: string;
  },
  allEmpires: Array<{
    id: string;
    regionId: string;
    name: string;
    isEliminated: boolean;
  }>,
  regions: Map<string, Pick<GalaxyRegion, "id" | "name" | "positionX" | "positionY">>,
  connections: RegionConnection[]
): NeighborInfo[] {
  const sourceRegion = regions.get(sourceEmpire.regionId);
  if (!sourceRegion) {
    return [];
  }

  // Build adjacency map from connections
  const adjacencyMap = buildAdjacencyMap(connections);

  const neighbors: NeighborInfo[] = [];

  for (const empire of allEmpires) {
    // Skip self and eliminated empires
    if (empire.id === sourceEmpire.id || empire.isEliminated) {
      continue;
    }

    const targetRegion = regions.get(empire.regionId);
    if (!targetRegion) {
      continue;
    }

    // Calculate raw distance
    const distance = calculateRegionDistance(sourceRegion, targetRegion);

    // Check if there's a direct connection
    const directConnection = adjacencyMap.get(sourceEmpire.regionId)?.find(
      (conn) => conn.targetRegionId === empire.regionId
    );

    // Determine connection type and force multiplier
    let connectionType: "direct" | "extended" | "wormhole" = "extended";
    let forceMultiplier = INFLUENCE_CONSTANTS.EXTENDED_FORCE_MULTIPLIER;

    if (directConnection) {
      if (directConnection.connectionType === "wormhole") {
        connectionType = "wormhole";
        forceMultiplier = INFLUENCE_CONSTANTS.DIRECT_FORCE_MULTIPLIER;
      } else if (directConnection.connectionType === "hazardous") {
        connectionType = "direct";
        forceMultiplier = INFLUENCE_CONSTANTS.HAZARDOUS_FORCE_MULTIPLIER;
      } else if (directConnection.connectionType === "contested") {
        connectionType = "direct";
        forceMultiplier = INFLUENCE_CONSTANTS.CONTESTED_FORCE_MULTIPLIER;
      } else {
        connectionType = "direct";
        forceMultiplier = directConnection.forceMultiplier
          ? Number(directConnection.forceMultiplier)
          : INFLUENCE_CONSTANTS.DIRECT_FORCE_MULTIPLIER;
      }
    }

    neighbors.push({
      empireId: empire.id,
      empireName: empire.name,
      regionId: empire.regionId,
      regionName: targetRegion.name,
      distance,
      forceMultiplier,
      connectionType,
    });
  }

  // Sort by distance (closest first)
  return neighbors.sort((a, b) => a.distance - b.distance);
}

/**
 * Build an adjacency map from region connections
 */
function buildAdjacencyMap(
  connections: RegionConnection[]
): Map<string, Array<{ targetRegionId: string; connectionType: string; forceMultiplier: string | null }>> {
  const map = new Map<string, Array<{ targetRegionId: string; connectionType: string; forceMultiplier: string | null }>>();

  for (const conn of connections) {
    // Only include active wormholes (discovered or stabilized)
    if (
      conn.connectionType === "wormhole" &&
      conn.wormholeStatus !== "discovered" &&
      conn.wormholeStatus !== "stabilized"
    ) {
      continue;
    }

    // Add forward direction
    const fromList = map.get(conn.fromRegionId) ?? [];
    fromList.push({
      targetRegionId: conn.toRegionId,
      connectionType: conn.connectionType,
      forceMultiplier: conn.forceMultiplier,
    });
    map.set(conn.fromRegionId, fromList);

    // Add reverse direction if bidirectional
    if (conn.isBidirectional) {
      const toList = map.get(conn.toRegionId) ?? [];
      toList.push({
        targetRegionId: conn.fromRegionId,
        connectionType: conn.connectionType,
        forceMultiplier: conn.forceMultiplier,
      });
      map.set(conn.toRegionId, toList);
    }
  }

  return map;
}

// =============================================================================
// INFLUENCE SPHERE CALCULATION
// =============================================================================

/**
 * Calculate the full influence sphere for an empire
 */
export function calculateInfluenceSphere(
  empire: Pick<Empire, "id" | "sectorCount">,
  empireInfluence: Pick<EmpireInfluence, "homeRegionId" | "primaryRegionId">,
  allEmpires: Array<{
    id: string;
    regionId: string;
    name: string;
    isEliminated: boolean;
  }>,
  regions: Map<string, Pick<GalaxyRegion, "id" | "name" | "positionX" | "positionY">>,
  connections: RegionConnection[]
): InfluenceSphereResult {
  // Calculate influence radius
  const { total: radius } = calculateInfluenceRadius(empire.sectorCount);

  // Get all empires sorted by distance
  const sortedNeighbors = getEmpiresbyDistance(
    { id: empire.id, regionId: empireInfluence.primaryRegionId },
    allEmpires,
    regions,
    connections
  );

  // Split into direct and extended neighbors based on radius
  const directNeighbors: string[] = [];
  const extendedNeighbors: string[] = [];
  const distantEmpires: string[] = [];

  for (let i = 0; i < sortedNeighbors.length; i++) {
    const neighbor = sortedNeighbors[i]!;

    if (i < radius) {
      // Within direct influence sphere
      directNeighbors.push(neighbor.empireId);
    } else if (i < radius + INFLUENCE_CONSTANTS.MAX_EXTENDED_NEIGHBORS) {
      // Within extended influence sphere
      extendedNeighbors.push(neighbor.empireId);
    } else {
      // Too far to attack
      distantEmpires.push(neighbor.empireId);
    }
  }

  return {
    directNeighbors,
    extendedNeighbors,
    distantEmpires,
    totalRadius: radius,
  };
}

// =============================================================================
// ATTACK VALIDATION
// =============================================================================

/**
 * Validate whether an empire can attack a target
 */
export function validateAttack(
  attackerId: string,
  defenderId: string,
  attackerInfluence: InfluenceSphereResult,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  knownWormholes: string[] = [] // TODO: Implement wormhole path-finding
): AttackValidationResult {
  // Check if defender is in direct neighbors
  if (attackerInfluence.directNeighbors.includes(defenderId)) {
    return {
      canAttack: true,
      forceMultiplier: INFLUENCE_CONSTANTS.DIRECT_FORCE_MULTIPLIER,
    };
  }

  // Check if defender is in extended neighbors
  if (attackerInfluence.extendedNeighbors.includes(defenderId)) {
    return {
      canAttack: true,
      forceMultiplier: INFLUENCE_CONSTANTS.EXTENDED_FORCE_MULTIPLIER,
    };
  }

  // Check if there's a known wormhole path
  // (This would require more complex path-finding in a full implementation)

  // Target is too far
  return {
    canAttack: false,
    forceMultiplier: 0,
    reason: `${defenderId} is outside your sphere of influence. Expand your territory or discover wormholes to reach them.`,
  };
}

/**
 * Get all valid attack targets for an empire
 */
export function getValidAttackTargets(
  attackerInfluence: InfluenceSphereResult,
  empireMap: Map<string, { id: string; name: string; networth: number }>
): Array<{
  empireId: string;
  empireName: string;
  forceMultiplier: number;
  influenceType: "direct" | "extended";
}> {
  const targets: Array<{
    empireId: string;
    empireName: string;
    forceMultiplier: number;
    influenceType: "direct" | "extended";
  }> = [];

  // Add direct neighbors
  for (const empireId of attackerInfluence.directNeighbors) {
    const empire = empireMap.get(empireId);
    if (empire) {
      targets.push({
        empireId,
        empireName: empire.name,
        forceMultiplier: INFLUENCE_CONSTANTS.DIRECT_FORCE_MULTIPLIER,
        influenceType: "direct",
      });
    }
  }

  // Add extended neighbors
  for (const empireId of attackerInfluence.extendedNeighbors) {
    const empire = empireMap.get(empireId);
    if (empire) {
      targets.push({
        empireId,
        empireName: empire.name,
        forceMultiplier: INFLUENCE_CONSTANTS.EXTENDED_FORCE_MULTIPLIER,
        influenceType: "extended",
      });
    }
  }

  return targets;
}

// =============================================================================
// INFLUENCE UPDATE
// =============================================================================

/**
 * Recalculate influence when territory changes (sector captured, empire eliminated)
 */
export function recalculateInfluenceOnTerritoryChange(
  empire: Pick<Empire, "id" | "sectorCount">,
  currentInfluence: EmpireInfluence,
  allEmpires: Array<{
    id: string;
    regionId: string;
    name: string;
    isEliminated: boolean;
  }>,
  regions: Map<string, Pick<GalaxyRegion, "id" | "name" | "positionX" | "positionY">>,
  connections: RegionConnection[]
): {
  directNeighborIds: string[];
  extendedNeighborIds: string[];
  totalInfluenceRadius: number;
  baseInfluenceRadius: number;
  bonusInfluenceRadius: number;
} {
  const { base, bonus, total } = calculateInfluenceRadius(empire.sectorCount);

  const sphere = calculateInfluenceSphere(
    empire,
    currentInfluence,
    allEmpires,
    regions,
    connections
  );

  return {
    directNeighborIds: sphere.directNeighbors,
    extendedNeighborIds: sphere.extendedNeighbors,
    totalInfluenceRadius: total,
    baseInfluenceRadius: base,
    bonusInfluenceRadius: bonus,
  };
}

// =============================================================================
// NEIGHBOR INHERITANCE (When an empire is eliminated)
// =============================================================================

/**
 * When an empire is eliminated, their neighbors become available to nearby empires
 * This simulates the "absorbing territory" mechanic
 */
export function inheritNeighborsFromEliminated(
  eliminatedEmpireId: string,
  eliminatedEmpireNeighbors: string[],
  conquerorId: string,
  conquerorInfluence: InfluenceSphereResult
): {
  newDirectNeighbors: string[];
  newExtendedNeighbors: string[];
} {
  const newDirectNeighbors: string[] = [];
  const newExtendedNeighbors: string[] = [];

  // Eliminated empire's neighbors that aren't already in conqueror's sphere
  for (const neighborId of eliminatedEmpireNeighbors) {
    if (neighborId === conquerorId) continue;
    if (neighborId === eliminatedEmpireId) continue;

    const alreadyDirect = conquerorInfluence.directNeighbors.includes(neighborId);
    const alreadyExtended = conquerorInfluence.extendedNeighbors.includes(neighborId);

    if (!alreadyDirect && !alreadyExtended) {
      // New neighbor from eliminated empire - becomes extended neighbor
      newExtendedNeighbors.push(neighborId);
    } else if (alreadyExtended && !alreadyDirect) {
      // Was extended, now becomes direct (closer due to conquest)
      newDirectNeighbors.push(neighborId);
    }
  }

  return {
    newDirectNeighbors,
    newExtendedNeighbors,
  };
}
