/**
 * Treaty Service (M7)
 *
 * Handles treaty proposals, acceptance, rejection, and breaking.
 * Implements NAP and Alliance treaty systems.
 *
 * @see docs/PRD.md Section 8 - Diplomacy System
 * @see docs/milestones.md M7 - Market & Diplomacy
 */

import { db } from "@/lib/db";
import {
  empires,
  treaties,
  reputationLog,
  type Treaty,
  type ReputationLog,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import {
  type TreatyType,
  REPUTATION_CHANGES,
  MIN_REPUTATION,
  MAX_REPUTATION,
  MIN_TREATY_DURATION,
  calculateAcceptanceChance,
} from "./constants";

// =============================================================================
// TYPES
// =============================================================================

export interface TreatyInfo {
  id: string;
  type: TreatyType;
  status: "proposed" | "active" | "rejected" | "cancelled" | "broken";
  partnerId: string;
  partnerName: string;
  partnerNetworth: number;
  proposedAtTurn: number;
  activatedAtTurn: number | null;
  /** Whether this empire proposed the treaty */
  isProposer: boolean;
}

export interface TreatyProposal {
  treatyId: string;
  type: TreatyType;
  proposerId: string;
  proposerName: string;
  proposerNetworth: number;
  proposedAtTurn: number;
}

export interface TreatyResult {
  success: boolean;
  error?: string;
  treaty?: Treaty;
  reputationChange?: number;
}

// =============================================================================
// GET TREATIES
// =============================================================================

/**
 * Get all active treaties for an empire.
 *
 * @param empireId - Empire UUID
 * @returns Array of treaty info
 */
export async function getActiveTreaties(empireId: string): Promise<TreatyInfo[]> {
  const allTreaties = await db.query.treaties.findMany({
    where: and(
      eq(treaties.status, "active"),
      or(
        eq(treaties.proposerId, empireId),
        eq(treaties.recipientId, empireId)
      )
    ),
    with: {
      proposer: true,
      recipient: true,
    },
  });

  return allTreaties.map((t) => {
    const isProposer = t.proposerId === empireId;
    const partner = isProposer ? t.recipient : t.proposer;

    return {
      id: t.id,
      type: t.treatyType as TreatyType,
      status: t.status as TreatyInfo["status"],
      partnerId: partner.id,
      partnerName: partner.name,
      partnerNetworth: partner.networth,
      proposedAtTurn: t.proposedAtTurn,
      activatedAtTurn: t.activatedAtTurn,
      isProposer,
    };
  });
}

/**
 * Get all active treaty partner IDs for an empire in a single query.
 * Returns a Map of partnerId -> TreatyType for quick lookup.
 *
 * This is an optimized batch function to avoid N+1 queries when
 * checking treaty status for multiple empires.
 *
 * @param empireId - Empire UUID
 * @returns Map of partnerId to TreatyType
 */
export async function getActiveTreatyPartners(
  empireId: string
): Promise<Map<string, TreatyType>> {
  const allTreaties = await db.query.treaties.findMany({
    where: and(
      eq(treaties.status, "active"),
      or(
        eq(treaties.proposerId, empireId),
        eq(treaties.recipientId, empireId)
      )
    ),
  });

  const partnerMap = new Map<string, TreatyType>();
  for (const t of allTreaties) {
    const partnerId = t.proposerId === empireId ? t.recipientId : t.proposerId;
    partnerMap.set(partnerId, t.treatyType as TreatyType);
  }

  return partnerMap;
}

/**
 * Get pending treaty proposals for an empire.
 *
 * @param empireId - Empire UUID (recipient)
 * @returns Array of pending proposals
 */
export async function getPendingProposals(empireId: string): Promise<TreatyProposal[]> {
  const pendingTreaties = await db.query.treaties.findMany({
    where: and(
      eq(treaties.status, "proposed"),
      eq(treaties.recipientId, empireId)
    ),
    with: {
      proposer: true,
    },
  });

  return pendingTreaties.map((t) => ({
    treatyId: t.id,
    type: t.treatyType as TreatyType,
    proposerId: t.proposerId,
    proposerName: t.proposer.name,
    proposerNetworth: t.proposer.networth,
    proposedAtTurn: t.proposedAtTurn,
  }));
}

/**
 * Check if two empires have an active treaty.
 *
 * @param empireId1 - First empire UUID
 * @param empireId2 - Second empire UUID
 * @param treatyType - Optional: specific treaty type to check
 * @returns Active treaty if exists, null otherwise
 */
export async function getActiveTreatyBetween(
  empireId1: string,
  empireId2: string,
  treatyType?: TreatyType
): Promise<Treaty | null> {
  const conditions = [
    eq(treaties.status, "active"),
    or(
      and(eq(treaties.proposerId, empireId1), eq(treaties.recipientId, empireId2)),
      and(eq(treaties.proposerId, empireId2), eq(treaties.recipientId, empireId1))
    ),
  ];

  if (treatyType) {
    conditions.push(eq(treaties.treatyType, treatyType));
  }

  const treaty = await db.query.treaties.findFirst({
    where: and(...conditions),
  });

  return treaty || null;
}

/**
 * Check if two empires have any active treaty (NAP or Alliance).
 *
 * @param empireId1 - First empire UUID
 * @param empireId2 - Second empire UUID
 * @returns True if they have an active treaty
 */
export async function hasActiveTreaty(
  empireId1: string,
  empireId2: string
): Promise<boolean> {
  const treaty = await getActiveTreatyBetween(empireId1, empireId2);
  return treaty !== null;
}

// =============================================================================
// PROPOSE TREATY
// =============================================================================

/**
 * Propose a treaty to another empire.
 *
 * @param proposerId - Proposer's empire UUID
 * @param recipientId - Recipient's empire UUID
 * @param treatyType - Type of treaty to propose
 * @param turn - Current game turn
 * @returns Treaty result
 */
export async function proposeTreaty(
  proposerId: string,
  recipientId: string,
  treatyType: TreatyType,
  turn: number
): Promise<TreatyResult> {
  // Validate empires exist
  const proposer = await db.query.empires.findFirst({
    where: eq(empires.id, proposerId),
  });
  const recipient = await db.query.empires.findFirst({
    where: eq(empires.id, recipientId),
  });

  if (!proposer || !recipient) {
    return { success: false, error: "Empire not found" };
  }

  // Check for existing treaty
  const existingTreaty = await getActiveTreatyBetween(proposerId, recipientId);
  if (existingTreaty) {
    // Check if trying to upgrade NAP to Alliance
    if (existingTreaty.treatyType === "nap" && treatyType === "alliance") {
      // Allow upgrade - handled as new proposal
    } else {
      return { success: false, error: "A treaty already exists between these empires" };
    }
  }

  // Check for pending proposal
  const pendingProposal = await db.query.treaties.findFirst({
    where: and(
      eq(treaties.status, "proposed"),
      or(
        and(eq(treaties.proposerId, proposerId), eq(treaties.recipientId, recipientId)),
        and(eq(treaties.proposerId, recipientId), eq(treaties.recipientId, proposerId))
      ),
      eq(treaties.treatyType, treatyType)
    ),
  });

  if (pendingProposal) {
    return { success: false, error: "A proposal for this treaty type is already pending" };
  }

  // Create treaty proposal
  const [treaty] = await db
    .insert(treaties)
    .values({
      gameId: proposer.gameId,
      proposerId,
      recipientId,
      treatyType,
      status: "proposed",
      proposedAtTurn: turn,
    })
    .returning();

  return { success: true, treaty };
}

// =============================================================================
// ACCEPT/REJECT TREATY
// =============================================================================

/**
 * Accept a treaty proposal.
 *
 * @param treatyId - Treaty UUID
 * @param recipientId - Recipient's empire UUID (for validation)
 * @param turn - Current game turn
 * @returns Treaty result
 */
export async function acceptTreaty(
  treatyId: string,
  recipientId: string,
  turn: number
): Promise<TreatyResult> {
  const treaty = await db.query.treaties.findFirst({
    where: and(eq(treaties.id, treatyId), eq(treaties.recipientId, recipientId)),
    with: { proposer: true, recipient: true },
  });

  if (!treaty) {
    return { success: false, error: "Treaty not found" };
  }

  if (treaty.status !== "proposed") {
    return { success: false, error: "Treaty is no longer pending" };
  }

  // If upgrading from NAP to Alliance, cancel the old NAP
  if (treaty.treatyType === "alliance") {
    const existingNap = await getActiveTreatyBetween(
      treaty.proposerId,
      treaty.recipientId,
      "nap"
    );
    if (existingNap) {
      await db
        .update(treaties)
        .set({ status: "cancelled", endedAtTurn: turn, updatedAt: new Date() })
        .where(eq(treaties.id, existingNap.id));
    }
  }

  // Activate the treaty
  const [updatedTreaty] = await db
    .update(treaties)
    .set({ status: "active", activatedAtTurn: turn, updatedAt: new Date() })
    .where(eq(treaties.id, treatyId))
    .returning();

  // Log reputation event for both parties
  const eventType = treaty.treatyType === "nap" ? "nap_formed" : "alliance_formed";
  const repChange = treaty.treatyType === "nap"
    ? REPUTATION_CHANGES.napFormed
    : REPUTATION_CHANGES.allianceFormed;

  // Update proposer reputation
  await updateReputation(
    treaty.proposerId,
    treaty.recipientId,
    eventType,
    repChange,
    treaty.gameId,
    treatyId,
    turn
  );

  // Update recipient reputation
  await updateReputation(
    treaty.recipientId,
    treaty.proposerId,
    eventType,
    repChange,
    treaty.gameId,
    treatyId,
    turn
  );

  return { success: true, treaty: updatedTreaty, reputationChange: repChange };
}

/**
 * Reject a treaty proposal.
 *
 * @param treatyId - Treaty UUID
 * @param recipientId - Recipient's empire UUID (for validation)
 * @returns Treaty result
 */
export async function rejectTreaty(
  treatyId: string,
  recipientId: string
): Promise<TreatyResult> {
  const treaty = await db.query.treaties.findFirst({
    where: and(eq(treaties.id, treatyId), eq(treaties.recipientId, recipientId)),
  });

  if (!treaty) {
    return { success: false, error: "Treaty not found" };
  }

  if (treaty.status !== "proposed") {
    return { success: false, error: "Treaty is no longer pending" };
  }

  const [updatedTreaty] = await db
    .update(treaties)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(treaties.id, treatyId))
    .returning();

  return { success: true, treaty: updatedTreaty };
}

// =============================================================================
// BREAK/END TREATY
// =============================================================================

/**
 * Break a treaty (with reputation penalty).
 *
 * @param treatyId - Treaty UUID
 * @param breakerId - Empire breaking the treaty
 * @param turn - Current game turn
 * @returns Treaty result with reputation change
 */
export async function breakTreaty(
  treatyId: string,
  breakerId: string,
  turn: number
): Promise<TreatyResult> {
  const treaty = await db.query.treaties.findFirst({
    where: eq(treaties.id, treatyId),
    with: { proposer: true, recipient: true },
  });

  if (!treaty) {
    return { success: false, error: "Treaty not found" };
  }

  if (treaty.status !== "active") {
    return { success: false, error: "Treaty is not active" };
  }

  // Verify breaker is a party to the treaty
  if (treaty.proposerId !== breakerId && treaty.recipientId !== breakerId) {
    return { success: false, error: "You are not a party to this treaty" };
  }

  const victimId = treaty.proposerId === breakerId ? treaty.recipientId : treaty.proposerId;

  // Mark treaty as broken
  const [updatedTreaty] = await db
    .update(treaties)
    .set({
      status: "broken",
      endedAtTurn: turn,
      brokenById: breakerId,
      updatedAt: new Date(),
    })
    .where(eq(treaties.id, treatyId))
    .returning();

  // Apply reputation penalty
  const repChange = treaty.treatyType === "nap"
    ? REPUTATION_CHANGES.napBroken
    : REPUTATION_CHANGES.allianceBroken;

  await updateReputation(
    breakerId,
    victimId,
    "treaty_broken",
    repChange,
    treaty.gameId,
    treatyId,
    turn
  );

  return { success: true, treaty: updatedTreaty, reputationChange: repChange };
}

/**
 * Peacefully end a treaty (after minimum duration).
 *
 * @param treatyId - Treaty UUID
 * @param requesterId - Empire requesting to end
 * @param turn - Current game turn
 * @returns Treaty result
 */
export async function endTreatyPeacefully(
  treatyId: string,
  requesterId: string,
  turn: number
): Promise<TreatyResult> {
  const treaty = await db.query.treaties.findFirst({
    where: eq(treaties.id, treatyId),
  });

  if (!treaty) {
    return { success: false, error: "Treaty not found" };
  }

  if (treaty.status !== "active") {
    return { success: false, error: "Treaty is not active" };
  }

  // Verify requester is a party to the treaty
  if (treaty.proposerId !== requesterId && treaty.recipientId !== requesterId) {
    return { success: false, error: "You are not a party to this treaty" };
  }

  // Check minimum duration
  if (!treaty.activatedAtTurn) {
    return { success: false, error: "Treaty activation turn not recorded" };
  }

  const duration = turn - treaty.activatedAtTurn;
  if (duration < MIN_TREATY_DURATION) {
    return {
      success: false,
      error: `Treaty must be active for at least ${MIN_TREATY_DURATION} turns. Current: ${duration}`,
    };
  }

  // End treaty peacefully
  const [updatedTreaty] = await db
    .update(treaties)
    .set({ status: "cancelled", endedAtTurn: turn, updatedAt: new Date() })
    .where(eq(treaties.id, treatyId))
    .returning();

  // Small reputation impact for alliance
  if (treaty.treatyType === "alliance") {
    const repChange = REPUTATION_CHANGES.allianceEndedPeacefully;
    const otherId = treaty.proposerId === requesterId ? treaty.recipientId : treaty.proposerId;

    await updateReputation(
      requesterId,
      otherId,
      "alliance_ended",
      repChange,
      treaty.gameId,
      treatyId,
      turn
    );
  }

  return { success: true, treaty: updatedTreaty };
}

// =============================================================================
// BOT TREATY DECISIONS
// =============================================================================

/**
 * Bot decides whether to accept a treaty proposal.
 *
 * @param treatyId - Treaty UUID
 * @returns True if bot accepts
 */
export async function botDecideTreaty(treatyId: string): Promise<boolean> {
  const treaty = await db.query.treaties.findFirst({
    where: eq(treaties.id, treatyId),
    with: { proposer: true, recipient: true },
  });

  if (!treaty) return false;

  // Calculate acceptance chance
  const chance = calculateAcceptanceChance(
    treaty.treatyType as TreatyType,
    treaty.proposer.reputation
  );

  // Random decision based on chance
  return Math.random() < chance;
}

// =============================================================================
// REPUTATION HELPERS
// =============================================================================

/**
 * Update an empire's reputation and log the event.
 */
async function updateReputation(
  empireId: string,
  affectedEmpireId: string,
  eventType: "treaty_broken" | "treaty_honored" | "alliance_formed" | "alliance_ended" | "nap_formed" | "nap_ended",
  change: number,
  gameId: string,
  treatyId: string,
  turn: number
): Promise<void> {
  // Get current reputation
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) return;

  // Calculate new reputation
  const newReputation = Math.max(
    MIN_REPUTATION,
    Math.min(MAX_REPUTATION, empire.reputation + change)
  );

  // Update empire reputation
  await db
    .update(empires)
    .set({ reputation: newReputation, updatedAt: new Date() })
    .where(eq(empires.id, empireId));

  // Log the event
  await db.insert(reputationLog).values({
    gameId,
    empireId,
    affectedEmpireId,
    treatyId,
    eventType,
    reputationChange: change,
    description: `${eventType.replace(/_/g, " ")}: reputation ${change >= 0 ? "+" : ""}${change}`,
    turn,
  });
}

/**
 * Get reputation history for an empire.
 *
 * @param empireId - Empire UUID
 * @param limit - Maximum records to return
 * @returns Array of reputation events
 */
export async function getReputationHistory(
  empireId: string,
  limit: number = 20
): Promise<ReputationLog[]> {
  return db.query.reputationLog.findMany({
    where: eq(reputationLog.empireId, empireId),
    orderBy: (log, { desc }) => [desc(log.createdAt)],
    limit,
  });
}
