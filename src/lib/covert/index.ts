/**
 * Covert Operations Module
 *
 * Exports all covert operation functionality including:
 * - Operation definitions and constants (PRD 6.8)
 * - Success rate calculations
 * - Operation execution
 */

// Constants and definitions
export {
  type RiskLevel,
  type OperationType,
  type CovertOperation,
  COVERT_OPERATIONS,
  COVERT_POINTS_PER_TURN,
  MAX_COVERT_POINTS,
  AGENT_CAPACITY_PER_GOV_PLANET,
  SUCCESS_RATE_VARIANCE,
  RISK_DETECTION_MULTIPLIER,
  RISK_SUCCESS_MODIFIER,
  LOW_RISK_OPERATIONS,
  MEDIUM_RISK_OPERATIONS,
  HIGH_RISK_OPERATIONS,
  VERY_HIGH_RISK_OPERATIONS,
  OPERATIONS_BY_COST,
  getOperation,
  canAffordOperation,
  hasEnoughAgents,
  calculateAgentCapacity,
  calculatePointsAfterTurn,
  getAffordableOperations,
  getOperationsByRisk,
} from "./constants";

// Success rate calculation
export {
  type SuccessRateFactors,
  type OperationOutcome,
  calculateAgentRatioModifier,
  calculateGovernmentModifier,
  calculateSuccessRateFactors,
  applyVariance,
  calculateDetectionRate,
  executeOperation,
  previewOperation,
} from "./success-rate";

// Operation execution and effects
export {
  type CovertTargetState,
  type CovertAttackerState,
  type OperationEffect,
  type OperationResult,
  type SuccessResult,
  calculateCovertSuccess,
  executeCovertOp,
  previewCovertOp,
  getExecutableOperations,
  previewAllOperations,
} from "./operations";
