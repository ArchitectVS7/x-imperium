/**
 * Galaxy Generation Service
 *
 * Generates the galaxy structure at game start:
 * - Creates regions with proper spatial layout
 * - Creates connections between adjacent regions
 * - Places hidden wormholes for discovery
 * - Assigns empires to starting regions
 *
 * Based on docs/redesign/COMBAT-GEOGRAPHY-TURNS.md
 */

import type {
  NewGalaxyRegion,
  NewRegionConnection,
  NewEmpireInfluence,
} from "@/lib/db/schema";
import { assignEmpiresWithBalancing } from "./sector-balancing-service";

// =============================================================================
// TYPES
// =============================================================================

export interface GalaxyGenerationConfig {
  /** Total number of empires in the game */
  empireCount: number;
  /** Target empires per region (default: 10) */
  empiresPerRegion: number;
  /** Number of wormholes to generate */
  wormholeCount: number;
  /** Random seed for reproducible generation */
  seed?: number;
}

export interface GeneratedGalaxy {
  /** Generated regions */
  regions: NewGalaxyRegion[];
  /** Generated connections */
  connections: NewRegionConnection[];
  /** Empire-to-region assignments */
  empireAssignments: Map<string, string>; // empireId -> regionId
}

export interface RegionTemplate {
  type: "core" | "inner" | "outer" | "rim" | "void";
  wealthModifier: number;
  dangerLevel: number;
  namePrefix: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const GALAXY_CONSTANTS = {
  /** Minimum regions in a galaxy */
  MIN_REGIONS: 4,
  /** Maximum regions in a galaxy */
  MAX_REGIONS: 15,
  /** Default empires per region */
  DEFAULT_EMPIRES_PER_REGION: 10,
  /** Connection distance threshold (regions within this distance are adjacent) */
  ADJACENT_DISTANCE_THRESHOLD: 30,
  /** Trade route distance threshold */
  TRADE_ROUTE_DISTANCE_THRESHOLD: 50,
  /** Hazardous connection chance */
  HAZARDOUS_CHANCE: 0.15,
  /** Contested connection chance */
  CONTESTED_CHANCE: 0.10,
  /** Wormholes per 10 empires */
  WORMHOLES_PER_10_EMPIRES: 2,
};

export const REGION_TEMPLATES: Record<string, RegionTemplate> = {
  core: {
    type: "core",
    wealthModifier: 1.5,
    dangerLevel: 70,
    namePrefix: ["Central", "Imperial", "Capital", "Prime", "Nexus"],
  },
  inner: {
    type: "inner",
    wealthModifier: 1.2,
    dangerLevel: 50,
    namePrefix: ["Inner", "Proxima", "Near", "Core-Adjacent", "Central"],
  },
  outer: {
    type: "outer",
    wealthModifier: 1.0,
    dangerLevel: 40,
    namePrefix: ["Outer", "Mid", "Frontier", "Border", "Periphery"],
  },
  rim: {
    type: "rim",
    wealthModifier: 0.8,
    dangerLevel: 30,
    namePrefix: ["Rim", "Edge", "Far", "Distant", "Remote"],
  },
  void: {
    type: "void",
    wealthModifier: 0.5,
    dangerLevel: 80,
    namePrefix: ["Void", "Dark", "Lost", "Forsaken", "Abyssal"],
  },
};

const REGION_SUFFIXES = [
  "Sector", "Quadrant", "Expanse", "Territories", "Reaches",
  "Domain", "Cluster", "Nebula", "Zone", "Systems",
];

// =============================================================================
// RANDOM NUMBER GENERATION
// =============================================================================

/**
 * Seeded random number generator for reproducible galaxy generation
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// =============================================================================
// REGION GENERATION
// =============================================================================

/**
 * Calculate the number of regions needed for a given empire count
 */
export function calculateRegionCount(
  empireCount: number,
  empiresPerRegion: number = GALAXY_CONSTANTS.DEFAULT_EMPIRES_PER_REGION
): number {
  const count = Math.ceil(empireCount / empiresPerRegion);
  return Math.max(GALAXY_CONSTANTS.MIN_REGIONS, Math.min(count, GALAXY_CONSTANTS.MAX_REGIONS));
}

/**
 * Generate a unique region name
 */
function generateRegionName(
  template: RegionTemplate,
  index: number,
  random: () => number
): string {
  const prefix = template.namePrefix[Math.floor(random() * template.namePrefix.length)]!;
  const suffix = REGION_SUFFIXES[Math.floor(random() * REGION_SUFFIXES.length)]!;
  return `${prefix} ${suffix}`;
}

/**
 * Generate region positions in a spiral galaxy pattern
 */
function generateRegionPositions(
  regionCount: number,
  random: () => number
): Array<{ x: number; y: number; type: string }> {
  const positions: Array<{ x: number; y: number; type: string }> = [];

  // Place core region at center
  positions.push({ x: 50, y: 50, type: "core" });

  if (regionCount === 1) return positions;

  // Place inner regions in a ring around core
  const innerCount = Math.min(4, regionCount - 1);
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2;
    const radius = 15 + random() * 5;
    positions.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      type: "inner",
    });
  }

  if (regionCount <= 5) return positions;

  // Place outer regions in a larger ring
  const outerCount = Math.min(6, regionCount - 5);
  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * Math.PI * 2 + Math.PI / outerCount;
    const radius = 30 + random() * 5;
    positions.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      type: "outer",
    });
  }

  if (regionCount <= 11) return positions;

  // Place rim regions at the edges
  const rimCount = Math.min(4, regionCount - 11);
  for (let i = 0; i < rimCount; i++) {
    const angle = (i / rimCount) * Math.PI * 2 + Math.PI / 4;
    const radius = 45 + random() * 5;
    positions.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      type: "rim",
    });
  }

  // Add void regions if needed
  while (positions.length < regionCount) {
    const angle = random() * Math.PI * 2;
    const radius = 20 + random() * 30;
    positions.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      type: "void",
    });
  }

  return positions;
}

/**
 * Generate all regions for a galaxy
 */
export function generateRegions(
  gameId: string,
  empireCount: number,
  empiresPerRegion: number = GALAXY_CONSTANTS.DEFAULT_EMPIRES_PER_REGION,
  random: () => number = Math.random
): NewGalaxyRegion[] {
  const regionCount = calculateRegionCount(empireCount, empiresPerRegion);
  const positions = generateRegionPositions(regionCount, random);

  const regions: NewGalaxyRegion[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const template = REGION_TEMPLATES[pos.type]!;

    // Generate unique name
    let name: string;
    let attempts = 0;
    do {
      name = generateRegionName(template, i, random);
      attempts++;
    } while (usedNames.has(name) && attempts < 10);

    if (usedNames.has(name)) {
      name = `${name} ${i + 1}`;
    }
    usedNames.add(name);

    regions.push({
      gameId,
      name,
      regionType: template.type,
      positionX: pos.x.toFixed(2),
      positionY: pos.y.toFixed(2),
      wealthModifier: template.wealthModifier.toFixed(2),
      dangerLevel: template.dangerLevel + Math.floor(random() * 20) - 10,
      maxEmpires: empiresPerRegion + Math.floor(random() * 5) - 2,
      currentEmpireCount: 0,
    });
  }

  return regions;
}

// =============================================================================
// CONNECTION GENERATION
// =============================================================================

/**
 * Calculate distance between two positions
 */
function calculateDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate connections between regions
 */
export function generateConnections(
  gameId: string,
  regions: Array<{ id: string; positionX: string; positionY: string; regionType: string }>,
  random: () => number = Math.random
): NewRegionConnection[] {
  const connections: NewRegionConnection[] = [];
  const connectionSet = new Set<string>(); // Track existing connections

  // Helper to create connection key
  const makeKey = (r1: string, r2: string) => [r1, r2].sort().join("-");

  for (let i = 0; i < regions.length; i++) {
    const region1 = regions[i]!;
    const p1 = { x: Number(region1.positionX), y: Number(region1.positionY) };

    for (let j = i + 1; j < regions.length; j++) {
      const region2 = regions[j]!;
      const p2 = { x: Number(region2.positionX), y: Number(region2.positionY) };
      const distance = calculateDistance(p1, p2);

      const key = makeKey(region1.id, region2.id);
      if (connectionSet.has(key)) continue;

      // Determine connection type based on distance
      let connectionType: "adjacent" | "trade_route" | "hazardous" | "contested" | null = null;
      let forceMultiplier = "1.00";
      let tradeBonus = "1.00";

      if (distance <= GALAXY_CONSTANTS.ADJACENT_DISTANCE_THRESHOLD) {
        // Adjacent regions - determine specific type
        const roll = random();
        if (roll < GALAXY_CONSTANTS.HAZARDOUS_CHANCE) {
          connectionType = "hazardous";
          forceMultiplier = "1.50";
        } else if (roll < GALAXY_CONSTANTS.HAZARDOUS_CHANCE + GALAXY_CONSTANTS.CONTESTED_CHANCE) {
          connectionType = "contested";
          forceMultiplier = "1.25";
        } else {
          connectionType = "adjacent";
        }
      } else if (distance <= GALAXY_CONSTANTS.TRADE_ROUTE_DISTANCE_THRESHOLD) {
        // Potential trade route (only between compatible regions)
        const isTradeViable =
          (region1.regionType === "core" || region1.regionType === "inner") &&
          (region2.regionType === "core" || region2.regionType === "inner" || region2.regionType === "outer");

        if (isTradeViable && random() < 0.5) {
          connectionType = "trade_route";
          tradeBonus = "1.20";
        }
      }

      if (connectionType) {
        connectionSet.add(key);
        connections.push({
          gameId,
          fromRegionId: region1.id,
          toRegionId: region2.id,
          connectionType,
          forceMultiplier,
          travelCost: connectionType === "hazardous" ? 1000 : 0,
          tradeBonus,
          isBidirectional: true,
        });
      }
    }
  }

  // Ensure every region has at least one connection
  for (const region of regions) {
    const hasConnection = connections.some(
      (c) => c.fromRegionId === region.id || c.toRegionId === region.id
    );

    if (!hasConnection && regions.length > 1) {
      // Find nearest region without an existing connection
      const p1 = { x: Number(region.positionX), y: Number(region.positionY) };
      let nearest = regions.find((r) => r.id !== region.id)!;
      let nearestDist = Infinity;

      for (const other of regions) {
        if (other.id === region.id) continue;
        const p2 = { x: Number(other.positionX), y: Number(other.positionY) };
        const dist = calculateDistance(p1, p2);
        if (dist < nearestDist) {
          nearest = other;
          nearestDist = dist;
        }
      }

      const key = makeKey(region.id, nearest.id);
      if (!connectionSet.has(key)) {
        connectionSet.add(key);
        connections.push({
          gameId,
          fromRegionId: region.id,
          toRegionId: nearest.id,
          connectionType: "adjacent",
          forceMultiplier: "1.00",
          travelCost: 0,
          tradeBonus: "1.00",
          isBidirectional: true,
        });
      }
    }
  }

  return connections;
}

// =============================================================================
// WORMHOLE GENERATION
// =============================================================================

/**
 * Generate hidden wormholes between distant regions
 */
export function generateWormholes(
  gameId: string,
  regions: Array<{ id: string; positionX: string; positionY: string; regionType: string }>,
  empireCount: number,
  existingConnections: NewRegionConnection[],
  random: () => number = Math.random
): NewRegionConnection[] {
  const wormholes: NewRegionConnection[] = [];
  const wormholeCount = Math.ceil(empireCount / 10) * GALAXY_CONSTANTS.WORMHOLES_PER_10_EMPIRES;

  // Track existing connections
  const connectionSet = new Set<string>();
  for (const conn of existingConnections) {
    connectionSet.add([conn.fromRegionId, conn.toRegionId].sort().join("-"));
  }

  // Find distant region pairs for wormholes
  const distantPairs: Array<{ r1: string; r2: string; distance: number }> = [];

  for (let i = 0; i < regions.length; i++) {
    const region1 = regions[i]!;
    const p1 = { x: Number(region1.positionX), y: Number(region1.positionY) };

    for (let j = i + 1; j < regions.length; j++) {
      const region2 = regions[j]!;
      const p2 = { x: Number(region2.positionX), y: Number(region2.positionY) };
      const distance = calculateDistance(p1, p2);

      // Only consider pairs without existing connections and far apart
      const key = [region1.id, region2.id].sort().join("-");
      if (!connectionSet.has(key) && distance > GALAXY_CONSTANTS.TRADE_ROUTE_DISTANCE_THRESHOLD) {
        distantPairs.push({ r1: region1.id, r2: region2.id, distance });
      }
    }
  }

  // Sort by distance (farthest first) and pick random subset
  distantPairs.sort((a, b) => b.distance - a.distance);

  // Shuffle with bias toward distant pairs
  for (let i = 0; i < Math.min(wormholeCount, distantPairs.length); i++) {
    // Pick from top 50% of remaining pairs with some randomness
    const maxIdx = Math.min(distantPairs.length - 1, Math.floor(distantPairs.length * 0.5));
    const idx = Math.floor(random() * (maxIdx + 1));
    const pair = distantPairs.splice(idx, 1)[0]!;

    wormholes.push({
      gameId,
      fromRegionId: pair.r1,
      toRegionId: pair.r2,
      connectionType: "wormhole",
      forceMultiplier: "1.00",
      travelCost: 0,
      tradeBonus: "1.00",
      wormholeStatus: "undiscovered",
      collapseChance: "0.05", // 5% base collapse chance
      isBidirectional: true,
    });
  }

  return wormholes;
}

// =============================================================================
// EMPIRE ASSIGNMENT
// =============================================================================

/**
 * Assign empires to starting regions
 * - Distributes empires evenly across regions
 * - Player starts in outer region (not core, for fairness)
 * - Stronger bot archetypes may start in core regions
 */
export function assignEmpiresToRegions(
  empires: Array<{ id: string; type: "player" | "bot"; botTier?: string | null }>,
  regions: Array<{ id: string; regionType: string; maxEmpires: number }>,
  random: () => number = Math.random
): Map<string, string> {
  const assignments = new Map<string, string>();
  const regionCapacity = new Map<string, number>();

  // Initialize capacity
  for (const region of regions) {
    regionCapacity.set(region.id, region.maxEmpires);
  }

  // Separate player and bots
  const player = empires.find((e) => e.type === "player");
  const bots = empires.filter((e) => e.type === "bot");

  // Assign player to outer or rim region (not core, for fair start)
  if (player) {
    const playerRegions = regions.filter(
      (r) => (r.regionType === "outer" || r.regionType === "inner") && regionCapacity.get(r.id)! > 0
    );
    if (playerRegions.length > 0) {
      const playerRegion = playerRegions[Math.floor(random() * playerRegions.length)]!;
      assignments.set(player.id, playerRegion.id);
      regionCapacity.set(playerRegion.id, regionCapacity.get(playerRegion.id)! - 1);
    } else {
      // Fallback: any region with capacity
      const fallback = regions.find((r) => regionCapacity.get(r.id)! > 0);
      if (fallback) {
        assignments.set(player.id, fallback.id);
        regionCapacity.set(fallback.id, regionCapacity.get(fallback.id)! - 1);
      }
    }
  }

  // Shuffle bots for random distribution
  const shuffledBots = [...bots].sort(() => random() - 0.5);

  // Assign bots round-robin to regions
  let regionIndex = 0;
  const availableRegions = regions.filter((r) => regionCapacity.get(r.id)! > 0);

  for (const bot of shuffledBots) {
    // Find next region with capacity
    let attempts = 0;
    while (regionCapacity.get(availableRegions[regionIndex]!.id)! <= 0 && attempts < availableRegions.length) {
      regionIndex = (regionIndex + 1) % availableRegions.length;
      attempts++;
    }

    const region = availableRegions[regionIndex]!;
    assignments.set(bot.id, region.id);
    regionCapacity.set(region.id, regionCapacity.get(region.id)! - 1);

    // Move to next region
    regionIndex = (regionIndex + 1) % availableRegions.length;
  }

  return assignments;
}

// =============================================================================
// EMPIRE INFLUENCE INITIALIZATION
// =============================================================================

/**
 * Create initial influence records for empires
 */
export function createEmpireInfluenceRecords(
  gameId: string,
  assignments: Map<string, string>,
  empires: Array<{ id: string; planetCount: number }>
): NewEmpireInfluence[] {
  const records: NewEmpireInfluence[] = [];

  for (const empire of empires) {
    const regionId = assignments.get(empire.id);
    if (!regionId) continue;

    records.push({
      empireId: empire.id,
      gameId,
      homeRegionId: regionId,
      primaryRegionId: regionId,
      baseInfluenceRadius: 3,
      bonusInfluenceRadius: 0,
      totalInfluenceRadius: 3,
      directNeighborIds: JSON.stringify([]),
      extendedNeighborIds: JSON.stringify([]),
      knownWormholeIds: JSON.stringify([]),
      controlledRegionIds: JSON.stringify([regionId]),
    });
  }

  return records;
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate a complete galaxy for a new game
 */
export function generateGalaxy(
  gameId: string,
  empires: Array<{ id: string; type: "player" | "bot"; botTier?: string | null; planetCount: number }>,
  config: Partial<GalaxyGenerationConfig> = {}
): {
  regions: NewGalaxyRegion[];
  connections: NewRegionConnection[];
  wormholes: NewRegionConnection[];
  empireAssignments: Map<string, string>;
  empireInfluenceRecords: NewEmpireInfluence[];
} {
  const {
    empireCount = empires.length,
    empiresPerRegion = GALAXY_CONSTANTS.DEFAULT_EMPIRES_PER_REGION,
    // wormholeCount is calculated inside generateWormholes
    seed,
  } = config;

  const random = seed ? createSeededRandom(seed) : Math.random;

  // Generate regions
  const regions = generateRegions(gameId, empireCount, empiresPerRegion, random);

  // For the actual implementation, regions need IDs before we can create connections
  // This would typically be done after inserting to DB
  // Here we'll use placeholder IDs for the generation logic
  const regionsWithIds = regions.map((r, i) => ({
    ...r,
    id: `region-${i}`, // Placeholder - actual IDs come from DB
  }));

  // Generate connections
  const connections = generateConnections(gameId, regionsWithIds, random);

  // Generate wormholes
  const wormholes = generateWormholes(
    gameId,
    regionsWithIds,
    empireCount,
    connections,
    random
  );

  // Assign empires to regions using balanced distribution (M6.1)
  const regionsForAssignment = regionsWithIds.map((r) => ({
    id: r.id,
    regionType: r.regionType,
    maxEmpires: r.maxEmpires ?? GALAXY_CONSTANTS.DEFAULT_EMPIRES_PER_REGION,
    wealthModifier: r.wealthModifier,
  }));
  const empireAssignments = assignEmpiresWithBalancing(empires, regionsForAssignment, random);

  // Create empire influence records
  const empireInfluenceRecords = createEmpireInfluenceRecords(
    gameId,
    empireAssignments,
    empires
  );

  return {
    regions,
    connections,
    wormholes,
    empireAssignments,
    empireInfluenceRecords,
  };
}
