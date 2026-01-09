"use server";

/**
 * Diplomacy Server Actions (M7)
 *
 * Server actions for treaty management.
 * All inputs are validated with Zod schemas per reviewer checklist.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { games, empires } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import {
  type TreatyType,
  getActiveTreaties,
  getActiveTreatyPartners,
  getPendingProposals,
  proposeTreaty,
  acceptTreaty,
  rejectTreaty,
  breakTreaty,
  endTreatyPeacefully,
  getReputationHistory,
  getReputationLevel,
} from "@/lib/diplomacy";
import { isFeatureUnlocked } from "@/lib/constants/unlocks";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { getRateLimitIdentifier } from "@/lib/session";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const UUIDSchema = z.string().uuid("Invalid UUID format");

const TreatyTypeSchema = z.enum(["nap", "alliance"], {
  error: "Invalid treaty type",
});

const DiplomacyStatusSchema = z.object({
  gameId: UUIDSchema,
  empireId: UUIDSchema,
});

const ProposeTreatySchema = z.object({
  gameId: UUIDSchema,
  proposerId: UUIDSchema,
  recipientId: UUIDSchema,
  treatyType: TreatyTypeSchema,
});

const TreatyActionSchema = z.object({
  gameId: UUIDSchema,
  treatyId: UUIDSchema,
  empireId: UUIDSchema,
});

const RejectTreatySchema = z.object({
  treatyId: UUIDSchema,
  recipientId: UUIDSchema,
});

const ReputationHistorySchema = z.object({
  empireId: UUIDSchema,
});

// =============================================================================
// TYPES
// =============================================================================

interface DiplomacyTarget {
  id: string;
  name: string;
  networth: number;
  reputation: number;
  reputationLevel: string;
  hasTreaty: boolean;
  treatyType?: TreatyType;
}

// =============================================================================
// GET DIPLOMACY STATUS
// =============================================================================

export async function getDiplomacyStatusAction(gameId: string, empireId: string) {
  try {
    // Validate inputs with Zod
    const parsed = DiplomacyStatusSchema.safeParse({ gameId, empireId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, parsed.data.empireId),
    });

    if (!empire) {
      return { success: false as const, error: "Empire not found" };
    }

    const activeTreaties = await getActiveTreaties(parsed.data.empireId);
    const pendingProposals = await getPendingProposals(parsed.data.empireId);

    return {
      success: true as const,
      data: {
        reputation: empire.reputation,
        reputationLevel: getReputationLevel(empire.reputation),
        activeTreaties,
        pendingProposals,
      },
    };
  } catch (error) {
    console.error("Error fetching diplomacy status:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// GET DIPLOMACY TARGETS
// =============================================================================

export async function getDiplomacyTargetsAction(gameId: string, empireId: string) {
  try {
    // Validate inputs with Zod
    const parsed = DiplomacyStatusSchema.safeParse({ gameId, empireId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    // Get all non-eliminated empires except the player
    const allEmpires = await db.query.empires.findMany({
      where: and(
        eq(empires.gameId, parsed.data.gameId),
        ne(empires.id, parsed.data.empireId),
        eq(empires.isEliminated, false)
      ),
    });

    // Batch load all active treaty partners ONCE (fixes N+1 query)
    const treatyPartners = await getActiveTreatyPartners(parsed.data.empireId);

    // Build targets without N+1 queries - use Map lookup instead
    const targets: DiplomacyTarget[] = allEmpires.map((e) => {
      const treatyType = treatyPartners.get(e.id);
      const hasTreatyFlag = treatyType !== undefined;

      return {
        id: e.id,
        name: e.name,
        networth: e.networth,
        reputation: e.reputation,
        reputationLevel: getReputationLevel(e.reputation),
        hasTreaty: hasTreatyFlag,
        treatyType: hasTreatyFlag ? treatyType : undefined,
      };
    });

    return { success: true as const, data: targets };
  } catch (error) {
    console.error("Error fetching diplomacy targets:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// PROPOSE TREATY
// =============================================================================

export async function proposeTreatyAction(
  gameId: string,
  proposerId: string,
  recipientId: string,
  treatyType: string
) {
  try {
    // Rate limiting
    const rateLimitId = await getRateLimitIdentifier();
    const rateLimit = checkRateLimit(rateLimitId, "DIPLOMACY_ACTION");
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return { success: false as const, error: `Rate limited. Please wait ${waitSeconds} seconds.` };
    }

    // Validate inputs with Zod
    const parsed = ProposeTreatySchema.safeParse({ gameId, proposerId, recipientId, treatyType });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    // Check if diplomacy is unlocked (Turn 10)
    if (!isFeatureUnlocked("diplomacy_basics", game.currentTurn)) {
      return { success: false as const, error: "Diplomacy not yet available" };
    }

    const result = await proposeTreaty(
      parsed.data.proposerId,
      parsed.data.recipientId,
      parsed.data.treatyType as TreatyType,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: { treatyId: result.treaty?.id },
    };
  } catch (error) {
    console.error("Error proposing treaty:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// ACCEPT TREATY
// =============================================================================

export async function acceptTreatyAction(
  gameId: string,
  treatyId: string,
  recipientId: string
) {
  try {
    // Rate limiting
    const rateLimitId = await getRateLimitIdentifier();
    const rateLimit = checkRateLimit(rateLimitId, "DIPLOMACY_ACTION");
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return { success: false as const, error: `Rate limited. Please wait ${waitSeconds} seconds.` };
    }

    // Validate inputs with Zod
    const parsed = TreatyActionSchema.safeParse({ gameId, treatyId, empireId: recipientId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    const result = await acceptTreaty(parsed.data.treatyId, parsed.data.empireId, game.currentTurn);

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: {
        treaty: result.treaty,
        reputationChange: result.reputationChange,
      },
    };
  } catch (error) {
    console.error("Error accepting treaty:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// REJECT TREATY
// =============================================================================

export async function rejectTreatyAction(treatyId: string, recipientId: string) {
  try {
    // Rate limiting
    const rateLimitId = await getRateLimitIdentifier();
    const rateLimit = checkRateLimit(rateLimitId, "DIPLOMACY_ACTION");
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return { success: false as const, error: `Rate limited. Please wait ${waitSeconds} seconds.` };
    }

    // Validate inputs with Zod
    const parsed = RejectTreatySchema.safeParse({ treatyId, recipientId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const result = await rejectTreaty(parsed.data.treatyId, parsed.data.recipientId);

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return { success: true as const };
  } catch (error) {
    console.error("Error rejecting treaty:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// BREAK TREATY
// =============================================================================

export async function breakTreatyAction(
  gameId: string,
  treatyId: string,
  breakerId: string
) {
  try {
    // Rate limiting
    const rateLimitId = await getRateLimitIdentifier();
    const rateLimit = checkRateLimit(rateLimitId, "DIPLOMACY_ACTION");
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return { success: false as const, error: `Rate limited. Please wait ${waitSeconds} seconds.` };
    }

    // Validate inputs with Zod
    const parsed = TreatyActionSchema.safeParse({ gameId, treatyId, empireId: breakerId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    const result = await breakTreaty(parsed.data.treatyId, parsed.data.empireId, game.currentTurn);

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: {
        treaty: result.treaty,
        reputationChange: result.reputationChange,
      },
    };
  } catch (error) {
    console.error("Error breaking treaty:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// END TREATY PEACEFULLY
// =============================================================================

export async function endTreatyAction(
  gameId: string,
  treatyId: string,
  requesterId: string
) {
  try {
    // Rate limiting
    const rateLimitId = await getRateLimitIdentifier();
    const rateLimit = checkRateLimit(rateLimitId, "DIPLOMACY_ACTION");
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return { success: false as const, error: `Rate limited. Please wait ${waitSeconds} seconds.` };
    }

    // Validate inputs with Zod
    const parsed = TreatyActionSchema.safeParse({ gameId, treatyId, empireId: requesterId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    const result = await endTreatyPeacefully(parsed.data.treatyId, parsed.data.empireId, game.currentTurn);

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return { success: true as const };
  } catch (error) {
    console.error("Error ending treaty:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// REPUTATION HISTORY
// =============================================================================

export async function getReputationHistoryAction(empireId: string) {
  try {
    // Validate inputs with Zod
    const parsed = ReputationHistorySchema.safeParse({ empireId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const history = await getReputationHistory(parsed.data.empireId);
    return { success: true as const, data: history };
  } catch (error) {
    console.error("Error fetching reputation history:", error);
    return { success: false as const, error: "An error occurred" };
  }
}
