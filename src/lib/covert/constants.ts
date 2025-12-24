/**
 * Covert Operations Constants (PRD 6.8)
 *
 * Defines all covert operations, their costs, risks, and effects.
 * Covert agents enable asymmetric warfare through espionage and sabotage.
 */

// =============================================================================
// TYPES
// =============================================================================

export type RiskLevel = "low" | "medium" | "high" | "very_high";

export type OperationType =
  | "send_spy"
  | "insurgent_aid"
  | "support_dissension"
  | "demoralize_troops"
  | "bombing_operations"
  | "relations_spying"
  | "take_hostages"
  | "carriers_sabotage"
  | "communications_spying"
  | "setup_coup";

export interface CovertOperation {
  /** Unique operation identifier */
  id: OperationType;
  /** Display name */
  name: string;
  /** Covert points cost to execute */
  cost: number;
  /** Risk level (affects detection chance) */
  risk: RiskLevel;
  /** Short description of effect */
  description: string;
  /** Detailed effect description */
  effect: string;
  /** Base success rate (0-1) before modifiers */
  baseSuccessRate: number;
  /** Minimum agents required to attempt */
  minAgents: number;
}

// =============================================================================
// COVERT SYSTEM CONSTANTS (PRD 6.8)
// =============================================================================

/** Covert points earned per turn */
export const COVERT_POINTS_PER_TURN = 5;

/** Maximum covert points that can be accumulated */
export const MAX_COVERT_POINTS = 50;

/** Agent capacity per Government planet */
export const AGENT_CAPACITY_PER_GOV_PLANET = 300;

/** Base variance for success rate calculations (±20% as per PRD) */
export const SUCCESS_RATE_VARIANCE = 0.2;

// =============================================================================
// RISK LEVEL MODIFIERS
// =============================================================================

/**
 * Detection chance multiplier by risk level.
 * Higher risk = higher chance of agent being caught.
 */
export const RISK_DETECTION_MULTIPLIER: Record<RiskLevel, number> = {
  low: 0.1,
  medium: 0.25,
  high: 0.4,
  very_high: 0.6,
} as const;

/**
 * Success rate modifier by risk level.
 * Higher risk operations are harder to pull off.
 */
export const RISK_SUCCESS_MODIFIER: Record<RiskLevel, number> = {
  low: 1.0,
  medium: 0.85,
  high: 0.7,
  very_high: 0.5,
} as const;

// =============================================================================
// COVERT OPERATIONS (PRD 6.8)
// =============================================================================

/**
 * All 10 covert operations as defined in PRD 6.8.
 *
 * | Operation | Effect | Cost | Risk |
 * |-----------|--------|------|------|
 * | Send Spy | Reveal enemy stats and composition | Low | Low |
 * | Insurgent Aid | Support rebels, reduce civil status | Medium | Medium |
 * | Support Dissension | Worsen target's civil status | Medium | Medium |
 * | Demoralize Troops | Reduce army effectiveness | Medium | Medium |
 * | Bombing Operations | Destroy resources/production | High | High |
 * | Relations Spying | Reveal diplomacy and alliances | Low | Low |
 * | Take Hostages | Demand ransom payment | High | High |
 * | Carriers Sabotage | Damage carrier fleet | Very High | Very High |
 * | Communications Spying | Intercept messages | Medium | Low |
 * | Setup Coup | Attempt to overthrow government | Very High | Very High |
 */
export const COVERT_OPERATIONS: Record<OperationType, CovertOperation> = {
  send_spy: {
    id: "send_spy",
    name: "Send Spy",
    cost: 5,
    risk: "low",
    description: "Reveal enemy stats and composition",
    effect: "Reveals target empire's military composition, resources, and planet count for 5 turns",
    baseSuccessRate: 0.8,
    minAgents: 1,
  },

  insurgent_aid: {
    id: "insurgent_aid",
    name: "Insurgent Aid",
    cost: 15,
    risk: "medium",
    description: "Support rebels in enemy territory",
    effect: "Reduces target's civil status by 1 level and causes minor population unrest",
    baseSuccessRate: 0.65,
    minAgents: 5,
  },

  support_dissension: {
    id: "support_dissension",
    name: "Support Dissension",
    cost: 12,
    risk: "medium",
    description: "Worsen target's civil status",
    effect: "Reduces target's civil status by 1 level through propaganda and agitation",
    baseSuccessRate: 0.7,
    minAgents: 3,
  },

  demoralize_troops: {
    id: "demoralize_troops",
    name: "Demoralize Troops",
    cost: 10,
    risk: "medium",
    description: "Reduce army effectiveness",
    effect: "Reduces target's army effectiveness by 10-15% for 3 turns",
    baseSuccessRate: 0.7,
    minAgents: 3,
  },

  bombing_operations: {
    id: "bombing_operations",
    name: "Bombing Operations",
    cost: 25,
    risk: "high",
    description: "Destroy resources and production",
    effect: "Destroys 10-20% of target's stored resources and damages 1-2 planets' production",
    baseSuccessRate: 0.55,
    minAgents: 10,
  },

  relations_spying: {
    id: "relations_spying",
    name: "Relations Spying",
    cost: 8,
    risk: "low",
    description: "Reveal diplomacy and alliances",
    effect: "Reveals all of target's treaties, alliances, and diplomatic relationships",
    baseSuccessRate: 0.85,
    minAgents: 2,
  },

  take_hostages: {
    id: "take_hostages",
    name: "Take Hostages",
    cost: 30,
    risk: "high",
    description: "Demand ransom payment",
    effect: "Captures VIPs and demands ransom. Success yields 50,000-100,000 credits",
    baseSuccessRate: 0.45,
    minAgents: 15,
  },

  carriers_sabotage: {
    id: "carriers_sabotage",
    name: "Carriers Sabotage",
    cost: 40,
    risk: "very_high",
    description: "Damage carrier fleet",
    effect: "Destroys 10-25% of target's carrier fleet through sabotage",
    baseSuccessRate: 0.35,
    minAgents: 20,
  },

  communications_spying: {
    id: "communications_spying",
    name: "Communications Spying",
    cost: 10,
    risk: "low",
    description: "Intercept enemy messages",
    effect: "Intercepts target's incoming and outgoing messages for 10 turns",
    baseSuccessRate: 0.75,
    minAgents: 2,
  },

  setup_coup: {
    id: "setup_coup",
    name: "Setup Coup",
    cost: 50,
    risk: "very_high",
    description: "Attempt to overthrow government",
    effect: "Attempts to trigger civil collapse. If successful, target loses 30% of planets",
    baseSuccessRate: 0.2,
    minAgents: 50,
  },
} as const;

// =============================================================================
// OPERATION LISTS BY CATEGORY
// =============================================================================

/** Low-risk operations suitable for early game */
export const LOW_RISK_OPERATIONS: OperationType[] = [
  "send_spy",
  "relations_spying",
  "communications_spying",
];

/** Medium-risk operations for mid game */
export const MEDIUM_RISK_OPERATIONS: OperationType[] = [
  "insurgent_aid",
  "support_dissension",
  "demoralize_troops",
];

/** High-risk operations requiring significant resources */
export const HIGH_RISK_OPERATIONS: OperationType[] = [
  "bombing_operations",
  "take_hostages",
];

/** Very high-risk operations with potentially game-changing effects */
export const VERY_HIGH_RISK_OPERATIONS: OperationType[] = [
  "carriers_sabotage",
  "setup_coup",
];

/** All operation types in order of cost */
export const OPERATIONS_BY_COST: OperationType[] = Object.values(COVERT_OPERATIONS)
  .sort((a, b) => a.cost - b.cost)
  .map(op => op.id);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get operation by ID.
 */
export function getOperation(id: OperationType): CovertOperation {
  return COVERT_OPERATIONS[id];
}

/**
 * Check if player has enough covert points for an operation.
 */
export function canAffordOperation(
  operationId: OperationType,
  currentPoints: number
): boolean {
  return currentPoints >= COVERT_OPERATIONS[operationId].cost;
}

/**
 * Check if player has enough agents for an operation.
 */
export function hasEnoughAgents(
  operationId: OperationType,
  agentCount: number
): boolean {
  return agentCount >= COVERT_OPERATIONS[operationId].minAgents;
}

/**
 * Calculate agent capacity from government planet count.
 */
export function calculateAgentCapacity(governmentPlanets: number): number {
  return governmentPlanets * AGENT_CAPACITY_PER_GOV_PLANET;
}

/**
 * Calculate covert points after a turn (capped at max).
 */
export function calculatePointsAfterTurn(currentPoints: number): number {
  return Math.min(MAX_COVERT_POINTS, currentPoints + COVERT_POINTS_PER_TURN);
}

/**
 * Get all operations a player can currently afford.
 */
export function getAffordableOperations(currentPoints: number): CovertOperation[] {
  return Object.values(COVERT_OPERATIONS).filter(op => op.cost <= currentPoints);
}

/**
 * Get operations by risk level.
 */
export function getOperationsByRisk(risk: RiskLevel): CovertOperation[] {
  return Object.values(COVERT_OPERATIONS).filter(op => op.risk === risk);
}
