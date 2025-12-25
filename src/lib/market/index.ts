/**
 * Market Module
 *
 * Exports all market-related functionality including:
 * - Dynamic pricing based on supply/demand (PRD 4.x)
 * - Supply/demand tracking and order management
 * - Market manipulation detection (PRD 11.4)
 */

// Pricing functions and constants
export {
  type ResourceType,
  type MarketPriceResult,
  BASE_PRICES,
  PRICE_MULTIPLIER_MIN,
  PRICE_MULTIPLIER_MAX,
  PRICE_MULTIPLIER_DEFAULT,
  SUPPLY_DEMAND_RATIO_MIN,
  SUPPLY_DEMAND_RATIO_MAX,
  SUPPLY_DEMAND_RATIO_BALANCED,
  calculatePriceMultiplier,
  calculateMarketPrice,
  getMarketPrice,
  getBasePrice,
  calculateBuyCost,
  calculateSellRevenue,
  calculateAffordableQuantity,
  isMarketShortage,
  isMarketSurplus,
  getAllMarketPrices,
} from "./pricing";

// Supply/demand tracking
export {
  type OrderType,
  type MarketOrder,
  type SupplyDemandState,
  type MarketState,
  ORDER_STALENESS_TURNS,
  MIN_ORDER_QUANTITY,
  DEFAULT_SUPPLY_DEMAND,
  calculateSupplyDemand,
  updateSupplyDemand,
  getResourceSupplyDemand,
  createMarketOrder,
  cancelOrder,
  fillOrder,
  isOrderStale,
  getStaleOrders,
  getEmpireOrders,
  calculateNetPosition,
  calculateMarketConcentration,
  isHoarding,
  matchOrders,
} from "./supply-demand";
