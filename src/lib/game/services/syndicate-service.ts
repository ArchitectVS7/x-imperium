/**
 * Syndicate Service
 *
 * Manages the Black Market trust system, contract lifecycle, and purchases.
 * Based on docs/crafting-system.md Part 3: Black Market & Mafia Trust System
 */

import {
  TRUST_LEVELS,
  TRUST_LEVEL_ORDER,
  CONTRACT_CONFIGS,
  BLACK_MARKET_CATALOG,
  TRUST_MECHANICS,
  getTrustLevelFromPoints,
  getNextTrustLevel,
  getAvailableContracts,
  getBlackMarketPrice,
  type SyndicateTrustLevel,
  type ContractType,
  type ContractConfig,
  type BlackMarketItem,
} from "../constants/syndicate";

// =============================================================================
// TYPES
// =============================================================================

export interface SyndicateTrustStatus {
  trustPoints: number;
  trustLevel: SyndicateTrustLevel;
  levelTitle: string;
  pointsToNextLevel: number | null;
  nextLevelTitle: string | null;
  progressPercent: number;
  contractsCompleted: number;
  contractsFailed: number;
  isHostile: boolean;
  hasReceivedInvitation: boolean;
  availableContracts: ContractType[];
  priceMultiplier: number;
}

export interface ContractOffer {
  type: ContractType;
  config: ContractConfig;
  creditReward: number | "varies" | "special";
  trustReward: number;
  deadline: number; // turn number
  targetEmpireId?: string;
  targetEmpireName?: string;
  isAvailable: boolean;
  reasonIfUnavailable?: string;
}

export interface ContractResult {
  success: boolean;
  error?: string;
  trustEarned?: number;
  creditsEarned?: number;
  specialReward?: string;
}

export interface BlackMarketPurchaseResult {
  success: boolean;
  error?: string;
  creditsSpent?: number;
  resourceType?: string;
  quantity?: number;
}

// =============================================================================
// TRUST LEVEL MANAGEMENT
// =============================================================================

/**
 * Get the current Syndicate trust status for an empire
 */
export function getSyndicateTrustStatus(
  trustPoints: number,
  contractsCompleted: number,
  contractsFailed: number,
  isHostile: boolean,
  hasReceivedInvitation: boolean
): SyndicateTrustStatus {
  const trustLevel = getTrustLevelFromPoints(trustPoints);
  const levelConfig = TRUST_LEVELS[trustLevel];
  const nextLevel = getNextTrustLevel(trustLevel);

  let pointsToNextLevel: number | null = null;
  let progressPercent = 100;

  if (nextLevel) {
    const nextConfig = TRUST_LEVELS[nextLevel];
    const pointsNeeded = nextConfig.pointsRequired - levelConfig.pointsRequired;
    const currentProgress = trustPoints - levelConfig.pointsRequired;
    pointsToNextLevel = nextConfig.pointsRequired - trustPoints;
    progressPercent = Math.min(100, (currentProgress / pointsNeeded) * 100);
  }

  return {
    trustPoints,
    trustLevel,
    levelTitle: levelConfig.title.charAt(0).toUpperCase() + levelConfig.title.slice(1),
    pointsToNextLevel,
    nextLevelTitle: nextLevel ? TRUST_LEVELS[nextLevel].title : null,
    progressPercent,
    contractsCompleted,
    contractsFailed,
    isHostile,
    hasReceivedInvitation,
    availableContracts: getAvailableContracts(trustLevel),
    priceMultiplier: levelConfig.priceMultiplier,
  };
}

/**
 * Calculate trust decay based on turns since last interaction
 */
export function calculateTrustDecay(
  currentPoints: number,
  turnsSinceLastInteraction: number
): { newPoints: number; decayAmount: number } {
  const intervals = Math.floor(turnsSinceLastInteraction / TRUST_MECHANICS.decayInterval);
  if (intervals <= 0) {
    return { newPoints: currentPoints, decayAmount: 0 };
  }

  // Apply decay for each interval
  let points = currentPoints;
  for (let i = 0; i < intervals; i++) {
    points = Math.floor(points * (1 - TRUST_MECHANICS.decayRate));
  }

  // Ensure we don't go below 0
  points = Math.max(0, points);

  return {
    newPoints: points,
    decayAmount: currentPoints - points,
  };
}

/**
 * Award trust points for completing a contract
 */
export function awardContractTrust(
  currentPoints: number,
  contractType: ContractType,
  isRecruitee: boolean = false
): { newPoints: number; trustEarned: number; newLevel: SyndicateTrustLevel } {
  const config = CONTRACT_CONFIGS[contractType];
  let trustEarned = config.trustReward;

  // Apply recruitment bonus (50% extra on first contracts)
  if (isRecruitee) {
    trustEarned = Math.floor(trustEarned * (1 + TRUST_MECHANICS.recruitmentBonusTrust));
  }

  const newPoints = currentPoints + trustEarned;
  const newLevel = getTrustLevelFromPoints(newPoints);

  return {
    newPoints,
    trustEarned,
    newLevel,
  };
}

/**
 * Penalize trust for failing a contract
 */
export function penalizeContractFailure(
  currentPoints: number,
  contractType: ContractType
): { newPoints: number; trustLost: number; newLevel: SyndicateTrustLevel; levelDropped: boolean } {
  const config = CONTRACT_CONFIGS[contractType];
  const trustLost = Math.floor(config.trustReward * TRUST_MECHANICS.contractFailurePenalty);

  const oldLevel = getTrustLevelFromPoints(currentPoints);
  const newPoints = Math.max(0, currentPoints - trustLost);
  const newLevel = getTrustLevelFromPoints(newPoints);

  // Check if level dropped
  const oldLevelIndex = TRUST_LEVEL_ORDER.indexOf(oldLevel);
  const newLevelIndex = TRUST_LEVEL_ORDER.indexOf(newLevel);
  const levelDropped = newLevelIndex < oldLevelIndex;

  return {
    newPoints,
    trustLost,
    newLevel,
    levelDropped,
  };
}

// =============================================================================
// CONTRACT MANAGEMENT
// =============================================================================

/**
 * Generate available contract offers for an empire
 */
export function generateContractOffers(
  trustLevel: SyndicateTrustLevel,
  currentTurn: number,
  existingContractTypes: ContractType[] = [],
  potentialTargets: Array<{ id: string; name: string; networth: number; rank: number }> = []
): ContractOffer[] {
  const availableTypes = getAvailableContracts(trustLevel);
  const offers: ContractOffer[] = [];

  for (const contractType of availableTypes) {
    // Skip if already has active contract of this type
    if (existingContractTypes.includes(contractType)) {
      continue;
    }

    const config = CONTRACT_CONFIGS[contractType];
    const deadline = currentTurn + config.turnsToComplete;

    // Determine target if needed
    let targetEmpireId: string | undefined;
    let targetEmpireName: string | undefined;
    let isAvailable = true;
    let reasonIfUnavailable: string | undefined;

    switch (config.targetType) {
      case "random_player":
        if (potentialTargets.length > 0) {
          const randomTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)]!;
          targetEmpireId = randomTarget.id;
          targetEmpireName = randomTarget.name;
        } else {
          isAvailable = false;
          reasonIfUnavailable = "No valid targets available";
        }
        break;

      case "top_players":
        const topTargets = potentialTargets.filter(t => t.rank <= 3);
        if (topTargets.length > 0) {
          const target = topTargets[Math.floor(Math.random() * topTargets.length)]!;
          targetEmpireId = target.id;
          targetEmpireName = target.name;
        } else {
          isAvailable = false;
          reasonIfUnavailable = "No top 3 players available as targets";
        }
        break;

      case "specific_player":
      case "multiple":
        // These require manual target selection
        isAvailable = potentialTargets.length > 0;
        reasonIfUnavailable = potentialTargets.length === 0 ? "No valid targets" : undefined;
        break;

      case "any_pirate":
        // Pirate targets are handled by the pirate mission system
        isAvailable = true;
        break;
    }

    offers.push({
      type: contractType,
      config,
      creditReward: config.creditReward,
      trustReward: config.trustReward,
      deadline,
      targetEmpireId,
      targetEmpireName,
      isAvailable,
      reasonIfUnavailable,
    });
  }

  return offers;
}

/**
 * Validate if an empire can accept a contract
 */
export function validateContractAcceptance(
  trustLevel: SyndicateTrustLevel,
  contractType: ContractType,
  activeContractCount: number,
  maxActiveContracts: number = 3
): { valid: boolean; error?: string } {
  // Check trust level requirement
  const config = CONTRACT_CONFIGS[contractType];
  const requiredIndex = TRUST_LEVEL_ORDER.indexOf(config.minTrustLevel);
  const currentIndex = TRUST_LEVEL_ORDER.indexOf(trustLevel);

  if (currentIndex < requiredIndex) {
    return {
      valid: false,
      error: `Requires ${TRUST_LEVELS[config.minTrustLevel].title} trust level`,
    };
  }

  // Check active contract limit
  if (activeContractCount >= maxActiveContracts) {
    return {
      valid: false,
      error: `Maximum ${maxActiveContracts} active contracts allowed`,
    };
  }

  return { valid: true };
}

// =============================================================================
// BLACK MARKET PURCHASES
// =============================================================================

/**
 * Get the Black Market catalog with prices for a trust level
 */
export function getBlackMarketCatalog(
  trustLevel: SyndicateTrustLevel
): Array<{
  itemId: string;
  item: BlackMarketItem;
  price: number | null;
  isUnlocked: boolean;
}> {
  const currentLevelIndex = TRUST_LEVEL_ORDER.indexOf(trustLevel);

  return Object.entries(BLACK_MARKET_CATALOG).map(([itemId, item]) => {
    const itemLevelIndex = TRUST_LEVEL_ORDER.indexOf(item.minTrustLevel);
    const isUnlocked = currentLevelIndex >= itemLevelIndex;
    const price = isUnlocked ? getBlackMarketPrice(itemId, trustLevel) : null;

    return {
      itemId,
      item,
      price,
      isUnlocked,
    };
  });
}

/**
 * Calculate the cost of a Black Market purchase
 */
export function calculateBlackMarketPurchase(
  itemId: string,
  quantity: number,
  trustLevel: SyndicateTrustLevel,
  availableCredits: number
): BlackMarketPurchaseResult {
  const item = BLACK_MARKET_CATALOG[itemId];
  if (!item) {
    return { success: false, error: `Unknown item: ${itemId}` };
  }

  // Check trust level
  const itemLevelIndex = TRUST_LEVEL_ORDER.indexOf(item.minTrustLevel);
  const currentLevelIndex = TRUST_LEVEL_ORDER.indexOf(trustLevel);

  if (currentLevelIndex < itemLevelIndex) {
    return {
      success: false,
      error: `Requires ${TRUST_LEVELS[item.minTrustLevel].title} trust level`,
    };
  }

  // Calculate price
  const unitPrice = getBlackMarketPrice(itemId, trustLevel);
  if (unitPrice === null) {
    return { success: false, error: "Unable to calculate price" };
  }

  const totalCost = unitPrice * quantity;

  // Check if can afford
  if (availableCredits < totalCost) {
    return {
      success: false,
      error: `Insufficient credits. Need ${totalCost.toLocaleString()}, have ${availableCredits.toLocaleString()}`,
    };
  }

  // Single-use items can only be purchased one at a time
  if (item.singleUse && quantity > 1) {
    return {
      success: false,
      error: "Single-use items can only be purchased one at a time",
    };
  }

  return {
    success: true,
    creditsSpent: totalCost,
    resourceType: item.resourceType,
    quantity,
  };
}

// =============================================================================
// RECRUITMENT MECHANICS
// =============================================================================

/**
 * Check if an empire qualifies for Syndicate recruitment
 * (Bottom 50% of empires, hasn't received invitation yet)
 */
export function checkRecruitmentEligibility(
  empireNetworth: number,
  allNetworthsDescending: number[],
  hasReceivedInvitation: boolean
): { eligible: boolean; reason?: string } {
  if (hasReceivedInvitation) {
    return { eligible: false, reason: "Already received invitation" };
  }

  const total = allNetworthsDescending.length;
  if (total === 0) {
    return { eligible: false, reason: "No empires to compare" };
  }

  const rank = allNetworthsDescending.findIndex(nw => nw <= empireNetworth) + 1;
  const percentile = rank / total;

  // Bottom 50% qualifies
  if (percentile > TRUST_MECHANICS.recruitmentThreshold) {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: `Empire is in top ${(percentile * 100).toFixed(0)}%, needs to be in bottom ${(TRUST_MECHANICS.recruitmentThreshold * 100).toFixed(0)}%`,
  };
}

/**
 * Get recruitment bonuses for a new recruit
 */
export function getRecruitmentBonuses(): {
  startupFunds: number;
  trustBonusPercent: number;
} {
  return {
    startupFunds: TRUST_MECHANICS.recruitmentStartupFunds,
    trustBonusPercent: TRUST_MECHANICS.recruitmentBonusTrust * 100,
  };
}

// =============================================================================
// COORDINATOR REPORTING
// =============================================================================

/**
 * Calculate the effects of reporting to the Coordinator
 * (Betraying the Syndicate for government benefits)
 */
export function calculateCoordinatorReport(
  currentTrustPoints: number,
  currentFunding: number
): {
  trustReset: boolean;
  newTrustPoints: number;
  fundingBonusPercent: number;
  fundingIncrease: number;
  becomesHostile: boolean;
  riskDescription: string;
} {
  const fundingBonus = TRUST_MECHANICS.reportReward.coordinatorFundingBonus;
  const fundingIncrease = Math.floor(currentFunding * fundingBonus);

  return {
    trustReset: TRUST_MECHANICS.reportReward.trustReset,
    newTrustPoints: 0,
    fundingBonusPercent: fundingBonus * 100,
    fundingIncrease,
    becomesHostile: TRUST_MECHANICS.reportReward.syndicateHostile,
    riskDescription: "Syndicate will send assassins. Random chance of losing generals or covert agents each turn.",
  };
}
