"use server";

/**
 * Covert Operations Server Actions (M6.5)
 *
 * Server actions for covert operations with:
 * - Cookie-based session management
 * - Input validation at the boundary
 * - Proper error handling and logging
 */

import { revalidatePath } from "next/cache";
import {
  executeCovertOperation,
  previewCovertOperation,
  getCovertStatus,
  getCovertTargets,
  getCovertTargetsWithPreviews,
  type CovertStatus,
  type CovertTarget,
  type CovertOperationResult,
} from "@/lib/game/services/covert";
import {
  type OperationType,
  COVERT_OPERATIONS,
} from "@/lib/covert/constants";
import { getGameSession } from "@/lib/session";

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate UUID format at the action boundary.
 */
function isValidUUID(id: string): boolean {
  if (typeof id !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate operation type.
 */
function isValidOperationType(type: unknown): type is OperationType {
  if (typeof type !== "string") return false;
  return type in COVERT_OPERATIONS;
}

// =============================================================================
// STATUS ACTIONS
// =============================================================================

/**
 * Get player's covert status (points, agents, capacity).
 */
export async function getCovertStatusAction(): Promise<{
  success: boolean;
  status?: CovertStatus;
  error?: string;
}> {
  try {
    const { empireId } = await getGameSession();

    if (!empireId) {
      return { success: false, error: "No active game session" };
    }

    const status = await getCovertStatus(empireId);

    if (!status) {
      return { success: false, error: "Empire not found" };
    }

    return { success: true, status };
  } catch (error) {
    console.error("Failed to get covert status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get status",
    };
  }
}

// =============================================================================
// TARGET ACTIONS
// =============================================================================

/**
 * Get available targets for covert operations.
 */
export async function getCovertTargetsAction(): Promise<{
  success: boolean;
  targets?: CovertTarget[];
  error?: string;
}> {
  try {
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    const targets = await getCovertTargets(gameId, empireId);

    return { success: true, targets };
  } catch (error) {
    console.error("Failed to get covert targets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get targets",
    };
  }
}

/**
 * Get targets with operation success rate previews.
 */
export async function getCovertTargetsWithPreviewsAction(): Promise<{
  success: boolean;
  targets?: CovertTarget[];
  error?: string;
}> {
  try {
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    const targets = await getCovertTargetsWithPreviews(gameId, empireId);

    return { success: true, targets };
  } catch (error) {
    console.error("Failed to get covert targets with previews:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get targets",
    };
  }
}

// =============================================================================
// OPERATION ACTIONS
// =============================================================================

/**
 * Execute a covert operation against a target.
 */
export async function executeCovertOpAction(
  targetId: string,
  operationType: OperationType
): Promise<{
  success: boolean;
  result?: CovertOperationResult;
  error?: string;
}> {
  try {
    const { empireId } = await getGameSession();

    if (!empireId) {
      return { success: false, error: "No active game session" };
    }

    // Validate inputs
    if (!isValidUUID(targetId)) {
      return { success: false, error: "Invalid target ID" };
    }

    if (!isValidOperationType(operationType)) {
      return { success: false, error: "Invalid operation type" };
    }

    // Execute operation
    const result = await executeCovertOperation(
      empireId,
      targetId,
      operationType
    );

    // Revalidate game pages
    revalidatePath("/game");
    revalidatePath("/game/covert");

    return { success: true, result };
  } catch (error) {
    console.error("Failed to execute covert operation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Operation failed",
    };
  }
}

/**
 * Preview a covert operation (success rates, effects).
 */
export async function previewCovertOpAction(
  targetId: string,
  operationType: OperationType
): Promise<{
  success: boolean;
  preview?: {
    operation: { id: string; name: string; cost: number };
    canExecute: boolean;
    cannotExecuteReason?: string;
    successChance: number;
    catchChance: number;
    potentialEffects: string[];
  };
  error?: string;
}> {
  try {
    const { empireId } = await getGameSession();

    if (!empireId) {
      return { success: false, error: "No active game session" };
    }

    // Validate inputs
    if (!isValidUUID(targetId)) {
      return { success: false, error: "Invalid target ID" };
    }

    if (!isValidOperationType(operationType)) {
      return { success: false, error: "Invalid operation type" };
    }

    const preview = await previewCovertOperation(
      empireId,
      targetId,
      operationType
    );

    return {
      success: true,
      preview: {
        operation: {
          id: preview.operation.id,
          name: preview.operation.name,
          cost: preview.operation.cost,
        },
        canExecute: preview.canExecute,
        cannotExecuteReason: preview.cannotExecuteReason,
        successChance: preview.successChance,
        catchChance: preview.catchChance,
        potentialEffects: preview.potentialEffects,
      },
    };
  } catch (error) {
    console.error("Failed to preview covert operation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Preview failed",
    };
  }
}

// =============================================================================
// OPERATION LIST
// =============================================================================

/**
 * Get all available covert operations with their details.
 */
export async function getCovertOperationsAction(): Promise<{
  success: boolean;
  operations?: Array<{
    id: OperationType;
    name: string;
    description: string;
    cost: number;
    minAgents: number;
    risk: string;
    baseSuccessRate: number;
  }>;
  error?: string;
}> {
  try {
    const operations = Object.values(COVERT_OPERATIONS).map((op) => ({
      id: op.id,
      name: op.name,
      description: op.description,
      cost: op.cost,
      minAgents: op.minAgents,
      risk: op.risk,
      baseSuccessRate: op.baseSuccessRate,
    }));

    return { success: true, operations };
  } catch (error) {
    console.error("Failed to get covert operations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get operations",
    };
  }
}
