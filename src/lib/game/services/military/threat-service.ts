/**
 * Threat Assessment Service (M8.1)
 *
 * Calculates threat levels for empires relative to the player.
 * Answers "Who should I be worried about?" at a glance.
 *
 * Threat Levels:
 * - immediate: Boss, recent attacker, or 2×+ hostile
 * - watch: 1.5×+ networth or military buildup
 * - neutral: No significant threat
 * - friendly: Allied or NAP partner
 */

import { db } from "@/lib/db";
import { attacks, treaties, empires } from "@/lib/db/schema";
import { eq, and, or, desc, gte } from "drizzle-orm";

// =============================================================================
// CONSTANTS
// =============================================================================

export const THREAT_CONSTANTS = {
  /** Networth ratio threshold for immediate threat (with hostile status) */
  IMMEDIATE_NETWORTH_RATIO: 2.0,
  /** Networth ratio threshold for watch level */
  WATCH_NETWORTH_RATIO: 1.5,
  /** Military ratio threshold for watch level */
  WATCH_MILITARY_RATIO: 1.5,
  /** Turns to look back for recent actions */
  RECENT_ACTION_TURNS: 10,
};

// =============================================================================
// TYPES
// =============================================================================

export type ThreatLevel = "immediate" | "watch" | "neutral" | "friendly";

export type DiplomaticStatus = "allied" | "nap" | "neutral" | "hostile";

export type RecentAction =
  | "attacked_you"
  | "attacked_by_you"
  | "military_buildup"
  | "economic_growth"
  | "none";

export interface ThreatInfo {
  empireId: string;
  empireName: string;
  threatLevel: ThreatLevel;
  networthRatio: number;
  militaryRatio: number;
  recentAction: RecentAction;
  diplomaticStatus: DiplomaticStatus;
  isBoss: boolean;
  regionId?: string;
  regionName?: string;
}

export interface ThreatAssessmentResult {
  threats: ThreatInfo[];
  immediateCount: number;
  watchCount: number;
  friendlyCount: number;
}

// =============================================================================
// PURE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate military power from forces.
 */
export function calculateMilitaryPower(forces: {
  soldiers: number;
  fighters: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
}): number {
  return (
    forces.soldiers * 1 +
    forces.fighters * 3 +
    forces.lightCruisers * 5 +
    forces.heavyCruisers * 8 +
    forces.carriers * 12
  );
}

/**
 * Calculate threat level based on threat info.
 */
export function calculateThreatLevel(info: {
  isBoss: boolean;
  recentAction: RecentAction;
  diplomaticStatus: DiplomaticStatus;
  networthRatio: number;
  militaryRatio: number;
}): ThreatLevel {
  // Immediate: Boss OR attacked you recently OR 2×+ your networth + aggressive
  if (info.isBoss) return "immediate";
  if (info.recentAction === "attacked_you") return "immediate";
  if (
    info.networthRatio >= THREAT_CONSTANTS.IMMEDIATE_NETWORTH_RATIO &&
    info.diplomaticStatus === "hostile"
  ) {
    return "immediate";
  }

  // Friendly: Allied or NAP
  if (info.diplomaticStatus === "allied" || info.diplomaticStatus === "nap") {
    return "friendly";
  }

  // Watch: 1.5×+ networth or military buildup
  if (info.networthRatio >= THREAT_CONSTANTS.WATCH_NETWORTH_RATIO) {
    return "watch";
  }
  if (info.militaryRatio >= THREAT_CONSTANTS.WATCH_MILITARY_RATIO) {
    return "watch";
  }
  if (info.recentAction === "military_buildup") {
    return "watch";
  }

  return "neutral";
}

/**
 * Get priority for sorting (lower = more urgent).
 */
export function getThreatPriority(level: ThreatLevel): number {
  switch (level) {
    case "immediate":
      return 0;
    case "watch":
      return 1;
    case "neutral":
      return 2;
    case "friendly":
      return 3;
  }
}

/**
 * Format recent action for display.
 */
export function formatRecentAction(action: RecentAction): string {
  switch (action) {
    case "attacked_you":
      return "⚔️ Attacked you recently";
    case "attacked_by_you":
      return "🎯 You attacked them";
    case "military_buildup":
      return "🏗️ Building military";
    case "economic_growth":
      return "📈 Growing economy";
    case "none":
      return "";
  }
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Get diplomatic status between two empires.
 */
export async function getDiplomaticStatus(
  empireId: string,
  playerEmpireId: string,
  gameId: string
): Promise<DiplomaticStatus> {
  const treaty = await db.query.treaties.findFirst({
    where: and(
      eq(treaties.gameId, gameId),
      eq(treaties.status, "active"),
      or(
        and(eq(treaties.proposerId, empireId), eq(treaties.recipientId, playerEmpireId)),
        and(eq(treaties.proposerId, playerEmpireId), eq(treaties.recipientId, empireId))
      )
    ),
  });

  if (!treaty) return "neutral";

  if (treaty.treatyType === "alliance") return "allied";
  if (treaty.treatyType === "nap") return "nap";

  return "neutral";
}

/**
 * Get recent actions by an empire toward the player.
 */
export async function getRecentAction(
  empireId: string,
  playerEmpireId: string,
  gameId: string,
  currentTurn: number
): Promise<RecentAction> {
  const recentTurnThreshold = Math.max(1, currentTurn - THREAT_CONSTANTS.RECENT_ACTION_TURNS);

  // Check if they attacked the player
  const attackOnPlayer = await db.query.attacks.findFirst({
    where: and(
      eq(attacks.gameId, gameId),
      eq(attacks.attackerId, empireId),
      eq(attacks.defenderId, playerEmpireId),
      gte(attacks.turn, recentTurnThreshold)
    ),
    orderBy: desc(attacks.turn),
  });

  if (attackOnPlayer) return "attacked_you";

  // Check if player attacked them
  const attackByPlayer = await db.query.attacks.findFirst({
    where: and(
      eq(attacks.gameId, gameId),
      eq(attacks.attackerId, playerEmpireId),
      eq(attacks.defenderId, empireId),
      gte(attacks.turn, recentTurnThreshold)
    ),
    orderBy: desc(attacks.turn),
  });

  if (attackByPlayer) return "attacked_by_you";

  return "none";
}

/**
 * Assess threats for the player in a game.
 */
export async function assessThreats(
  gameId: string,
  playerEmpireId: string,
  currentTurn: number
): Promise<ThreatAssessmentResult> {
  // Fetch player empire
  const playerEmpire = await db.query.empires.findFirst({
    where: eq(empires.id, playerEmpireId),
  });

  if (!playerEmpire) {
    return { threats: [], immediateCount: 0, watchCount: 0, friendlyCount: 0 };
  }

  // Fetch all other empires in the game
  const allEmpires = await db.query.empires.findMany({
    where: and(eq(empires.gameId, gameId), eq(empires.isEliminated, false)),
  });

  const playerPower = calculateMilitaryPower({
    soldiers: playerEmpire.soldiers,
    fighters: playerEmpire.fighters,
    lightCruisers: playerEmpire.lightCruisers,
    heavyCruisers: playerEmpire.heavyCruisers,
    carriers: playerEmpire.carriers,
  });

  const threats: ThreatInfo[] = [];

  for (const empire of allEmpires) {
    if (empire.id === playerEmpireId) continue;

    const diplomaticStatus = await getDiplomaticStatus(empire.id, playerEmpireId, gameId);
    const recentAction = await getRecentAction(empire.id, playerEmpireId, gameId, currentTurn);

    const empirePower = calculateMilitaryPower({
      soldiers: empire.soldiers,
      fighters: empire.fighters,
      lightCruisers: empire.lightCruisers,
      heavyCruisers: empire.heavyCruisers,
      carriers: empire.carriers,
    });

    const networthRatio = playerEmpire.networth > 0 ? empire.networth / playerEmpire.networth : 0;
    const militaryRatio = playerPower > 0 ? empirePower / playerPower : 0;

    const threatLevel = calculateThreatLevel({
      isBoss: empire.isBoss,
      recentAction,
      diplomaticStatus,
      networthRatio,
      militaryRatio,
    });

    threats.push({
      empireId: empire.id,
      empireName: empire.name,
      threatLevel,
      networthRatio,
      militaryRatio,
      recentAction,
      diplomaticStatus,
      isBoss: empire.isBoss,
    });
  }

  // Sort by threat priority
  threats.sort((a, b) => getThreatPriority(a.threatLevel) - getThreatPriority(b.threatLevel));

  return {
    threats,
    immediateCount: threats.filter((t) => t.threatLevel === "immediate").length,
    watchCount: threats.filter((t) => t.threatLevel === "watch").length,
    friendlyCount: threats.filter((t) => t.threatLevel === "friendly").length,
  };
}
