/**
 * Shared Victory Service (M10.3)
 *
 * Handles distribution of rewards when coalitions defeat bosses.
 * Ensures fair distribution based on contribution.
 *
 * Reward Types:
 * - Captured sectors distributed to participants
 * - Credit bonuses based on contribution
 * - Reputation gains for coalition members
 *
 * Distribution Algorithm:
 * - 40% to highest contributor
 * - 30% to second highest
 * - 20% to third highest
 * - 10% split among remaining participants
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CoalitionMemberContribution {
  empireId: string;
  empireName: string;
  /** Damage dealt to boss (sum of casualties inflicted) */
  damageDealt: number;
  /** Troops committed to the fight */
  troopsCommitted: number;
  /** Attacks participated in */
  attacksParticipated: number;
}

export interface BossDefeatResult {
  bossEmpireId: string;
  bossName: string;
  /** Total sectors captured from the boss */
  planetsToDistribute: number;
  /** Total credits looted */
  creditsLooted: number;
  /** Turn when the boss was defeated */
  defeatTurn: number;
}

export interface RewardDistribution {
  empireId: string;
  empireName: string;
  /** Percentage of total contribution (0-1) */
  contributionPercent: number;
  /** Planets awarded */
  planetsAwarded: number;
  /** Credits awarded */
  creditsAwarded: number;
  /** Reputation gained */
  reputationGain: number;
  /** Rank in contribution (1 = highest) */
  contributionRank: number;
}

export interface SharedVictoryResult {
  bossDefeated: string;
  totalPlanetsDistributed: number;
  totalCreditsDistributed: number;
  distributions: RewardDistribution[];
  /** Message describing the victory */
  victoryMessage: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Distribution tiers for rewards
 * Rank 1 gets 40%, Rank 2 gets 30%, Rank 3 gets 20%, rest split 10%
 */
export const DISTRIBUTION_TIERS = {
  RANK_1_PERCENT: 0.4,
  RANK_2_PERCENT: 0.3,
  RANK_3_PERCENT: 0.2,
  REMAINING_PERCENT: 0.1,
} as const;

/**
 * Minimum contribution to receive rewards (prevent free-riding)
 * Must have dealt at least 5% of total damage
 */
export const MIN_CONTRIBUTION_PERCENT = 0.05;

/**
 * Reputation gain for participating in boss defeat
 */
export const REPUTATION_GAIN_BASE = 10;
export const REPUTATION_GAIN_PER_RANK = 2;

/**
 * Bonus credits per sector captured (base)
 */
export const CREDITS_PER_PLANET = 5000;

// =============================================================================
// PURE FUNCTIONS
// =============================================================================

/**
 * Calculate contribution percentages for each member
 *
 * @param contributions - Array of member contributions
 * @returns Array sorted by contribution (highest first) with percentages
 */
export function calculateContributionPercentages(
  contributions: CoalitionMemberContribution[]
): Array<CoalitionMemberContribution & { contributionPercent: number }> {
  // Calculate total contribution score
  // Weight: 60% damage dealt, 30% troops committed, 10% attacks participated
  const scores = contributions.map((c) => ({
    ...c,
    score: c.damageDealt * 0.6 + c.troopsCommitted * 0.3 + c.attacksParticipated * 100 * 0.1,
  }));

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

  // Calculate percentages and sort
  return scores
    .map((s) => ({
      ...s,
      contributionPercent: totalScore > 0 ? s.score / totalScore : 0,
    }))
    .sort((a, b) => b.contributionPercent - a.contributionPercent);
}

/**
 * Filter out members below minimum contribution threshold
 */
export function filterQualifiedMembers(
  contributions: Array<CoalitionMemberContribution & { contributionPercent: number }>
): Array<CoalitionMemberContribution & { contributionPercent: number }> {
  return contributions.filter(
    (c) => c.contributionPercent >= MIN_CONTRIBUTION_PERCENT
  );
}

/**
 * Calculate sector distribution based on contribution ranking
 *
 * @param totalSectors - Total sectors to distribute
 * @param qualifiedCount - Number of qualified members
 * @param rank - Member's contribution rank (1-indexed)
 * @returns Number of sectors for this member
 */
export function calculatePlanetAllocation(
  totalSectors: number,
  qualifiedCount: number,
  rank: number
): number {
  if (totalSectors === 0 || rank < 1) return 0;

  // Single member gets everything
  if (qualifiedCount === 1) {
    return totalSectors;
  }

  // Two members: 60/40 split
  if (qualifiedCount === 2) {
    return rank === 1
      ? Math.ceil(totalSectors * 0.6)
      : Math.floor(totalSectors * 0.4);
  }

  // Three or more members: tiered distribution
  if (rank === 1) {
    return Math.ceil(totalSectors * DISTRIBUTION_TIERS.RANK_1_PERCENT);
  }
  if (rank === 2) {
    return Math.ceil(totalSectors * DISTRIBUTION_TIERS.RANK_2_PERCENT);
  }
  if (rank === 3) {
    return Math.floor(totalSectors * DISTRIBUTION_TIERS.RANK_3_PERCENT);
  }

  // Remaining members split the rest
  const remainingPlanets = Math.floor(
    totalSectors * DISTRIBUTION_TIERS.REMAINING_PERCENT
  );
  const remainingMembers = qualifiedCount - 3;
  return Math.floor(remainingPlanets / remainingMembers);
}

/**
 * Calculate credit allocation based on contribution percentage
 *
 * @param totalCredits - Total credits to distribute
 * @param contributionPercent - Member's contribution percentage
 * @returns Credits for this member
 */
export function calculateCreditAllocation(
  totalCredits: number,
  contributionPercent: number
): number {
  return Math.floor(totalCredits * contributionPercent);
}

/**
 * Calculate reputation gain based on rank
 *
 * @param rank - Member's contribution rank (1-indexed)
 * @returns Reputation points gained
 */
export function calculateReputationGain(rank: number): number {
  // Higher rank = more reputation (rank 1 gets most)
  const rankBonus = Math.max(0, (4 - rank)) * REPUTATION_GAIN_PER_RANK;
  return REPUTATION_GAIN_BASE + rankBonus;
}

/**
 * Generate victory message
 *
 * @param bossName - Name of defeated boss
 * @param participantCount - Number of coalition members
 * @returns Victory announcement message
 */
export function generateVictoryMessage(
  bossName: string,
  participantCount: number
): string {
  if (participantCount === 1) {
    return `A lone empire has brought down the tyrant ${bossName}! The galaxy watches in awe.`;
  }
  if (participantCount === 2) {
    return `Two brave empires have allied to defeat ${bossName}! A new era begins.`;
  }
  return `A coalition of ${participantCount} empires has vanquished the threat of ${bossName}! Victory is shared among the brave.`;
}

/**
 * Distribute rewards for a boss defeat
 *
 * @param contributions - Member contributions
 * @param result - Boss defeat result
 * @returns Distribution result with allocations for each member
 */
export function distributeRewards(
  contributions: CoalitionMemberContribution[],
  result: BossDefeatResult
): SharedVictoryResult {
  // Calculate percentages
  const withPercents = calculateContributionPercentages(contributions);

  // Filter qualified members
  const qualified = filterQualifiedMembers(withPercents);

  // Handle no qualified members (shouldn't happen in practice)
  if (qualified.length === 0) {
    return {
      bossDefeated: result.bossName,
      totalPlanetsDistributed: 0,
      totalCreditsDistributed: 0,
      distributions: [],
      victoryMessage: `${result.bossName} has fallen, but no empire contributed enough to claim the spoils.`,
    };
  }

  // Calculate distributions
  const distributions: RewardDistribution[] = qualified.map((member, index) => {
    const rank = index + 1;
    const sectors = calculatePlanetAllocation(
      result.planetsToDistribute,
      qualified.length,
      rank
    );
    const credits = calculateCreditAllocation(
      result.creditsLooted,
      member.contributionPercent
    );
    const reputation = calculateReputationGain(rank);

    return {
      empireId: member.empireId,
      empireName: member.empireName,
      contributionPercent: member.contributionPercent,
      planetsAwarded: sectors,
      creditsAwarded: credits,
      reputationGain: reputation,
      contributionRank: rank,
    };
  });

  // Calculate totals distributed
  const totalSectors = distributions.reduce((sum, d) => sum + d.planetsAwarded, 0);
  const totalCredits = distributions.reduce((sum, d) => sum + d.creditsAwarded, 0);

  return {
    bossDefeated: result.bossName,
    totalPlanetsDistributed: totalSectors,
    totalCreditsDistributed: totalCredits,
    distributions,
    victoryMessage: generateVictoryMessage(result.bossName, qualified.length),
  };
}

/**
 * Validate contribution data before distribution
 */
export function validateContributions(
  contributions: CoalitionMemberContribution[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (contributions.length === 0) {
    errors.push("No contributions provided");
  }

  for (const c of contributions) {
    if (!c.empireId) {
      errors.push(`Missing empireId for ${c.empireName || "unknown"}`);
    }
    if (c.damageDealt < 0) {
      errors.push(`Negative damage for ${c.empireName}`);
    }
    if (c.troopsCommitted < 0) {
      errors.push(`Negative troops for ${c.empireName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get a summary of the distribution for display
 */
export function getDistributionSummary(result: SharedVictoryResult): string[] {
  const summary: string[] = [
    `Boss Defeated: ${result.bossDefeated}`,
    `Total Planets Distributed: ${result.totalPlanetsDistributed}`,
    `Total Credits Distributed: ${result.totalCreditsDistributed.toLocaleString()}`,
    "",
    "Reward Distribution:",
  ];

  for (const d of result.distributions) {
    summary.push(
      `  ${d.contributionRank}. ${d.empireName}: ` +
        `${d.planetsAwarded} sectors, ` +
        `${d.creditsAwarded.toLocaleString()} credits, ` +
        `+${d.reputationGain} reputation ` +
        `(${(d.contributionPercent * 100).toFixed(1)}% contribution)`
    );
  }

  return summary;
}
