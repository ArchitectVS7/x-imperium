/**
 * Checkpoint Service (M11 - PRD 11.3)
 *
 * Implements 30-turn alliance evaluation checkpoints.
 * Detects power imbalances and triggers rebalancing events.
 *
 * Checkpoints occur at: 30, 60, 90, 120, 150, 180
 *
 * @see docs/PRD.md Section 11.3
 * @see docs/MILESTONES.md Milestone 11
 */

import { db } from "@/lib/db";
import {
  coalitions,
  coalitionMembers,
  treaties,
  empires,
  type Empire,
  type Coalition,
  type Treaty,
} from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import type { GalacticEvent } from "@/lib/events/types";

// =============================================================================
// TYPES
// =============================================================================

export interface AllianceGroup {
  id: string;
  name: string;
  memberIds: string[];
  memberNames: string[];
  totalNetworth: number;
  planetCount: number;
  isCoalition: boolean;
}

export interface CheckpointResult {
  isCheckpoint: boolean;
  turn: number;
  alliances: AllianceGroup[];
  imbalanceDetected: boolean;
  topAlliance: AllianceGroup | null;
  rebalancingEvent: GalacticEvent | null;
  message: string;
}

export interface PowerBalance {
  topAlliancePower: number;
  secondAlliancePower: number;
  thirdAlliancePower: number;
  imbalanceRatio: number;
  isImbalanced: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Turns at which checkpoints occur */
export const CHECKPOINT_TURNS = [30, 60, 90, 120, 150, 180] as const;

/** Imbalance threshold: top alliance must have > 2x power of #2 + #3 combined */
export const IMBALANCE_THRESHOLD = 2.0;

/** Minimum alliance size to be considered for checkpoint */
export const MIN_ALLIANCE_SIZE = 2;

// =============================================================================
// CHECKPOINT EVALUATION
// =============================================================================

/**
 * Check if current turn is a checkpoint turn.
 */
export function isCheckpointTurn(turn: number): boolean {
  return CHECKPOINT_TURNS.includes(turn as typeof CHECKPOINT_TURNS[number]);
}

/**
 * Evaluate alliance checkpoint at the current turn.
 *
 * @param gameId - Game UUID
 * @param turn - Current turn number
 * @returns Checkpoint evaluation result
 */
export async function evaluateAllianceCheckpoint(
  gameId: string,
  turn: number
): Promise<CheckpointResult> {
  // Check if this is a checkpoint turn
  if (!isCheckpointTurn(turn)) {
    return {
      isCheckpoint: false,
      turn,
      alliances: [],
      imbalanceDetected: false,
      topAlliance: null,
      rebalancingEvent: null,
      message: "Not a checkpoint turn",
    };
  }

  // Identify all alliances in the game
  const alliances = await identifyAlliances(gameId);

  // If no significant alliances, no checkpoint needed
  if (alliances.length === 0) {
    return {
      isCheckpoint: true,
      turn,
      alliances: [],
      imbalanceDetected: false,
      topAlliance: null,
      rebalancingEvent: null,
      message: `Turn ${turn} checkpoint: No significant alliances detected`,
    };
  }

  // Sort by total networth
  alliances.sort((a, b) => b.totalNetworth - a.totalNetworth);

  // Check for power imbalance
  const balance = calculatePowerBalance(alliances);

  if (!balance.isImbalanced) {
    return {
      isCheckpoint: true,
      turn,
      alliances,
      imbalanceDetected: false,
      topAlliance: alliances[0] ?? null,
      rebalancingEvent: null,
      message: `Turn ${turn} checkpoint: Power balance stable (ratio: ${balance.imbalanceRatio.toFixed(2)})`,
    };
  }

  // Imbalance detected - select rebalancing event
  const rebalancingEvent = selectRebalancingEvent(turn, alliances[0]!);

  return {
    isCheckpoint: true,
    turn,
    alliances,
    imbalanceDetected: true,
    topAlliance: alliances[0] ?? null,
    rebalancingEvent,
    message: `Turn ${turn} checkpoint: Power imbalance detected! ${alliances[0]?.name ?? "Unknown"} dominates with ${balance.imbalanceRatio.toFixed(2)}x power ratio`,
  };
}

// =============================================================================
// ALLIANCE IDENTIFICATION
// =============================================================================

/**
 * Identify all alliances in a game.
 * Alliances can be formal coalitions or groups of empires with active alliance treaties.
 */
async function identifyAlliances(gameId: string): Promise<AllianceGroup[]> {
  const alliances: AllianceGroup[] = [];

  // 1. Get formal coalitions
  const coalitionAlliances = await getCoalitionAlliances(gameId);
  alliances.push(...coalitionAlliances);

  // 2. Get treaty-based alliances (empires with active alliance treaties)
  const treatyAlliances = await getTreatyAlliances(gameId, coalitionAlliances);
  alliances.push(...treatyAlliances);

  // 3. Filter to only significant alliances (2+ members)
  return alliances.filter((a) => a.memberIds.length >= MIN_ALLIANCE_SIZE);
}

/**
 * Get alliances from formal coalitions.
 */
async function getCoalitionAlliances(gameId: string): Promise<AllianceGroup[]> {
  const activeCoalitions = await db.query.coalitions.findMany({
    where: and(
      eq(coalitions.gameId, gameId),
      eq(coalitions.status, "active")
    ),
    with: {
      members: {
        where: eq(coalitionMembers.isActive, true),
      },
    },
  });

  const alliances: AllianceGroup[] = [];

  for (const coalition of activeCoalitions) {
    // Get member empire details
    const memberIds = coalition.members.map((m) => m.empireId);
    const memberEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
    });

    const coalitionMembers = memberEmpires.filter((e) =>
      memberIds.includes(e.id)
    );

    const totalNetworth = coalitionMembers.reduce(
      (sum, e) => sum + e.networth,
      0
    );
    const planetCount = coalitionMembers.reduce(
      (sum, e) => sum + e.planetCount,
      0
    );

    alliances.push({
      id: coalition.id,
      name: coalition.name,
      memberIds,
      memberNames: coalitionMembers.map((e) => e.name),
      totalNetworth,
      planetCount,
      isCoalition: true,
    });
  }

  return alliances;
}

/**
 * Get alliances from active alliance treaties.
 * Groups empires that have mutual alliance treaties into alliance groups.
 */
async function getTreatyAlliances(
  gameId: string,
  existingCoalitions: AllianceGroup[]
): Promise<AllianceGroup[]> {
  // Get all active alliance treaties
  const allianceTreaties = await db.query.treaties.findMany({
    where: and(
      eq(treaties.gameId, gameId),
      eq(treaties.treatyType, "alliance"),
      eq(treaties.status, "active")
    ),
  });

  if (allianceTreaties.length === 0) {
    return [];
  }

  // Build adjacency list of allied empires
  const allyMap = new Map<string, Set<string>>();

  for (const treaty of allianceTreaties) {
    if (!allyMap.has(treaty.proposerId)) {
      allyMap.set(treaty.proposerId, new Set());
    }
    if (!allyMap.has(treaty.recipientId)) {
      allyMap.set(treaty.recipientId, new Set());
    }
    allyMap.get(treaty.proposerId)!.add(treaty.recipientId);
    allyMap.get(treaty.recipientId)!.add(treaty.proposerId);
  }

  // Find connected components (alliance groups)
  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const empireId of Array.from(allyMap.keys())) {
    if (visited.has(empireId)) continue;

    const group: string[] = [];
    const queue = [empireId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      group.push(current);

      const allies = allyMap.get(current) ?? new Set<string>();
      for (const ally of Array.from(allies)) {
        if (!visited.has(ally)) {
          queue.push(ally);
        }
      }
    }

    if (group.length >= MIN_ALLIANCE_SIZE) {
      groups.push(group);
    }
  }

  // Get empire details and exclude empires already in coalitions
  const coalitionMemberIds = new Set(
    existingCoalitions.flatMap((c) => c.memberIds)
  );

  const gameEmpires = await db.query.empires.findMany({
    where: eq(empires.gameId, gameId),
  });

  const empireMap = new Map(gameEmpires.map((e) => [e.id, e]));

  const treatyAlliances: AllianceGroup[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    // Filter out empires already in coalitions
    const filteredGroup = group.filter((id) => !coalitionMemberIds.has(id));

    if (filteredGroup.length < MIN_ALLIANCE_SIZE) continue;

    const members = filteredGroup
      .map((id) => empireMap.get(id))
      .filter((e): e is Empire => e !== undefined);

    const totalNetworth = members.reduce((sum, e) => sum + e.networth, 0);
    const planetCount = members.reduce((sum, e) => sum + e.planetCount, 0);

    treatyAlliances.push({
      id: `treaty-alliance-${i}`,
      name: `${members[0]?.name ?? "Unknown"} Alliance`,
      memberIds: filteredGroup,
      memberNames: members.map((e) => e.name),
      totalNetworth,
      planetCount,
      isCoalition: false,
    });
  }

  return treatyAlliances;
}

// =============================================================================
// POWER BALANCE CALCULATION
// =============================================================================

/**
 * Calculate power balance between alliances.
 */
function calculatePowerBalance(alliances: AllianceGroup[]): PowerBalance {
  const topPower = alliances[0]?.totalNetworth ?? 0;
  const secondPower = alliances[1]?.totalNetworth ?? 0;
  const thirdPower = alliances[2]?.totalNetworth ?? 0;

  const competitorPower = secondPower + thirdPower;
  const ratio = competitorPower > 0 ? topPower / competitorPower : Infinity;

  return {
    topAlliancePower: topPower,
    secondAlliancePower: secondPower,
    thirdAlliancePower: thirdPower,
    imbalanceRatio: ratio,
    isImbalanced: ratio > IMBALANCE_THRESHOLD,
  };
}

// =============================================================================
// REBALANCING EVENTS
// =============================================================================

/**
 * Select a rebalancing event to trigger when power imbalance is detected.
 */
function selectRebalancingEvent(
  turn: number,
  dominantAlliance: AllianceGroup
): GalacticEvent {
  // Different events based on game stage
  if (turn <= 60) {
    return createEarlyGameRebalancingEvent(dominantAlliance);
  } else if (turn <= 120) {
    return createMidGameRebalancingEvent(dominantAlliance);
  } else {
    return createLateGameRebalancingEvent(dominantAlliance);
  }
}

/**
 * Early game rebalancing: Economic disruption to dominant alliance.
 */
function createEarlyGameRebalancingEvent(
  dominantAlliance: AllianceGroup
): GalacticEvent {
  return {
    id: "checkpoint_economic_sanctions",
    name: "Galactic Economic Sanctions",
    category: "political",
    scope: "coalition",
    targetCount: dominantAlliance.memberIds.length,
    description: `The Galactic Council imposes sanctions on ${dominantAlliance.name} due to growing concerns about their dominance`,
    narrative:
      `Growing alarm at the expanding power of ${dominantAlliance.name} has prompted ` +
      `the Galactic Council to impose harsh economic sanctions. Trade routes are blocked ` +
      `and diplomatic ties are severed as smaller empires band together in resistance.`,
    effects: [
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.7, // -30% credit income
      },
      {
        type: "civil_status",
        change: -1, // Drop 1 civil status level
      },
    ],
    duration: 10,
    probability: 1.0, // Guaranteed trigger
    unique: false,
  };
}

/**
 * Mid game rebalancing: Military uprising against dominant alliance.
 */
function createMidGameRebalancingEvent(
  dominantAlliance: AllianceGroup
): GalacticEvent {
  return {
    id: "checkpoint_rebellion",
    name: "Coalition Uprising",
    category: "military",
    scope: "coalition",
    targetCount: dominantAlliance.memberIds.length,
    description: `Rebel forces attack ${dominantAlliance.name} holdings across the galaxy`,
    narrative:
      `Desperate smaller empires have funded a massive rebel fleet to challenge ` +
      `${dominantAlliance.name}'s growing hegemony. Coordinated strikes target ` +
      `military installations and supply lines throughout their territory.`,
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: 0.15, // 15% unit loss
      },
      {
        type: "resource_multiplier",
        resource: "petroleum",
        multiplier: 0.6, // -40% petroleum (fuel supplies disrupted)
      },
    ],
    duration: 5,
    probability: 1.0,
    unique: false,
  };
}

/**
 * Late game rebalancing: Catastrophic event targeting dominant alliance.
 */
function createLateGameRebalancingEvent(
  dominantAlliance: AllianceGroup
): GalacticEvent {
  return {
    id: "checkpoint_galactic_intervention",
    name: "Galactic Intervention",
    category: "political",
    scope: "coalition",
    targetCount: dominantAlliance.memberIds.length,
    description: `Ancient powers awaken to challenge ${dominantAlliance.name}'s expansion`,
    narrative:
      `The unchecked expansion of ${dominantAlliance.name} has triggered an ancient ` +
      `failsafe buried in the galaxy's core. Automated defense systems activate, ` +
      `targeting the dominant power's key installations with devastating precision.`,
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: 0.25, // 25% unit loss
      },
      {
        type: "resource_multiplier",
        resource: "all",
        multiplier: 0.75, // -25% all resources
      },
      {
        type: "civil_status",
        change: -2, // Drop 2 civil status levels
      },
    ],
    duration: 8,
    probability: 1.0,
    unique: false,
  };
}

// =============================================================================
// NOTIFICATION HELPERS
// =============================================================================

/**
 * Generate checkpoint notification message for player.
 */
export function generateCheckpointNotification(
  result: CheckpointResult
): string {
  if (!result.isCheckpoint) {
    return "";
  }

  if (!result.imbalanceDetected) {
    return `[Turn ${result.turn} Checkpoint] The galactic balance of power remains stable.`;
  }

  const topAlliance = result.topAlliance;
  if (!topAlliance) {
    return `[Turn ${result.turn} Checkpoint] Power imbalance detected!`;
  }

  return (
    `[Turn ${result.turn} Checkpoint] ⚠️ Power Imbalance Detected!\n` +
    `${topAlliance.name} has grown too powerful (${topAlliance.totalNetworth.toLocaleString()} networth).\n` +
    `The galaxy responds with: ${result.rebalancingEvent?.name ?? "Unknown event"}`
  );
}
