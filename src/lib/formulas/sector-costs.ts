/**
 * Sector Cost Calculation (PRD 5.3)
 *
 * Calculates sector colonization and release costs.
 * - Cost increases as you own more sectors: BaseCost × (1 + OwnedSectors × 0.05)
 * - Release refund is 50% of current purchase price
 */

// =============================================================================
// CONSTANTS (PRD 5.3)
// =============================================================================

/** Cost scaling factor per owned sector (5% increase) */
export const SECTOR_COST_SCALING = 0.05;

/** Refund percentage when releasing a sector (50%) */
export const SECTOR_RELEASE_REFUND = 0.5;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate the colonization cost for a sector based on current ownership.
 *
 * Formula (PRD 5.3):
 * Cost = BaseCost × (1 + OwnedSectors × 0.05)
 *
 * Example with 8,000 base cost:
 * - 0 sectors: 8,000 × 1.00 = 8,000
 * - 9 sectors: 8,000 × 1.45 = 11,600
 * - 20 sectors: 8,000 × 2.00 = 16,000
 * - 50 sectors: 8,000 × 3.50 = 28,000
 *
 * @param baseCost - The base cost of the sector type (from SECTOR_COSTS)
 * @param ownedSectors - Number of sectors currently owned
 * @returns The colonization cost (integer, rounded down)
 */
export function calculateSectorCost(
  baseCost: number,
  ownedSectors: number
): number {
  if (baseCost <= 0) {
    return 0;
  }
  if (ownedSectors < 0) {
    ownedSectors = 0;
  }

  const multiplier = 1 + ownedSectors * SECTOR_COST_SCALING;
  return Math.floor(baseCost * multiplier);
}

/**
 * Calculate the refund amount when releasing (selling) a sector.
 *
 * Formula (PRD 5.3):
 * Refund = PurchasePrice × 0.5
 *
 * Note: The refund is based on the current purchase price at time of release,
 * not the original purchase price.
 *
 * @param baseCost - The base cost of the sector type
 * @param ownedSectors - Number of sectors currently owned (including this one)
 * @returns The refund amount (integer, rounded down)
 */
export function calculateReleaseRefund(
  baseCost: number,
  ownedSectors: number
): number {
  const currentPrice = calculateSectorCost(baseCost, ownedSectors);
  return Math.floor(currentPrice * SECTOR_RELEASE_REFUND);
}

/**
 * Calculate the cost multiplier for a given number of owned sectors.
 * Useful for displaying the scaling factor to players.
 *
 * @param ownedSectors - Number of sectors currently owned
 * @returns The cost multiplier (e.g., 1.45 for 9 sectors)
 */
export function getSectorCostMultiplier(ownedSectors: number): number {
  if (ownedSectors < 0) {
    ownedSectors = 0;
  }
  return 1 + ownedSectors * SECTOR_COST_SCALING;
}

/**
 * Calculate the total cost to colonize multiple sectors of the same type.
 * Each subsequent sector costs more due to scaling.
 *
 * @param baseCost - The base cost of the sector type
 * @param currentlyOwned - Number of sectors currently owned
 * @param quantity - Number of sectors to colonize
 * @returns The total cost for all sectors
 */
export function calculateBulkSectorCost(
  baseCost: number,
  currentlyOwned: number,
  quantity: number
): number {
  if (quantity <= 0) {
    return 0;
  }

  let totalCost = 0;
  for (let i = 0; i < quantity; i++) {
    totalCost += calculateSectorCost(baseCost, currentlyOwned + i);
  }
  return totalCost;
}

/**
 * Calculate how many sectors of a type can be afforded with given credits.
 *
 * @param baseCost - The base cost of the sector type
 * @param currentlyOwned - Number of sectors currently owned
 * @param availableCredits - Credits available for colonization
 * @returns Maximum number of sectors that can be colonized
 */
export function calculateAffordableSectors(
  baseCost: number,
  currentlyOwned: number,
  availableCredits: number
): number {
  if (availableCredits <= 0 || baseCost <= 0) {
    return 0;
  }

  let count = 0;
  let remainingCredits = availableCredits;

  while (true) {
    const cost = calculateSectorCost(baseCost, currentlyOwned + count);
    if (cost > remainingCredits) {
      break;
    }
    remainingCredits -= cost;
    count++;
  }

  return count;
}
