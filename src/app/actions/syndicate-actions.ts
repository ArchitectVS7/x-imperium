"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  syndicateTrust,
  syndicateContracts,
  empires,
  resourceInventory,
  games,
} from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import {
  getSyndicateTrustStatus,
  awardContractTrust,
  penalizeContractFailure,
  generateContractOffers,
  validateContractAcceptance,
  getBlackMarketCatalog,
  calculateBlackMarketPurchase,
  checkRecruitmentEligibility,
  getRecruitmentBonuses,
  calculateCoordinatorReport,
  type SyndicateTrustStatus,
  type ContractOffer,
} from "@/lib/game/services/syndicate-service";
import {
  TRUST_LEVELS,
  CONTRACT_CONFIGS,
  type SyndicateTrustLevel,
  type ContractType,
} from "@/lib/game/constants/syndicate";
import { RESOURCE_TIERS, type CraftedResource } from "@/lib/game/constants/crafting";

// =============================================================================
// COOKIE HELPERS
// =============================================================================

const GAME_ID_COOKIE = "gameId";
const EMPIRE_ID_COOKIE = "empireId";

async function getGameCookies(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    gameId: cookieStore.get(GAME_ID_COOKIE)?.value,
    empireId: cookieStore.get(EMPIRE_ID_COOKIE)?.value,
  };
}

// =============================================================================
// TRUST STATUS ACTIONS
// =============================================================================

export interface TrustStatusDisplay extends SyndicateTrustStatus {
  hasAccess: boolean;
  statusMessage: string;
}

/**
 * Get the player's Syndicate trust status.
 */
export async function getSyndicateTrustAction(): Promise<TrustStatusDisplay | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    // Get or create trust record
    let trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    // Create trust record if it doesn't exist
    if (!trust) {
      const [newTrust] = await db
        .insert(syndicateTrust)
        .values({
          empireId,
          gameId,
          trustPoints: 0,
          trustLevel: "unknown",
          contractsCompleted: 0,
          contractsFailed: 0,
          totalCreditsEarned: 0,
          isHostile: false,
          hasReceivedInvitation: false,
        })
        .returning();
      trust = newTrust!;
    }

    const status = getSyndicateTrustStatus(
      trust.trustPoints,
      trust.contractsCompleted,
      trust.contractsFailed,
      trust.isHostile,
      trust.hasReceivedInvitation
    );

    // Determine access status
    const hasAccess = trust.trustLevel !== "unknown" && !trust.isHostile;
    let statusMessage: string;

    if (trust.isHostile) {
      statusMessage = "The Syndicate has marked you as hostile. Assassins may target your assets.";
    } else if (trust.trustLevel === "unknown") {
      statusMessage = trust.hasReceivedInvitation
        ? "You have been contacted by the Syndicate. Complete your first contract to gain access."
        : "You have not been contacted by the Syndicate yet.";
    } else {
      const levelConfig = TRUST_LEVELS[trust.trustLevel];
      statusMessage = `Welcome, ${levelConfig.title.charAt(0).toUpperCase() + levelConfig.title.slice(1)}. ${levelConfig.unlocks.length} services available.`;
    }

    return {
      ...status,
      hasAccess,
      statusMessage,
    };
  } catch (error) {
    console.error("Failed to get syndicate trust:", error);
    return null;
  }
}

// =============================================================================
// CONTRACT ACTIONS
// =============================================================================

export interface ContractDisplay extends ContractOffer {
  id: string;
  status: "available" | "accepted" | "in_progress" | "completed" | "failed" | "expired";
  acceptedAtTurn?: number;
  deadlineTurn?: number;
}

/**
 * Get available contracts for the player.
 */
export async function getAvailableContractsAction(): Promise<ContractDisplay[] | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    // Get trust level
    const trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    if (!trust || trust.trustLevel === "unknown" || trust.isHostile) {
      return [];
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    const currentTurn = game?.currentTurn ?? 1;

    // Get active contracts
    const activeContracts = await db.query.syndicateContracts.findMany({
      where: and(
        eq(syndicateContracts.empireId, empireId),
        eq(syndicateContracts.gameId, gameId),
        eq(syndicateContracts.status, "in_progress")
      ),
    });

    const activeTypes = activeContracts.map((c) => c.contractType) as ContractType[];

    // Get potential targets (other empires)
    const otherEmpires = await db.query.empires.findMany({
      where: and(
        eq(empires.gameId, gameId),
      ),
    });

    const potentialTargets = otherEmpires
      .filter((e) => e.id !== empireId && !e.isEliminated)
      .map((e) => ({
        id: e.id,
        name: e.name,
        networth: e.networth,
        rank: 0, // Will be calculated
      }))
      .sort((a, b) => b.networth - a.networth)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    // Generate contract offers
    const offers = generateContractOffers(
      trust.trustLevel,
      currentTurn,
      activeTypes,
      potentialTargets
    );

    // Convert to display format
    return offers.map((offer) => ({
      ...offer,
      id: `offer-${offer.type}`,
      status: "available" as const,
    }));
  } catch (error) {
    console.error("Failed to get available contracts:", error);
    return null;
  }
}

/**
 * Get the player's active contracts.
 */
export async function getActiveContractsAction(): Promise<ContractDisplay[] | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    const contracts = await db.query.syndicateContracts.findMany({
      where: and(
        eq(syndicateContracts.empireId, empireId),
        eq(syndicateContracts.gameId, gameId),
        or(
          eq(syndicateContracts.status, "in_progress"),
          eq(syndicateContracts.status, "completed"),
          eq(syndicateContracts.status, "failed")
        )
      ),
      orderBy: [desc(syndicateContracts.createdAtTurn)],
    });

    // Get target empire names
    const targetIds = contracts
      .filter((c) => c.targetEmpireId)
      .map((c) => c.targetEmpireId as string);

    const targets = targetIds.length > 0
      ? await db.query.empires.findMany({
          where: and(eq(empires.gameId, gameId)),
        })
      : [];

    const targetMap = new Map(targets.map((t) => [t.id, t.name]));

    return contracts.map((contract) => {
      const config = CONTRACT_CONFIGS[contract.contractType];
      return {
        id: contract.id,
        type: contract.contractType,
        config,
        creditReward: contract.creditReward,
        trustReward: contract.trustReward,
        deadline: contract.deadlineTurn ?? 0,
        targetEmpireId: contract.targetEmpireId ?? undefined,
        targetEmpireName: contract.targetEmpireId
          ? targetMap.get(contract.targetEmpireId)
          : undefined,
        isAvailable: true,
        status: contract.status as ContractDisplay["status"],
        acceptedAtTurn: contract.acceptedAtTurn ?? undefined,
        deadlineTurn: contract.deadlineTurn ?? undefined,
      };
    });
  } catch (error) {
    console.error("Failed to get active contracts:", error);
    return null;
  }
}

/**
 * Accept a contract.
 */
export async function acceptContractAction(
  contractType: ContractType,
  targetEmpireId?: string
): Promise<{ success: boolean; error?: string; contractId?: string }> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    // Get trust level
    const trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    if (!trust) {
      return { success: false, error: "Not connected to the Syndicate" };
    }

    if (trust.isHostile) {
      return { success: false, error: "The Syndicate refuses to deal with you" };
    }

    // Get active contract count
    const activeContracts = await db.query.syndicateContracts.findMany({
      where: and(
        eq(syndicateContracts.empireId, empireId),
        eq(syndicateContracts.gameId, gameId),
        eq(syndicateContracts.status, "in_progress")
      ),
    });

    // Validate acceptance
    const validation = validateContractAcceptance(
      trust.trustLevel,
      contractType,
      activeContracts.length,
      3 // Max active contracts
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    const currentTurn = game?.currentTurn ?? 1;

    // Get contract config
    const config = CONTRACT_CONFIGS[contractType];

    // Calculate reward (handle "varies" and "special" cases)
    let creditReward: number;
    if (typeof config.creditReward === "number") {
      creditReward = config.creditReward;
    } else if (config.creditReward === "varies") {
      // Base reward with some variance
      creditReward = 10000 + Math.floor(Math.random() * 20000);
    } else {
      // "special" - reward determined at completion
      creditReward = 0;
    }

    // Create the contract
    const [contract] = await db
      .insert(syndicateContracts)
      .values({
        gameId,
        empireId,
        targetEmpireId: targetEmpireId ?? null,
        contractType,
        status: "in_progress",
        minTrustLevel: config.minTrustLevel,
        creditReward,
        trustReward: config.trustReward,
        createdAtTurn: currentTurn,
        acceptedAtTurn: currentTurn,
        deadlineTurn: currentTurn + config.turnsToComplete,
        completionCriteria: {
          type: contractType,
          targetId: targetEmpireId,
          criteria: config.completionCriteria,
        },
        completionProgress: {},
      })
      .returning();

    // Update last interaction
    await db
      .update(syndicateTrust)
      .set({
        lastInteractionTurn: currentTurn,
        updatedAt: new Date(),
      })
      .where(eq(syndicateTrust.id, trust.id));

    return { success: true, contractId: contract?.id };
  } catch (error) {
    console.error("Failed to accept contract:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept contract",
    };
  }
}

// =============================================================================
// BLACK MARKET ACTIONS
// =============================================================================

export interface BlackMarketItemDisplay {
  itemId: string;
  name: string;
  description: string;
  type: "component" | "system" | "weapon" | "intel";
  resourceType?: string;
  basePrice: number;
  price: number | null;
  isUnlocked: boolean;
  singleUse?: boolean;
  coordinatorResponse?: string;
}

/**
 * Get the Black Market catalog with prices.
 */
export async function getBlackMarketCatalogAction(): Promise<BlackMarketItemDisplay[] | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    // Get trust level
    const trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    if (!trust || trust.trustLevel === "unknown" || trust.isHostile) {
      return [];
    }

    const catalog = getBlackMarketCatalog(trust.trustLevel);

    return catalog.map(({ itemId, item, price, isUnlocked }) => ({
      itemId,
      name: formatItemName(itemId),
      description: item.description,
      type: item.type,
      resourceType: item.resourceType,
      basePrice: item.basePrice,
      price,
      isUnlocked,
      singleUse: item.singleUse,
      coordinatorResponse: item.coordinatorResponse,
    }));
  } catch (error) {
    console.error("Failed to get black market catalog:", error);
    return null;
  }
}

function formatItemName(itemId: string): string {
  return itemId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Purchase an item from the Black Market.
 */
export async function purchaseBlackMarketItemAction(
  itemId: string,
  quantity: number
): Promise<{
  success: boolean;
  error?: string;
  creditsSpent?: number;
  resourceGained?: { type: string; quantity: number };
}> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    // Validate quantity
    if (quantity <= 0) {
      return { success: false, error: "Quantity must be positive" };
    }

    const MAX_PURCHASE_QUANTITY = 100;
    if (quantity > MAX_PURCHASE_QUANTITY) {
      return { success: false, error: `Maximum quantity is ${MAX_PURCHASE_QUANTITY}` };
    }

    // Get trust level
    const trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    if (!trust || trust.trustLevel === "unknown") {
      return { success: false, error: "Not connected to the Syndicate" };
    }

    if (trust.isHostile) {
      return { success: false, error: "The Syndicate refuses to deal with you" };
    }

    // Get empire credits
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false, error: "Empire not found" };
    }

    // Calculate purchase
    const result = calculateBlackMarketPurchase(
      itemId,
      quantity,
      trust.trustLevel,
      empire.credits
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Deduct credits
    await db
      .update(empires)
      .set({
        credits: empire.credits - result.creditsSpent!,
        updatedAt: new Date(),
      })
      .where(eq(empires.id, empireId));

    // Add resource to inventory if applicable
    if (result.resourceType && result.resourceType in RESOURCE_TIERS) {
      const existing = await db.query.resourceInventory.findFirst({
        where: and(
          eq(resourceInventory.empireId, empireId),
          eq(resourceInventory.gameId, gameId),
          eq(resourceInventory.resourceType, result.resourceType as CraftedResource)
        ),
      });

      if (existing) {
        await db
          .update(resourceInventory)
          .set({
            quantity: existing.quantity + result.quantity!,
            updatedAt: new Date(),
          })
          .where(eq(resourceInventory.id, existing.id));
      } else {
        const numericTier = RESOURCE_TIERS[result.resourceType as CraftedResource];
        const tierString = `tier${numericTier}` as "tier1" | "tier2" | "tier3";
        await db.insert(resourceInventory).values({
          empireId,
          gameId,
          resourceType: result.resourceType as CraftedResource,
          tier: tierString,
          quantity: result.quantity!,
        });
      }
    }

    // Update interaction turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    await db
      .update(syndicateTrust)
      .set({
        lastInteractionTurn: game?.currentTurn ?? 1,
        updatedAt: new Date(),
      })
      .where(eq(syndicateTrust.id, trust.id));

    return {
      success: true,
      creditsSpent: result.creditsSpent,
      resourceGained: result.resourceType
        ? { type: result.resourceType, quantity: result.quantity! }
        : undefined,
    };
  } catch (error) {
    console.error("Failed to purchase black market item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to purchase item",
    };
  }
}

// =============================================================================
// RECRUITMENT ACTIONS
// =============================================================================

/**
 * Check if the player is eligible for Syndicate recruitment.
 */
export async function checkRecruitmentAction(): Promise<{
  eligible: boolean;
  reason?: string;
  bonuses?: { startupFunds: number; trustBonusPercent: number };
} | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    // Get trust status
    const trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    if (trust?.hasReceivedInvitation) {
      return { eligible: false, reason: "Already received invitation" };
    }

    // Get all empire networths
    const allEmpires = await db.query.empires.findMany({
      where: and(eq(empires.gameId, gameId)),
    });

    const empire = allEmpires.find((e) => e.id === empireId);
    if (!empire) {
      return { eligible: false, reason: "Empire not found" };
    }

    const allNetworths = allEmpires
      .filter((e) => !e.isEliminated)
      .map((e) => e.networth)
      .sort((a, b) => b - a);

    const result = checkRecruitmentEligibility(
      empire.networth,
      allNetworths,
      trust?.hasReceivedInvitation ?? false
    );

    if (result.eligible) {
      return {
        eligible: true,
        bonuses: getRecruitmentBonuses(),
      };
    }

    return { eligible: false, reason: result.reason };
  } catch (error) {
    console.error("Failed to check recruitment:", error);
    return null;
  }
}

/**
 * Accept Syndicate invitation.
 */
export async function acceptSyndicateInvitationAction(): Promise<{
  success: boolean;
  error?: string;
  startupFunds?: number;
}> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    // Check eligibility first
    const eligibility = await checkRecruitmentAction();
    if (!eligibility?.eligible) {
      return { success: false, error: eligibility?.reason ?? "Not eligible for invitation" };
    }

    // Get or create trust record
    let trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    const currentTurn = game?.currentTurn ?? 1;

    const bonuses = getRecruitmentBonuses();

    if (trust) {
      await db
        .update(syndicateTrust)
        .set({
          hasReceivedInvitation: true,
          invitationTurn: currentTurn,
          lastInteractionTurn: currentTurn,
          updatedAt: new Date(),
        })
        .where(eq(syndicateTrust.id, trust.id));
    } else {
      await db.insert(syndicateTrust).values({
        empireId,
        gameId,
        trustPoints: 0,
        trustLevel: "unknown",
        hasReceivedInvitation: true,
        invitationTurn: currentTurn,
        lastInteractionTurn: currentTurn,
      });
    }

    // Award startup funds
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (empire) {
      await db
        .update(empires)
        .set({
          credits: empire.credits + bonuses.startupFunds,
          updatedAt: new Date(),
        })
        .where(eq(empires.id, empireId));
    }

    return { success: true, startupFunds: bonuses.startupFunds };
  } catch (error) {
    console.error("Failed to accept syndicate invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invitation",
    };
  }
}

// =============================================================================
// COORDINATOR REPORTING
// =============================================================================

/**
 * Report the Syndicate to the Coordinator (betray them).
 */
export async function reportToCoordinatorAction(): Promise<{
  success: boolean;
  error?: string;
  fundingIncrease?: number;
  warning?: string;
}> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    // Get trust status
    const trust = await db.query.syndicateTrust.findFirst({
      where: and(
        eq(syndicateTrust.empireId, empireId),
        eq(syndicateTrust.gameId, gameId)
      ),
    });

    if (!trust) {
      return { success: false, error: "No Syndicate relationship to report" };
    }

    if (trust.isHostile) {
      return { success: false, error: "Already reported to Coordinator" };
    }

    if (trust.trustLevel === "unknown") {
      return { success: false, error: "Must have Syndicate access to report them" };
    }

    // Get empire for funding calculation
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false, error: "Empire not found" };
    }

    // Calculate effects
    const report = calculateCoordinatorReport(trust.trustPoints, empire.credits);

    // Reset trust and mark hostile
    await db
      .update(syndicateTrust)
      .set({
        trustPoints: 0,
        trustLevel: "unknown",
        isHostile: true,
        updatedAt: new Date(),
      })
      .where(eq(syndicateTrust.id, trust.id));

    // Award funding bonus
    await db
      .update(empires)
      .set({
        credits: empire.credits + report.fundingIncrease,
        updatedAt: new Date(),
      })
      .where(eq(empires.id, empireId));

    // Cancel all active contracts
    await db
      .update(syndicateContracts)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(syndicateContracts.empireId, empireId),
          eq(syndicateContracts.status, "in_progress")
        )
      );

    return {
      success: true,
      fundingIncrease: report.fundingIncrease,
      warning: report.riskDescription,
    };
  } catch (error) {
    console.error("Failed to report to coordinator:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to report",
    };
  }
}
