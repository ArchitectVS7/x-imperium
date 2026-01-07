/**
 * Coalition Repository (M11)
 *
 * CRUD operations for coalitions and coalition members.
 * Handles database access for the coalition system.
 */

import { db } from "@/lib/db";
import {
  coalitions,
  coalitionMembers,
  sectors,
  type Coalition,
  type NewCoalition,
  type CoalitionMember,
  type NewCoalitionMember,
  type Empire,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// =============================================================================
// TYPES
// =============================================================================

export interface CoalitionWithMembers extends Coalition {
  members: (CoalitionMember & { empire: Empire })[];
}

export interface CoalitionInvitation {
  coalitionId: string;
  coalitionName: string;
  leaderId: string;
  leaderName: string;
  invitedAt: Date;
}

// =============================================================================
// COALITION CRUD
// =============================================================================

/**
 * Create a new coalition.
 */
export async function createCoalition(
  data: NewCoalition
): Promise<Coalition> {
  const [coalition] = await db.insert(coalitions).values(data).returning();
  if (!coalition) {
    throw new Error("Failed to create coalition");
  }
  return coalition;
}

/**
 * Get a coalition by ID.
 */
export async function getCoalitionById(
  coalitionId: string
): Promise<Coalition | undefined> {
  return db.query.coalitions.findFirst({
    where: eq(coalitions.id, coalitionId),
  });
}

/**
 * Get a coalition with all its active members.
 */
export async function getCoalitionWithMembers(
  coalitionId: string
): Promise<CoalitionWithMembers | undefined> {
  const coalition = await db.query.coalitions.findFirst({
    where: eq(coalitions.id, coalitionId),
    with: {
      members: {
        where: eq(coalitionMembers.isActive, true),
        with: {
          empire: true,
        },
      },
    },
  });

  if (!coalition) return undefined;

  return coalition as CoalitionWithMembers;
}

/**
 * Get all active coalitions for a game.
 */
export async function getGameCoalitions(
  gameId: string
): Promise<Coalition[]> {
  return db.query.coalitions.findMany({
    where: and(
      eq(coalitions.gameId, gameId),
      eq(coalitions.status, "active")
    ),
  });
}

/**
 * Update coalition stats (member count, networth, territory).
 */
export async function updateCoalitionStats(
  coalitionId: string
): Promise<void> {
  // Get active members
  const members = await db.query.coalitionMembers.findMany({
    where: and(
      eq(coalitionMembers.coalitionId, coalitionId),
      eq(coalitionMembers.isActive, true)
    ),
    with: {
      empire: true,
    },
  });

  const memberCount = members.length;
  const totalNetworth = members.reduce((sum, m) => sum + m.empire.networth, 0);

  // Calculate territory percentage
  const coalition = await getCoalitionById(coalitionId);
  if (!coalition) return;

  const [totalPlanetsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sectors)
    .where(eq(sectors.gameId, coalition.gameId));

  const memberPlanets = members.reduce((sum, m) => sum + m.empire.sectorCount, 0);
  const totalSectors = Number(totalPlanetsResult?.count ?? 0);
  const territoryPercent = totalSectors > 0 ? (memberPlanets / totalSectors) * 100 : 0;

  await db
    .update(coalitions)
    .set({
      memberCount,
      totalNetworth,
      territoryPercent: String(territoryPercent.toFixed(2)),
      updatedAt: new Date(),
    })
    .where(eq(coalitions.id, coalitionId));
}

/**
 * Update coalition status.
 */
export async function updateCoalitionStatus(
  coalitionId: string,
  status: "forming" | "active" | "dissolved",
  dissolvedAtTurn?: number
): Promise<void> {
  await db
    .update(coalitions)
    .set({
      status,
      dissolvedAtTurn,
      updatedAt: new Date(),
    })
    .where(eq(coalitions.id, coalitionId));
}

/**
 * Get coalition by empire ID (if the empire is in a coalition).
 */
export async function getEmpireCoalition(
  empireId: string
): Promise<Coalition | undefined> {
  const membership = await db.query.coalitionMembers.findFirst({
    where: and(
      eq(coalitionMembers.empireId, empireId),
      eq(coalitionMembers.isActive, true)
    ),
    with: {
      coalition: true,
    },
  });

  if (!membership || membership.coalition.status !== "active") {
    return undefined;
  }

  return membership.coalition;
}

// =============================================================================
// COALITION MEMBER CRUD
// =============================================================================

/**
 * Add a member to a coalition.
 */
export async function addCoalitionMember(
  data: NewCoalitionMember
): Promise<CoalitionMember> {
  const [member] = await db.insert(coalitionMembers).values(data).returning();
  if (!member) {
    throw new Error("Failed to add coalition member");
  }

  // Update coalition stats
  await updateCoalitionStats(data.coalitionId);

  return member;
}

/**
 * Get a coalition member by empire ID.
 */
export async function getCoalitionMember(
  coalitionId: string,
  empireId: string
): Promise<CoalitionMember | undefined> {
  return db.query.coalitionMembers.findFirst({
    where: and(
      eq(coalitionMembers.coalitionId, coalitionId),
      eq(coalitionMembers.empireId, empireId)
    ),
  });
}

/**
 * Get all active members of a coalition.
 */
export async function getActiveMembers(
  coalitionId: string
): Promise<(CoalitionMember & { empire: Empire })[]> {
  const members = await db.query.coalitionMembers.findMany({
    where: and(
      eq(coalitionMembers.coalitionId, coalitionId),
      eq(coalitionMembers.isActive, true)
    ),
    with: {
      empire: true,
    },
  });

  return members as (CoalitionMember & { empire: Empire })[];
}

/**
 * Deactivate a coalition member (leave coalition).
 */
export async function deactivateCoalitionMember(
  coalitionId: string,
  empireId: string,
  leftAtTurn: number
): Promise<void> {
  await db
    .update(coalitionMembers)
    .set({
      isActive: false,
      leftAtTurn,
    })
    .where(
      and(
        eq(coalitionMembers.coalitionId, coalitionId),
        eq(coalitionMembers.empireId, empireId)
      )
    );

  // Update coalition stats
  await updateCoalitionStats(coalitionId);
}

/**
 * Check if an empire is already in any active coalition.
 */
export async function isEmpireInCoalition(
  empireId: string
): Promise<boolean> {
  const membership = await db.query.coalitionMembers.findFirst({
    where: and(
      eq(coalitionMembers.empireId, empireId),
      eq(coalitionMembers.isActive, true)
    ),
  });

  return !!membership;
}

/**
 * Get the count of total sectors in a game.
 */
export async function getTotalPlanetCount(gameId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sectors)
    .where(eq(sectors.gameId, gameId));

  return Number(result?.count ?? 0);
}

/**
 * Get all empires in a coalition.
 */
export async function getCoalitionEmpires(
  coalitionId: string
): Promise<Empire[]> {
  const members = await getActiveMembers(coalitionId);
  return members.map((m) => m.empire);
}
