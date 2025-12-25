/**
 * Supply and Demand Tracking (PRD 4.x, 11.4)
 *
 * Manages market state by tracking buy/sell orders and calculating
 * supply/demand metrics for dynamic pricing.
 *
 * @see docs/PRD.md Section 4 (Resource System)
 * @see docs/PRD.md Section 11.4 (Market Manipulation Consequences)
 */

import { type ResourceType } from "./pricing";

// =============================================================================
// TYPES
// =============================================================================

export type OrderType = "buy" | "sell";

export interface MarketOrder {
  /** Unique order identifier */
  id: string;
  /** Empire placing the order */
  empireId: string;
  /** Resource being traded */
  resource: ResourceType;
  /** Order type (buy or sell) */
  orderType: OrderType;
  /** Quantity requested */
  quantity: number;
  /** Price limit (max for buy, min for sell), or null for market order */
  priceLimit: number | null;
  /** Turn when order was placed */
  turnPlaced: number;
  /** Whether order is still active */
  active: boolean;
}

export interface SupplyDemandState {
  /** Total supply available (sum of sell orders) */
  supply: number;
  /** Total demand (sum of buy orders) */
  demand: number;
  /** Supply / demand ratio */
  ratio: number;
  /** Number of active sell orders */
  sellOrderCount: number;
  /** Number of active buy orders */
  buyOrderCount: number;
}

export interface MarketState {
  /** Supply/demand state per resource */
  resources: Record<ResourceType, SupplyDemandState>;
  /** All active orders */
  activeOrders: MarketOrder[];
  /** Current turn for staleness checks */
  currentTurn: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Orders older than this are considered stale and may be auto-cancelled */
export const ORDER_STALENESS_TURNS = 5;

/** Minimum order quantity */
export const MIN_ORDER_QUANTITY = 1;

/** Default supply/demand state for empty markets */
export const DEFAULT_SUPPLY_DEMAND: SupplyDemandState = {
  supply: 0,
  demand: 0,
  ratio: 1.0, // Balanced when no orders
  sellOrderCount: 0,
  buyOrderCount: 0,
};

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate supply and demand from a list of market orders for a specific resource.
 *
 * @param orders - All market orders to analyze
 * @param resource - Resource type to calculate for
 * @returns Supply and demand state
 */
export function calculateSupplyDemand(
  orders: MarketOrder[],
  resource: ResourceType
): SupplyDemandState {
  let supply = 0;
  let demand = 0;
  let sellOrderCount = 0;
  let buyOrderCount = 0;

  for (const order of orders) {
    if (!order.active || order.resource !== resource) {
      continue;
    }

    if (order.orderType === "sell") {
      supply += order.quantity;
      sellOrderCount++;
    } else {
      demand += order.quantity;
      buyOrderCount++;
    }
  }

  // Calculate ratio (avoid division by zero)
  let ratio: number;
  if (demand <= 0 && supply <= 0) {
    ratio = 1.0; // Balanced when no activity
  } else if (demand <= 0) {
    ratio = Infinity; // All supply, no demand
  } else if (supply <= 0) {
    ratio = 0; // All demand, no supply
  } else {
    ratio = supply / demand;
  }

  return {
    supply,
    demand,
    ratio,
    sellOrderCount,
    buyOrderCount,
  };
}

/**
 * Update supply/demand state for all resources from market orders.
 *
 * @param marketOrders - All active market orders
 * @returns Supply/demand state for each resource
 */
export function updateSupplyDemand(
  marketOrders: MarketOrder[]
): Record<ResourceType, SupplyDemandState> {
  const resources: ResourceType[] = [
    "credits",
    "food",
    "ore",
    "petroleum",
    "research_points",
  ];

  const result: Record<ResourceType, SupplyDemandState> = {
    credits: { ...DEFAULT_SUPPLY_DEMAND },
    food: { ...DEFAULT_SUPPLY_DEMAND },
    ore: { ...DEFAULT_SUPPLY_DEMAND },
    petroleum: { ...DEFAULT_SUPPLY_DEMAND },
    research_points: { ...DEFAULT_SUPPLY_DEMAND },
  };

  for (const resource of resources) {
    result[resource] = calculateSupplyDemand(marketOrders, resource);
  }

  return result;
}

/**
 * Get supply/demand state for a specific resource.
 *
 * @param marketOrders - All market orders
 * @param resource - Resource to check
 * @returns Supply/demand state for the resource
 */
export function getResourceSupplyDemand(
  marketOrders: MarketOrder[],
  resource: ResourceType
): SupplyDemandState {
  return calculateSupplyDemand(marketOrders, resource);
}

/**
 * Create a new market order.
 *
 * @param empireId - Empire placing the order
 * @param resource - Resource to trade
 * @param orderType - Buy or sell
 * @param quantity - Quantity to trade
 * @param currentTurn - Current game turn
 * @param priceLimit - Optional price limit
 * @returns New market order object
 */
export function createMarketOrder(
  empireId: string,
  resource: ResourceType,
  orderType: OrderType,
  quantity: number,
  currentTurn: number,
  priceLimit: number | null = null
): MarketOrder {
  return {
    id: `${empireId}-${resource}-${orderType}-${currentTurn}-${Math.random().toString(36).slice(2, 8)}`,
    empireId,
    resource,
    orderType,
    quantity: Math.max(MIN_ORDER_QUANTITY, Math.floor(quantity)),
    priceLimit,
    turnPlaced: currentTurn,
    active: true,
  };
}

/**
 * Cancel a market order.
 *
 * @param order - Order to cancel
 * @returns Updated order with active = false
 */
export function cancelOrder(order: MarketOrder): MarketOrder {
  return {
    ...order,
    active: false,
  };
}

/**
 * Partially fill an order (reduce quantity).
 *
 * @param order - Order to update
 * @param filledQuantity - Amount that was filled
 * @returns Updated order with reduced quantity (or inactive if fully filled)
 */
export function fillOrder(
  order: MarketOrder,
  filledQuantity: number
): MarketOrder {
  const remainingQuantity = order.quantity - filledQuantity;

  if (remainingQuantity <= 0) {
    return {
      ...order,
      quantity: 0,
      active: false,
    };
  }

  return {
    ...order,
    quantity: remainingQuantity,
  };
}

/**
 * Check if an order is stale (too old).
 *
 * @param order - Order to check
 * @param currentTurn - Current game turn
 * @returns True if order is stale
 */
export function isOrderStale(order: MarketOrder, currentTurn: number): boolean {
  return (currentTurn - order.turnPlaced) > ORDER_STALENESS_TURNS;
}

/**
 * Get all stale orders that should be cancelled.
 *
 * @param orders - All orders to check
 * @param currentTurn - Current game turn
 * @returns List of stale orders
 */
export function getStaleOrders(
  orders: MarketOrder[],
  currentTurn: number
): MarketOrder[] {
  return orders.filter(
    (order) => order.active && isOrderStale(order, currentTurn)
  );
}

/**
 * Get active orders for a specific empire.
 *
 * @param orders - All orders
 * @param empireId - Empire to filter by
 * @returns Orders belonging to the empire
 */
export function getEmpireOrders(
  orders: MarketOrder[],
  empireId: string
): MarketOrder[] {
  return orders.filter((order) => order.active && order.empireId === empireId);
}

/**
 * Calculate the net position of an empire in a resource.
 * Positive = net buyer (more buy orders), Negative = net seller.
 *
 * @param orders - All orders
 * @param empireId - Empire to check
 * @param resource - Resource to check
 * @returns Net quantity (positive = buying, negative = selling)
 */
export function calculateNetPosition(
  orders: MarketOrder[],
  empireId: string,
  resource: ResourceType
): number {
  let net = 0;

  for (const order of orders) {
    if (!order.active || order.empireId !== empireId || order.resource !== resource) {
      continue;
    }

    if (order.orderType === "buy") {
      net += order.quantity;
    } else {
      net -= order.quantity;
    }
  }

  return net;
}

/**
 * Calculate market concentration for a resource.
 * Used to detect potential market manipulation (PRD 11.4).
 *
 * @param orders - All orders
 * @param resource - Resource to check
 * @returns Map of empire ID to their share of total supply
 */
export function calculateMarketConcentration(
  orders: MarketOrder[],
  resource: ResourceType
): Map<string, number> {
  const { supply } = calculateSupplyDemand(orders, resource);
  const concentration = new Map<string, number>();

  if (supply <= 0) {
    return concentration;
  }

  for (const order of orders) {
    if (!order.active || order.resource !== resource || order.orderType !== "sell") {
      continue;
    }

    const current = concentration.get(order.empireId) ?? 0;
    concentration.set(order.empireId, current + order.quantity);
  }

  // Convert to percentages
  concentration.forEach((quantity, empireId) => {
    concentration.set(empireId, quantity / supply);
  });

  return concentration;
}

/**
 * Check if an empire is hoarding a resource (>40% of supply per PRD 11.4).
 *
 * @param orders - All orders
 * @param empireId - Empire to check
 * @param resource - Resource to check
 * @returns True if empire controls >40% of supply
 */
export function isHoarding(
  orders: MarketOrder[],
  empireId: string,
  resource: ResourceType
): boolean {
  const concentration = calculateMarketConcentration(orders, resource);
  const empireShare = concentration.get(empireId) ?? 0;
  return empireShare > 0.4; // 40% threshold from PRD 11.4
}

/**
 * Match buy and sell orders for a resource.
 * Returns pairs of orders that can be matched based on price limits.
 *
 * @param orders - All orders
 * @param resource - Resource to match
 * @returns Array of matched order pairs [buyOrder, sellOrder, quantity]
 */
export function matchOrders(
  orders: MarketOrder[],
  resource: ResourceType
): Array<[MarketOrder, MarketOrder, number]> {
  const buyOrders = orders
    .filter((o) => o.active && o.resource === resource && o.orderType === "buy")
    .sort((a, b) => {
      // Higher price limit first (more eager buyers)
      const aLimit = a.priceLimit ?? Infinity;
      const bLimit = b.priceLimit ?? Infinity;
      return bLimit - aLimit;
    });

  const sellOrders = orders
    .filter((o) => o.active && o.resource === resource && o.orderType === "sell")
    .sort((a, b) => {
      // Lower price limit first (more eager sellers)
      const aLimit = a.priceLimit ?? 0;
      const bLimit = b.priceLimit ?? 0;
      return aLimit - bLimit;
    });

  const matches: Array<[MarketOrder, MarketOrder, number]> = [];

  // Track remaining quantities
  const buyRemaining = new Map<string, number>();
  const sellRemaining = new Map<string, number>();

  for (const buy of buyOrders) {
    buyRemaining.set(buy.id, buy.quantity);
  }
  for (const sell of sellOrders) {
    sellRemaining.set(sell.id, sell.quantity);
  }

  // Match orders
  for (const buy of buyOrders) {
    const buyLimit = buy.priceLimit ?? Infinity;

    for (const sell of sellOrders) {
      const sellLimit = sell.priceLimit ?? 0;

      // Check price compatibility
      if (buyLimit < sellLimit) {
        continue; // Buyer's max is below seller's min
      }

      const buyQty = buyRemaining.get(buy.id) ?? 0;
      const sellQty = sellRemaining.get(sell.id) ?? 0;

      if (buyQty <= 0 || sellQty <= 0) {
        continue;
      }

      const matchQty = Math.min(buyQty, sellQty);
      matches.push([buy, sell, matchQty]);

      buyRemaining.set(buy.id, buyQty - matchQty);
      sellRemaining.set(sell.id, sellQty - matchQty);
    }
  }

  return matches;
}
