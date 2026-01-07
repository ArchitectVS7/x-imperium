/**
 * Coalition Service (M11)
 *
 * Business logic for coalition system (PRD 8.2):
 * - Formal group of allied empires with shared victory
 * - Max 5 members, min 2 to form
 * - Diplomatic victory: coalition controls 50% of territory
 * - Coalition warfare available at Turn 75+
 *
 * @see docs/PRD.md Section 8.2 (Coalitions)
 */

import { db } from "@/lib/db";
import { empires, coalitions, coalitionMembers, type Coalition, type Empire } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  COALITION_MAX_MEMBERS,
  COALITION_MIN_MEMBERS,
  COALITION_VICTORY_THRESHOLD,
} from "@/lib/constants/diplomacy";
import {
  createCoalition as createCoalitionDb,
  addCoalitionMember,
  getCoalitionById,
  getCoalitionWithMembers,
  getActiveMembers,
  getCoalitionMember,
  isEmpireInCoalition,
  getEmpireCoalition,
  getTotalPlanetCount,
  getCoalitionEmpires,
  type CoalitionWithMembers,
} from "../repositories/coalition-repository";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Turn when coalitions become available (PRD 8.2) */
export const COALITION_UNLOCK_TURN = 20;

/** Turn when coordinated attacks become available (PRD 8.2) */
export const COALITION_WARFARE_UNLOCK_TURN = 75;

/** Combat power bonus for coordinated attacks */
export const COORDINATED_ATTACK_BONUS = 0.10; // +10%

// =============================================================================
// TYPES
// =============================================================================

export interface CoalitionResult {
  success: boolean;
  error?: string;
  coalition?: Coalition;
}

export interface CoalitionMemberResult {
  success: boolean;
  error?: string;
}

export interface CoalitionVictoryCheck {
  achieved: boolean;
  coalitionId: string;
  coalitionName: string;
  territoryPercent: number;
  memberCount: number;
  members: Array<{ id: string; name: string; sectorCount: number }>;
}

export interface CoordinatedAttack {
  id: string;
  coalitionId: string;
  proposerEmpireId: string;
  proposerName: string;
  targetEmpireId: string;
  targetName: string;
  scheduledTurn: number;
  participants: string[];
  status: "proposed" | "confirmed" | "executed" | "cancelled";
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if coalitions are unlocked for the current turn.
 */
export function areCoalitionsUnlocked(currentTurn: number): boolean {
  return currentTurn >= COALITION_UNLOCK_TURN;
}

/**
 * Check if coalition warfare is unlocked for the current turn.
 */
export function isCoalitionWarfareUnlocked(currentTurn: number): boolean {
  return currentTurn >= COALITION_WARFARE_UNLOCK_TURN;
}

/**
 * Validate UUID format.
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// =============================================================================
// COALITION MANAGEMENT
// =============================================================================

/**
 * Create a new coalition.
 * The founder automatically becomes the leader and first member.
 *
 * @param gameId - Game ID
 * @param founderEmpireId - Empire ID of the founder
 * @param name - Coalition name
 * @param currentTurn - Current game turn (for validation)
 */
export async function createCoalition(
  gameId: string,
  founderEmpireId: string,
  name: string,
  currentTurn: number
): Promise<CoalitionResult> {
  // Validate inputs
  if (!isValidUUID(gameId) || !isValidUUID(founderEmpireId)) {
    return { success: false, error: "Invalid ID format" };
  }

  if (!name || name.trim().length === 0) {
    return { success: false, error: "Coalition name is required" };
  }

  if (name.length > 200) {
    return { success: false, error: "Coalition name too long (max 200 characters)" };
  }

  // Check if coalitions are unlocked
  if (!areCoalitionsUnlocked(currentTurn)) {
    return {
      success: false,
      error: `Coalitions unlock at turn ${COALITION_UNLOCK_TURN}. Current turn: ${currentTurn}`,
    };
  }

  // Check if founder exists and is in the game
  const founder = await db.query.empires.findFirst({
    where: eq(empires.id, founderEmpireId),
  });

  if (!founder) {
    return { success: false, error: "Empire not found" };
  }

  if (founder.gameId !== gameId) {
    return { success: false, error: "Empire does not belong to this game" };
  }

  if (founder.isEliminated) {
    return { success: false, error: "Eliminated empires cannot create coalitions" };
  }

  // Check if founder is already in a coalition
  if (await isEmpireInCoalition(founderEmpireId)) {
    return { success: false, error: "Empire is already in a coalition" };
  }

  try {
    // Create the coalition
    const coalition = await createCoalitionDb({
      gameId,
      name: name.trim(),
      leaderId: founderEmpireId,
      status: "forming", // Will become "active" when minimum members join
      formedAtTurn: currentTurn,
      memberCount: 1,
      totalNetworth: founder.networth,
    });

    // Add founder as first member
    await addCoalitionMember({
      coalitionId: coalition.id,
      empireId: founderEmpireId,
      gameId,
      joinedAtTurn: currentTurn,
    });

    return { success: true, coalition };
  } catch (error) {
    console.error("Error creating coalition:", error);
    return { success: false, error: "Failed to create coalition" };
  }
}

/**
 * Invite an empire to join a coalition.
 * Only the coalition leader can send invitations.
 *
 * NOTE: For simplicity, this currently works as a direct join.
 * A full invitation system would require a separate invitations table.
 */
export async function inviteToCoalition(
  coalitionId: string,
  inviterEmpireId: string,
  inviteeEmpireId: string,
  currentTurn: number
): Promise<CoalitionMemberResult> {
  // Validate inputs
  if (!isValidUUID(coalitionId) || !isValidUUID(inviterEmpireId) || !isValidUUID(inviteeEmpireId)) {
    return { success: false, error: "Invalid ID format" };
  }

  // Get coalition
  const coalition = await getCoalitionById(coalitionId);
  if (!coalition) {
    return { success: false, error: "Coalition not found" };
  }

  if (coalition.status === "dissolved") {
    return { success: false, error: "Coalition has been dissolved" };
  }

  // Only leader can invite
  if (coalition.leaderId !== inviterEmpireId) {
    return { success: false, error: "Only the coalition leader can invite members" };
  }

  // Check member limit
  const members = await getActiveMembers(coalitionId);
  if (members.length >= COALITION_MAX_MEMBERS) {
    return {
      success: false,
      error: `Coalition is full (max ${COALITION_MAX_MEMBERS} members)`,
    };
  }

  // Check if invitee exists
  const invitee = await db.query.empires.findFirst({
    where: eq(empires.id, inviteeEmpireId),
  });

  if (!invitee) {
    return { success: false, error: "Invited empire not found" };
  }

  if (invitee.gameId !== coalition.gameId) {
    return { success: false, error: "Empire not in same game" };
  }

  if (invitee.isEliminated) {
    return { success: false, error: "Cannot invite eliminated empire" };
  }

  // Check if already in a coalition
  if (await isEmpireInCoalition(inviteeEmpireId)) {
    return { success: false, error: "Empire is already in a coalition" };
  }

  // For now, direct join (invitation system would be separate)
  return acceptCoalitionInvite(coalitionId, inviteeEmpireId, currentTurn);
}

/**
 * Accept a coalition invitation and join.
 * Uses transaction to prevent race conditions.
 */
export async function acceptCoalitionInvite(
  coalitionId: string,
  empireId: string,
  currentTurn: number
): Promise<CoalitionMemberResult> {
  // Validate inputs
  if (!isValidUUID(coalitionId) || !isValidUUID(empireId)) {
    return { success: false, error: "Invalid ID format" };
  }

  // Get coalition
  const coalition = await getCoalitionById(coalitionId);
  if (!coalition) {
    return { success: false, error: "Coalition not found" };
  }

  if (coalition.status === "dissolved") {
    return { success: false, error: "Coalition has been dissolved" };
  }

  // Check if empire exists
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { success: false, error: "Empire not found" };
  }

  if (empire.gameId !== coalition.gameId) {
    return { success: false, error: "Empire not in same game" };
  }

  if (empire.isEliminated) {
    return { success: false, error: "Eliminated empires cannot join coalitions" };
  }

  // Check if already in a coalition
  if (await isEmpireInCoalition(empireId)) {
    return { success: false, error: "Empire is already in a coalition" };
  }

  try {
    // Use transaction to ensure atomicity of member check + add
    await db.transaction(async (tx) => {
      // Re-check member count inside transaction (prevents race condition)
      const members = await tx.query.coalitionMembers.findMany({
        where: and(
          eq(coalitionMembers.coalitionId, coalitionId),
          eq(coalitionMembers.isActive, true)
        ),
      });

      if (members.length >= COALITION_MAX_MEMBERS) {
        throw new Error(`Coalition is full (max ${COALITION_MAX_MEMBERS} members)`);
      }

      // Add member within transaction
      await tx.insert(coalitionMembers).values({
        coalitionId,
        empireId,
        gameId: coalition.gameId,
        joinedAtTurn: currentTurn,
        isActive: true,
      });

      // Update coalition status if reached minimum members
      const newMemberCount = members.length + 1;
      if (newMemberCount >= COALITION_MIN_MEMBERS && coalition.status === "forming") {
        await tx
          .update(coalitions)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(coalitions.id, coalitionId));
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error joining coalition:", error);
    const message = error instanceof Error ? error.message : "Failed to join coalition";
    return { success: false, error: message };
  }
}

/**
 * Leave a coalition.
 * If the leader leaves, a new leader is automatically assigned.
 * If all members leave, the coalition is dissolved.
 * Uses transaction to ensure consistency.
 */
export async function leaveCoalition(
  coalitionId: string,
  empireId: string,
  currentTurn: number
): Promise<CoalitionMemberResult> {
  // Validate inputs
  if (!isValidUUID(coalitionId) || !isValidUUID(empireId)) {
    return { success: false, error: "Invalid ID format" };
  }

  // Get coalition
  const coalition = await getCoalitionById(coalitionId);
  if (!coalition) {
    return { success: false, error: "Coalition not found" };
  }

  // Check if empire is a member
  const membership = await getCoalitionMember(coalitionId, empireId);
  if (!membership || !membership.isActive) {
    return { success: false, error: "Empire is not a member of this coalition" };
  }

  try {
    // Use transaction for all updates
    await db.transaction(async (tx) => {
      // Deactivate membership
      await tx
        .update(coalitionMembers)
        .set({
          isActive: false,
          leftAtTurn: currentTurn,
        })
        .where(
          and(
            eq(coalitionMembers.coalitionId, coalitionId),
            eq(coalitionMembers.empireId, empireId)
          )
        );

      // Get remaining members within transaction
      const remainingMembers = await tx.query.coalitionMembers.findMany({
        where: and(
          eq(coalitionMembers.coalitionId, coalitionId),
          eq(coalitionMembers.isActive, true)
        ),
        orderBy: (coalitionMembers, { asc }) => [asc(coalitionMembers.joinedAtTurn)],
      });

      // If no members left, dissolve the coalition
      if (remainingMembers.length === 0) {
        await tx
          .update(coalitions)
          .set({
            status: "dissolved",
            dissolvedAtTurn: currentTurn,
            updatedAt: new Date(),
          })
          .where(eq(coalitions.id, coalitionId));
        return;
      }

      // If leader left, assign new leader (first remaining member by join date)
      if (coalition.leaderId === empireId) {
        const newLeader = remainingMembers[0];
        if (newLeader) {
          await tx
            .update(coalitions)
            .set({
              leaderId: newLeader.empireId,
              updatedAt: new Date(),
            })
            .where(eq(coalitions.id, coalitionId));
        }
      }

      // If below minimum members, revert to "forming" status
      if (remainingMembers.length < COALITION_MIN_MEMBERS) {
        await tx
          .update(coalitions)
          .set({ status: "forming", updatedAt: new Date() })
          .where(eq(coalitions.id, coalitionId));
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error leaving coalition:", error);
    return { success: false, error: "Failed to leave coalition" };
  }
}

// =============================================================================
// COALITION QUERIES
// =============================================================================

/**
 * Get all members of a coalition with their empire data.
 */
export async function getCoalitionMembers(
  coalitionId: string
): Promise<Empire[]> {
  if (!isValidUUID(coalitionId)) {
    return [];
  }

  return getCoalitionEmpires(coalitionId);
}

/**
 * Get the total combat power of a coalition (sum of member networtsh).
 */
export async function getCoalitionPower(coalitionId: string): Promise<number> {
  if (!isValidUUID(coalitionId)) {
    return 0;
  }

  const members = await getActiveMembers(coalitionId);
  return members.reduce((sum, m) => sum + m.empire.networth, 0);
}

/**
 * Get the coalition an empire belongs to.
 */
export async function getMyCoalition(
  empireId: string
): Promise<CoalitionWithMembers | undefined> {
  if (!isValidUUID(empireId)) {
    return undefined;
  }

  const coalition = await getEmpireCoalition(empireId);
  if (!coalition) {
    return undefined;
  }

  return getCoalitionWithMembers(coalition.id);
}

// =============================================================================
// VICTORY CONDITIONS
// =============================================================================

/**
 * Check if a coalition has achieved diplomatic victory.
 * Victory: Coalition controls 50% of territory (PRD 8.2).
 */
export async function checkDiplomaticVictory(
  coalitionId: string
): Promise<CoalitionVictoryCheck | null> {
  if (!isValidUUID(coalitionId)) {
    return null;
  }

  const coalition = await getCoalitionWithMembers(coalitionId);
  if (!coalition || coalition.status !== "active") {
    return null;
  }

  // Get total sectors in the game
  const totalSectors = await getTotalPlanetCount(coalition.gameId);
  if (totalSectors === 0) {
    return null;
  }

  // Calculate coalition territory
  const coalitionPlanets = coalition.members.reduce(
    (sum, m) => sum + m.empire.sectorCount,
    0
  );
  const territoryPercent = coalitionPlanets / totalSectors;

  const achieved = territoryPercent >= COALITION_VICTORY_THRESHOLD;

  return {
    achieved,
    coalitionId: coalition.id,
    coalitionName: coalition.name,
    territoryPercent: territoryPercent * 100,
    memberCount: coalition.members.length,
    members: coalition.members.map((m) => ({
      id: m.empire.id,
      name: m.empire.name,
      sectorCount: m.empire.sectorCount,
    })),
  };
}

/**
 * Check all coalitions in a game for diplomatic victory.
 */
export async function checkAllCoalitionsForVictory(
  gameId: string
): Promise<CoalitionVictoryCheck | null> {
  if (!isValidUUID(gameId)) {
    return null;
  }

  // Get all active coalitions
  const { getGameCoalitions } = await import("../repositories/coalition-repository");
  const activeCoalitions = await getGameCoalitions(gameId);

  for (const coalition of activeCoalitions) {
    const victoryCheck = await checkDiplomaticVictory(coalition.id);
    if (victoryCheck?.achieved) {
      return victoryCheck;
    }
  }

  return null;
}

// =============================================================================
// COALITION WARFARE (Turn 75+)
// =============================================================================

/**
 * Propose a coordinated attack for the coalition.
 * All members attack the same target on the same turn with bonus.
 *
 * NOTE: This is a simplified implementation. A full system would
 * require a separate table for coordinated attacks.
 */
export async function proposeCoordinatedAttack(
  coalitionId: string,
  proposerEmpireId: string,
  targetEmpireId: string,
  scheduledTurn: number,
  currentTurn: number
): Promise<{ success: boolean; error?: string }> {
  // Validate inputs
  if (!isValidUUID(coalitionId) || !isValidUUID(proposerEmpireId) || !isValidUUID(targetEmpireId)) {
    return { success: false, error: "Invalid ID format" };
  }

  // Check if coalition warfare is unlocked
  if (!isCoalitionWarfareUnlocked(currentTurn)) {
    return {
      success: false,
      error: `Coalition warfare unlocks at turn ${COALITION_WARFARE_UNLOCK_TURN}. Current turn: ${currentTurn}`,
    };
  }

  // Scheduled turn must be in the future
  if (scheduledTurn <= currentTurn) {
    return { success: false, error: "Scheduled turn must be in the future" };
  }

  // Get coalition
  const coalition = await getCoalitionById(coalitionId);
  if (!coalition) {
    return { success: false, error: "Coalition not found" };
  }

  if (coalition.status !== "active") {
    return { success: false, error: "Coalition is not active" };
  }

  // Check if proposer is a member
  const membership = await getCoalitionMember(coalitionId, proposerEmpireId);
  if (!membership || !membership.isActive) {
    return { success: false, error: "Only coalition members can propose attacks" };
  }

  // Check if target exists and is not in the coalition
  const target = await db.query.empires.findFirst({
    where: eq(empires.id, targetEmpireId),
  });

  if (!target) {
    return { success: false, error: "Target empire not found" };
  }

  if (target.gameId !== coalition.gameId) {
    return { success: false, error: "Target not in same game" };
  }

  if (target.isEliminated) {
    return { success: false, error: "Cannot target eliminated empire" };
  }

  // Cannot attack coalition members
  const targetInCoalition = await isEmpireInCoalition(targetEmpireId);
  if (targetInCoalition) {
    const targetCoalition = await getEmpireCoalition(targetEmpireId);
    if (targetCoalition?.id === coalitionId) {
      return { success: false, error: "Cannot attack coalition members" };
    }
  }

  // In a full implementation, this would create a coordinated attack record
  // For now, we return success and the bonus would be applied during combat

  return { success: true };
}

/**
 * Get the coordinated attack bonus for combat.
 * Returns the bonus multiplier if the attacker is participating
 * in a coordinated attack this turn.
 */
export function getCoordinatedAttackBonus(
  isCoordinatedAttack: boolean
): number {
  return isCoordinatedAttack ? COORDINATED_ATTACK_BONUS : 0;
}

/**
 * Check if two empires are in the same coalition.
 */
export async function areInSameCoalition(
  empireId1: string,
  empireId2: string
): Promise<boolean> {
  if (!isValidUUID(empireId1) || !isValidUUID(empireId2)) {
    return false;
  }

  const coalition1 = await getEmpireCoalition(empireId1);
  const coalition2 = await getEmpireCoalition(empireId2);

  if (!coalition1 || !coalition2) {
    return false;
  }

  return coalition1.id === coalition2.id;
}
