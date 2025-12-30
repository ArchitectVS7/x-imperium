/**
 * Sector Balancing Service (M6.1)
 *
 * Ensures fair empire distribution across sectors at game start.
 *
 * Goals:
 * 1. Each sector's total effective networth within ±10% of average
 * 2. Mix of bot tiers in each sector (not all strong bots together)
 * 3. Player starts in a balanced sector (outer/inner region)
 *
 * Algorithm: Snake-draft distribution with tier balancing
 */

import { calculateStartingNetworth } from "@/lib/game/networth";
import type { REGION_TEMPLATES } from "./galaxy-generation-service";

// =============================================================================
// TYPES
// =============================================================================

export interface EmpireForBalancing {
  id: string;
  type: "player" | "bot";
  botTier?: number | null; // 1-4, null for player
}

export interface RegionForBalancing {
  id: string;
  regionType: keyof typeof REGION_TEMPLATES;
  maxEmpires: number;
  wealthModifier: number; // From region template (0.5 - 1.5)
}

export interface SectorBalance {
  regionId: string;
  empireIds: string[];
  totalNetworth: number;
  effectiveNetworth: number; // Adjusted for region wealth modifier
  botTierDistribution: Record<number, number>; // tier -> count
}

export interface BalanceResult {
  assignments: Map<string, string>; // empireId -> regionId
  sectorBalances: SectorBalance[];
  isBalanced: boolean;
  maxDeviation: number; // Max deviation from average (0.0 - 1.0)
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const BALANCE_CONSTANTS = {
  /** Maximum allowed deviation from average networth */
  MAX_DEVIATION: 0.10, // ±10%
  /** Ideal bot tier mix per sector (for 10 empires) */
  IDEAL_TIER_MIX: {
    1: 1,  // 1 elite bot (Tier 1)
    2: 2,  // 2 strategic bots (Tier 2)
    3: 5,  // 5 simple bots (Tier 3)
    4: 1,  // 1 random bot (Tier 4)
  },
  /** Weight for tier in balancing (higher tier = more "value") */
  TIER_WEIGHTS: {
    1: 1.5,  // Elite bots are worth more
    2: 1.2,  // Strategic bots
    3: 1.0,  // Simple bots (baseline)
    4: 0.8,  // Random bots worth less
  } as Record<number, number>,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate effective networth considering region wealth and bot tier
 */
export function calculateEffectiveNetworth(
  baseNetworth: number,
  wealthModifier: number,
  botTier?: number | null
): number {
  const tierWeight = botTier
    ? BALANCE_CONSTANTS.TIER_WEIGHTS[botTier] ?? 1.0
    : 1.0; // Player treated as baseline

  return baseNetworth * wealthModifier * tierWeight;
}

/**
 * Calculate balance metrics for a set of sector assignments
 */
export function calculateSectorBalances(
  assignments: Map<string, string>,
  empires: EmpireForBalancing[],
  regions: RegionForBalancing[]
): SectorBalance[] {
  const balances: SectorBalance[] = [];
  const regionMap = new Map(regions.map((r) => [r.id, r]));
  const baseNetworth = calculateStartingNetworth();

  // Group empires by region
  const regionEmpires = new Map<string, EmpireForBalancing[]>();
  for (const region of regions) {
    regionEmpires.set(region.id, []);
  }

  for (const empire of empires) {
    const regionId = assignments.get(empire.id);
    if (regionId) {
      regionEmpires.get(regionId)?.push(empire);
    }
  }

  // Calculate balance for each region
  for (const [regionId, empireList] of Array.from(regionEmpires.entries())) {
    const region = regionMap.get(regionId);
    if (!region) continue;

    let totalNetworth = 0;
    let effectiveNetworth = 0;
    const tierDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    for (const empire of empireList) {
      totalNetworth += baseNetworth;
      effectiveNetworth += calculateEffectiveNetworth(
        baseNetworth,
        region.wealthModifier,
        empire.botTier
      );

      if (empire.botTier) {
        tierDistribution[empire.botTier] =
          (tierDistribution[empire.botTier] ?? 0) + 1;
      }
    }

    balances.push({
      regionId,
      empireIds: empireList.map((e: EmpireForBalancing) => e.id),
      totalNetworth,
      effectiveNetworth,
      botTierDistribution: tierDistribution,
    });
  }

  return balances;
}

/**
 * Check if sector balances are within tolerance
 *
 * Note: Uses RAW networth (planet + military value), not effective networth.
 * This matches the PRD: "Each sector's total networth within ±10% of average"
 * Wealth modifiers affect production, not networth calculation.
 */
export function checkBalance(balances: SectorBalance[]): {
  isBalanced: boolean;
  maxDeviation: number;
  averageNetworth: number;
} {
  if (balances.length === 0) {
    return { isBalanced: true, maxDeviation: 0, averageNetworth: 0 };
  }

  // Use raw totalNetworth, not effectiveNetworth
  const totalNetworth = balances.reduce(
    (sum, b) => sum + b.totalNetworth,
    0
  );
  const averageNetworth = totalNetworth / balances.length;

  let maxDeviation = 0;
  for (const balance of balances) {
    if (averageNetworth === 0) continue;
    const deviation = Math.abs(balance.totalNetworth - averageNetworth) / averageNetworth;
    maxDeviation = Math.max(maxDeviation, deviation);
  }

  return {
    isBalanced: maxDeviation <= BALANCE_CONSTANTS.MAX_DEVIATION,
    maxDeviation,
    averageNetworth,
  };
}

// =============================================================================
// MAIN BALANCING ALGORITHM
// =============================================================================

/**
 * Balance empires across sectors using wealth-aware distribution
 *
 * Strategy:
 * 1. Sort regions by wealth modifier (lowest first)
 * 2. Distribute stronger bots to lower-wealth regions to balance
 * 3. Use snake-draft within wealth tiers
 */
export function balanceEmpiresToSectors(
  empires: EmpireForBalancing[],
  regions: RegionForBalancing[],
  random: () => number = Math.random
): BalanceResult {
  const assignments = new Map<string, string>();

  // Separate player and bots
  const player = empires.find((e) => e.type === "player");
  const bots = empires.filter((e) => e.type === "bot");

  // Sort bots by tier (strongest first)
  const sortedBots = [...bots].sort((a, b) => {
    const tierA = a.botTier ?? 3;
    const tierB = b.botTier ?? 3;
    return tierA - tierB; // Lower tier = stronger = first
  });

  // Sort regions by wealth modifier (lowest first) - this helps balance
  // Strong bots go to poor regions, weak bots go to rich regions
  const sortedRegions = [...regions].sort(
    (a, b) => a.wealthModifier - b.wealthModifier
  );

  // Initialize region capacity tracking
  const regionCapacity = new Map<string, number>();
  for (const region of regions) {
    regionCapacity.set(region.id, region.maxEmpires);
  }

  // Step 1: Assign player to outer/inner region (fair start, wealth ~1.0-1.2)
  if (player) {
    const playerRegions = sortedRegions.filter(
      (r) =>
        (r.regionType === "outer" || r.regionType === "inner") &&
        regionCapacity.get(r.id)! > 0
    );

    if (playerRegions.length > 0) {
      const playerRegion =
        playerRegions[Math.floor(random() * playerRegions.length)]!;
      assignments.set(player.id, playerRegion.id);
      regionCapacity.set(
        playerRegion.id,
        regionCapacity.get(playerRegion.id)! - 1
      );
    } else {
      // Fallback: any region with capacity
      const fallback = sortedRegions.find(
        (r) => regionCapacity.get(r.id)! > 0
      );
      if (fallback) {
        assignments.set(player.id, fallback.id);
        regionCapacity.set(fallback.id, regionCapacity.get(fallback.id)! - 1);
      }
    }
  }

  // Step 2: Interleaved distribution - alternate strong/weak bots across regions
  // This naturally balances because strong bots (low tier) go to various regions
  const regionsWithCapacity = () =>
    sortedRegions.filter((r) => regionCapacity.get(r.id)! > 0);

  let regionIndex = 0;
  let direction = 1;

  for (const bot of sortedBots) {
    const available = regionsWithCapacity();
    if (available.length === 0) break;

    // Clamp index to available range
    regionIndex = Math.max(0, Math.min(regionIndex, available.length - 1));

    const region = available[regionIndex]!;
    assignments.set(bot.id, region.id);
    regionCapacity.set(region.id, regionCapacity.get(region.id)! - 1);

    // Snake movement for even distribution
    regionIndex += direction;
    if (regionIndex >= available.length) {
      regionIndex = available.length - 1;
      direction = -1;
    } else if (regionIndex < 0) {
      regionIndex = 0;
      direction = 1;
    }
  }

  // Calculate final balances
  const sectorBalances = calculateSectorBalances(assignments, empires, regions);
  const { isBalanced, maxDeviation } = checkBalance(sectorBalances);

  // Step 3: Aggressive rebalancing if needed
  if (!isBalanced && sectorBalances.length >= 2) {
    aggressiveRebalance(assignments, empires, regions, random);

    // Recalculate after rebalancing
    const newBalances = calculateSectorBalances(assignments, empires, regions);
    const newCheck = checkBalance(newBalances);

    return {
      assignments,
      sectorBalances: newBalances,
      isBalanced: newCheck.isBalanced,
      maxDeviation: newCheck.maxDeviation,
    };
  }

  return {
    assignments,
    sectorBalances,
    isBalanced,
    maxDeviation,
  };
}

/**
 * Aggressive rebalancing by moving empires between sectors
 */
function aggressiveRebalance(
  assignments: Map<string, string>,
  empires: EmpireForBalancing[],
  regions: RegionForBalancing[],
  random: () => number
): void {
  const baseNetworth = calculateStartingNetworth();
  const regionMap = new Map(regions.map((r) => [r.id, r]));
  const empireMap = new Map(empires.map((e) => [e.id, e]));

  // Calculate current effective networth per region
  const regionNetworth = new Map<string, number>();
  for (const region of regions) {
    regionNetworth.set(region.id, 0);
  }

  for (const [empireId, regionId] of Array.from(assignments.entries())) {
    const empire = empireMap.get(empireId);
    const region = regionMap.get(regionId);
    if (!empire || !region) continue;

    const effective = calculateEffectiveNetworth(
      baseNetworth,
      region.wealthModifier,
      empire.botTier
    );
    regionNetworth.set(regionId, (regionNetworth.get(regionId) ?? 0) + effective);
  }

  const avgNetworth =
    Array.from(regionNetworth.values()).reduce((a, b) => a + b, 0) /
    regionNetworth.size;

  // Try to move high-tier bots from rich regions to poor regions
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    // Find richest and poorest regions
    let richestId = "";
    let poorestId = "";
    let maxNw = -Infinity;
    let minNw = Infinity;

    for (const [id, nw] of Array.from(regionNetworth.entries())) {
      if (nw > maxNw) {
        maxNw = nw;
        richestId = id;
      }
      if (nw < minNw) {
        minNw = nw;
        poorestId = id;
      }
    }

    const richDeviation = (maxNw - avgNetworth) / avgNetworth;
    const poorDeviation = (avgNetworth - minNw) / avgNetworth;

    // Stop if within tolerance
    if (richDeviation <= BALANCE_CONSTANTS.MAX_DEVIATION &&
        poorDeviation <= BALANCE_CONSTANTS.MAX_DEVIATION) {
      break;
    }

    // Find a strong bot in rich region and weak bot in poor region to swap
    const richRegion = regionMap.get(richestId);
    const poorRegion = regionMap.get(poorestId);
    if (!richRegion || !poorRegion) break;

    const richEmpiresIds = Array.from(assignments.entries())
      .filter(([_, rId]) => rId === richestId)
      .map(([eId]) => eId);
    const poorEmpireIds = Array.from(assignments.entries())
      .filter(([_, rId]) => rId === poorestId)
      .map(([eId]) => eId);

    const richBots = richEmpiresIds
      .map((id) => empireMap.get(id))
      .filter((e) => e?.type === "bot") as EmpireForBalancing[];
    const poorBots = poorEmpireIds
      .map((id) => empireMap.get(id))
      .filter((e) => e?.type === "bot") as EmpireForBalancing[];

    if (richBots.length === 0 || poorBots.length === 0) break;

    // Find best swap candidates
    richBots.sort((a, b) => (a.botTier ?? 3) - (b.botTier ?? 3)); // Strongest first
    poorBots.sort((a, b) => (b.botTier ?? 3) - (a.botTier ?? 3)); // Weakest first

    const richBot = richBots[0];
    const poorBot = poorBots[0];
    if (!richBot || !poorBot) break;

    // Swap
    assignments.set(richBot.id, poorestId);
    assignments.set(poorBot.id, richestId);

    // Update networth tracking
    const richBotOldNw = calculateEffectiveNetworth(
      baseNetworth,
      richRegion.wealthModifier,
      richBot.botTier
    );
    const richBotNewNw = calculateEffectiveNetworth(
      baseNetworth,
      poorRegion.wealthModifier,
      richBot.botTier
    );
    const poorBotOldNw = calculateEffectiveNetworth(
      baseNetworth,
      poorRegion.wealthModifier,
      poorBot.botTier
    );
    const poorBotNewNw = calculateEffectiveNetworth(
      baseNetworth,
      richRegion.wealthModifier,
      poorBot.botTier
    );

    regionNetworth.set(
      richestId,
      (regionNetworth.get(richestId) ?? 0) - richBotOldNw + poorBotNewNw
    );
    regionNetworth.set(
      poorestId,
      (regionNetworth.get(poorestId) ?? 0) - poorBotOldNw + richBotNewNw
    );
  }
}

/**
 * Attempt to rebalance sectors by swapping empires (legacy)
 */
function rebalanceSectors(
  assignments: Map<string, string>,
  empires: EmpireForBalancing[],
  regions: RegionForBalancing[],
  balances: SectorBalance[],
  random: () => number
): void {
  const regionMap = new Map(regions.map((r) => [r.id, r]));
  const empireMap = new Map(empires.map((e) => [e.id, e]));

  // Find richest and poorest sectors
  const sortedBalances = [...balances].sort(
    (a, b) => b.effectiveNetworth - a.effectiveNetworth
  );

  const maxSwapAttempts = 10;
  let attempts = 0;

  while (attempts < maxSwapAttempts) {
    attempts++;

    const richest = sortedBalances[0];
    const poorest = sortedBalances[sortedBalances.length - 1];

    if (!richest || !poorest || richest.regionId === poorest.regionId) break;

    // Find a bot to swap from richest to poorest
    const richBots = richest.empireIds
      .map((id) => empireMap.get(id))
      .filter((e) => e?.type === "bot") as EmpireForBalancing[];

    const poorBots = poorest.empireIds
      .map((id) => empireMap.get(id))
      .filter((e) => e?.type === "bot") as EmpireForBalancing[];

    if (richBots.length === 0 || poorBots.length === 0) break;

    // Find bots with different tiers to swap
    const richBot = richBots.find((b) =>
      poorBots.some((p) => (b.botTier ?? 3) < (p.botTier ?? 3))
    );
    const poorBot = poorBots.find(
      (p) => richBot && (p.botTier ?? 3) > (richBot.botTier ?? 3)
    );

    if (richBot && poorBot) {
      // Swap assignments
      assignments.set(richBot.id, poorest.regionId);
      assignments.set(poorBot.id, richest.regionId);

      // Recalculate and check
      const newBalances = calculateSectorBalances(assignments, empires, regions);
      const { isBalanced } = checkBalance(newBalances);

      if (isBalanced) break;

      // Update sorted balances for next iteration
      sortedBalances.length = 0;
      sortedBalances.push(
        ...newBalances.sort((a, b) => b.effectiveNetworth - a.effectiveNetworth)
      );
    } else {
      break; // No more swaps possible
    }
  }
}

// =============================================================================
// INTEGRATION WITH GALAXY GENERATION
// =============================================================================

/**
 * Enhanced empire assignment that uses sector balancing
 *
 * Drop-in replacement for assignEmpiresToRegions in galaxy-generation-service.ts
 */
export function assignEmpiresWithBalancing(
  empires: Array<{ id: string; type: "player" | "bot"; botTier?: string | null }>,
  regions: Array<{
    id: string;
    regionType: string;
    maxEmpires: number;
    wealthModifier?: string;
  }>,
  random: () => number = Math.random
): Map<string, string> {
  // Convert to balancing format
  const empiresForBalancing: EmpireForBalancing[] = empires.map((e) => ({
    id: e.id,
    type: e.type,
    botTier: e.botTier ? parseInt(e.botTier, 10) : null,
  }));

  const regionsForBalancing: RegionForBalancing[] = regions.map((r) => ({
    id: r.id,
    regionType: r.regionType as keyof typeof REGION_TEMPLATES,
    maxEmpires: r.maxEmpires,
    wealthModifier: r.wealthModifier ? parseFloat(r.wealthModifier) : 1.0,
  }));

  // Run balancing algorithm
  const result = balanceEmpiresToSectors(
    empiresForBalancing,
    regionsForBalancing,
    random
  );

  return result.assignments;
}
