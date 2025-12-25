/**
 * Market Pricing Formulas (PRD 4.x, 11.4)
 *
 * Dynamic pricing system based on supply and demand.
 * Prices fluctuate between 0.4× to 1.6× base prices.
 *
 * @see docs/PRD.md Section 4 (Resource System)
 * @see docs/PRD.md Section 11.4 (Market Manipulation Consequences)
 */

// =============================================================================
// TYPES
// =============================================================================

export type ResourceType = "credits" | "food" | "ore" | "petroleum" | "research_points";

export interface MarketPriceResult {
  /** The final calculated price */
  price: number;
  /** The base price before modifiers */
  basePrice: number;
  /** The price multiplier applied (0.4 to 1.6) */
  multiplier: number;
  /** Supply/demand ratio used for calculation */
  supplyDemandRatio: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Base market prices for each tradeable resource.
 * Credits are the base currency unit.
 */
export const BASE_PRICES: Record<ResourceType, number> = {
  credits: 1,
  food: 10,
  ore: 15,
  petroleum: 20,
  research_points: 100,
} as const;

/** Minimum price multiplier (high supply / low demand) */
export const PRICE_MULTIPLIER_MIN = 0.4;

/** Maximum price multiplier (low supply / high demand) */
export const PRICE_MULTIPLIER_MAX = 1.6;

/** Default price multiplier (balanced market) */
export const PRICE_MULTIPLIER_DEFAULT = 1.0;

/**
 * Supply/demand ratio thresholds for price calculation.
 * - Below 0.5: Price at max (shortage)
 * - Above 2.0: Price at min (surplus)
 * - At 1.0: Price at default (balanced)
 */
export const SUPPLY_DEMAND_RATIO_MIN = 0.5;
export const SUPPLY_DEMAND_RATIO_MAX = 2.0;
export const SUPPLY_DEMAND_RATIO_BALANCED = 1.0;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate the price multiplier from supply/demand ratio.
 *
 * Uses piecewise linear interpolation to ensure:
 * - Ratio <= 0.5: multiplier = 1.6 (max price, shortage)
 * - Ratio = 1.0: multiplier = 1.0 (balanced)
 * - Ratio >= 2.0: multiplier = 0.4 (min price, surplus)
 *
 * @param supplyDemandRatio - Supply divided by demand
 * @returns Price multiplier between PRICE_MULTIPLIER_MIN and PRICE_MULTIPLIER_MAX
 */
export function calculatePriceMultiplier(supplyDemandRatio: number): number {
  // Clamp ratio to valid range
  const clampedRatio = Math.max(
    SUPPLY_DEMAND_RATIO_MIN,
    Math.min(SUPPLY_DEMAND_RATIO_MAX, supplyDemandRatio)
  );

  // Piecewise linear interpolation through (0.5, 1.6), (1.0, 1.0), (2.0, 0.4)
  if (clampedRatio <= SUPPLY_DEMAND_RATIO_BALANCED) {
    // Shortage zone: ratio 0.5 to 1.0 maps to multiplier 1.6 to 1.0
    const t = (clampedRatio - SUPPLY_DEMAND_RATIO_MIN) /
              (SUPPLY_DEMAND_RATIO_BALANCED - SUPPLY_DEMAND_RATIO_MIN);
    return PRICE_MULTIPLIER_MAX - (t * (PRICE_MULTIPLIER_MAX - PRICE_MULTIPLIER_DEFAULT));
  } else {
    // Surplus zone: ratio 1.0 to 2.0 maps to multiplier 1.0 to 0.4
    const t = (clampedRatio - SUPPLY_DEMAND_RATIO_BALANCED) /
              (SUPPLY_DEMAND_RATIO_MAX - SUPPLY_DEMAND_RATIO_BALANCED);
    return PRICE_MULTIPLIER_DEFAULT - (t * (PRICE_MULTIPLIER_DEFAULT - PRICE_MULTIPLIER_MIN));
  }
}

/**
 * Calculate the current market price for a resource.
 *
 * Formula:
 * Price = BasePrice × Multiplier(supply/demand)
 *
 * @param resource - The resource type to price
 * @param supply - Current supply available in the market
 * @param demand - Current demand from buy orders
 * @returns Market price result with all calculation details
 */
export function calculateMarketPrice(
  resource: ResourceType,
  supply: number,
  demand: number
): MarketPriceResult {
  const basePrice = BASE_PRICES[resource];

  // Handle edge cases
  if (demand <= 0) {
    // No demand = minimum price (surplus)
    return {
      price: Math.floor(basePrice * PRICE_MULTIPLIER_MIN),
      basePrice,
      multiplier: PRICE_MULTIPLIER_MIN,
      supplyDemandRatio: Infinity,
    };
  }

  if (supply <= 0) {
    // No supply = maximum price (shortage)
    return {
      price: Math.floor(basePrice * PRICE_MULTIPLIER_MAX),
      basePrice,
      multiplier: PRICE_MULTIPLIER_MAX,
      supplyDemandRatio: 0,
    };
  }

  const supplyDemandRatio = supply / demand;
  const multiplier = calculatePriceMultiplier(supplyDemandRatio);
  const price = Math.floor(basePrice * multiplier);

  return {
    price,
    basePrice,
    multiplier,
    supplyDemandRatio,
  };
}

/**
 * Calculate a simple market price without detailed breakdown.
 * Convenience wrapper for calculateMarketPrice.
 *
 * @param resource - The resource type
 * @param supply - Current supply
 * @param demand - Current demand
 * @returns The calculated price (integer)
 */
export function getMarketPrice(
  resource: ResourceType,
  supply: number,
  demand: number
): number {
  return calculateMarketPrice(resource, supply, demand).price;
}

/**
 * Get the base price for a resource (no supply/demand modifiers).
 *
 * @param resource - The resource type
 * @returns Base price in credits
 */
export function getBasePrice(resource: ResourceType): number {
  return BASE_PRICES[resource];
}

/**
 * Calculate the total cost to buy a quantity at current market price.
 *
 * @param resource - The resource type
 * @param quantity - Amount to buy
 * @param supply - Current market supply
 * @param demand - Current market demand
 * @returns Total cost in credits
 */
export function calculateBuyCost(
  resource: ResourceType,
  quantity: number,
  supply: number,
  demand: number
): number {
  if (quantity <= 0) return 0;

  const unitPrice = getMarketPrice(resource, supply, demand);
  return unitPrice * quantity;
}

/**
 * Calculate the revenue from selling a quantity at current market price.
 * Selling uses the same price as buying (no spread in this model).
 *
 * @param resource - The resource type
 * @param quantity - Amount to sell
 * @param supply - Current market supply
 * @param demand - Current market demand
 * @returns Revenue in credits
 */
export function calculateSellRevenue(
  resource: ResourceType,
  quantity: number,
  supply: number,
  demand: number
): number {
  if (quantity <= 0) return 0;

  const unitPrice = getMarketPrice(resource, supply, demand);
  return unitPrice * quantity;
}

/**
 * Calculate how much of a resource can be bought with a budget.
 *
 * @param resource - The resource type
 * @param budget - Credits available
 * @param supply - Current market supply
 * @param demand - Current market demand
 * @returns Maximum quantity purchasable (integer)
 */
export function calculateAffordableQuantity(
  resource: ResourceType,
  budget: number,
  supply: number,
  demand: number
): number {
  if (budget <= 0) return 0;

  const unitPrice = getMarketPrice(resource, supply, demand);
  if (unitPrice <= 0) return 0;

  return Math.floor(budget / unitPrice);
}

/**
 * Check if the market is in shortage (high prices).
 *
 * @param supplyDemandRatio - Supply / demand ratio
 * @returns True if market is in shortage condition
 */
export function isMarketShortage(supplyDemandRatio: number): boolean {
  return supplyDemandRatio < SUPPLY_DEMAND_RATIO_BALANCED;
}

/**
 * Check if the market is in surplus (low prices).
 *
 * @param supplyDemandRatio - Supply / demand ratio
 * @returns True if market is in surplus condition
 */
export function isMarketSurplus(supplyDemandRatio: number): boolean {
  return supplyDemandRatio > SUPPLY_DEMAND_RATIO_BALANCED;
}

/**
 * Get all current market prices at once.
 *
 * @param supplyByResource - Map of resource to supply amount
 * @param demandByResource - Map of resource to demand amount
 * @returns Map of resource to current price
 */
export function getAllMarketPrices(
  supplyByResource: Partial<Record<ResourceType, number>>,
  demandByResource: Partial<Record<ResourceType, number>>
): Record<ResourceType, number> {
  const prices: Record<ResourceType, number> = {
    credits: 1, // Credits always 1:1
    food: 0,
    ore: 0,
    petroleum: 0,
    research_points: 0,
  };

  const resources: ResourceType[] = ["food", "ore", "petroleum", "research_points"];

  for (const resource of resources) {
    const supply = supplyByResource[resource] ?? 0;
    const demand = demandByResource[resource] ?? 0;
    prices[resource] = getMarketPrice(resource, supply, demand);
  }

  return prices;
}
