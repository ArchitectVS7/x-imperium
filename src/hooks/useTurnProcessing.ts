/**
 * useTurnProcessing Hook
 *
 * Handles the turn processing flow including:
 * - Calling the end turn action
 * - Managing processing state
 * - Handling success/error results
 * - Refreshing layout data after turn
 *
 * Extracted from GameShell for better separation of concerns.
 */

import { useState, useCallback } from "react";
import {
  endTurnEnhancedAction,
  getGameLayoutDataAction,
  type GameLayoutData,
} from "@/app/actions/turn-actions";
import type { TurnEvent, ResourceDelta, DefeatAnalysis } from "@/lib/game/types/turn-types";

/** Result of a processed turn */
export interface TurnProcessingResult {
  turn: number;
  processingMs: number;
  resourceChanges: ResourceDelta;
  populationBefore: number;
  populationAfter: number;
  events: TurnEvent[];
  messagesReceived: number;
  botBattles: number;
  empiresEliminated: string[];
  victoryResult?: { type: string; message: string };
}

export interface UseTurnProcessingOptions {
  /** Callback when turn succeeds */
  onSuccess?: (result: TurnProcessingResult) => void;
  /** Callback when turn fails */
  onError?: (error: string) => void;
  /** Callback when defeat is detected */
  onDefeat?: (analysis: DefeatAnalysis) => void;
  /** Layout data setter for refresh */
  setLayoutData?: (data: GameLayoutData | null) => void;
}

export interface UseTurnProcessingReturn {
  /** Whether a turn is currently being processed */
  isProcessing: boolean;
  /** Process the end of turn */
  processTurn: () => Promise<TurnProcessingResult | null>;
  /** Refresh layout data from server */
  refreshLayoutData: () => Promise<void>;
}

/**
 * Hook for managing turn processing state and actions.
 *
 * @example
 * ```tsx
 * const { isProcessing, processTurn } = useTurnProcessing({
 *   onSuccess: (result) => setTurnResult(result),
 *   onError: (error) => showToast(error, "error"),
 *   setLayoutData,
 * });
 *
 * // In button onClick:
 * <button onClick={processTurn} disabled={isProcessing}>
 *   End Turn
 * </button>
 * ```
 */
export function useTurnProcessing(
  options: UseTurnProcessingOptions = {}
): UseTurnProcessingReturn {
  const { onSuccess, onError, onDefeat, setLayoutData } = options;

  const [isProcessing, setIsProcessing] = useState(false);

  const refreshLayoutData = useCallback(async () => {
    const data = await getGameLayoutDataAction();
    if (data && setLayoutData) {
      setLayoutData(data);
    }
  }, [setLayoutData]);

  const processTurn = useCallback(async (): Promise<TurnProcessingResult | null> => {
    if (isProcessing) return null;

    setIsProcessing(true);

    try {
      const result = await endTurnEnhancedAction();

      if (result.success) {
        const turnResult: TurnProcessingResult = {
          turn: result.turn,
          processingMs: result.processingMs,
          resourceChanges: result.resourceChanges,
          populationBefore: result.populationBefore,
          populationAfter: result.populationAfter,
          events: result.events,
          messagesReceived: result.messagesReceived,
          botBattles: result.botBattles,
          empiresEliminated: result.empiresEliminated,
          victoryResult: result.victoryResult,
        };

        onSuccess?.(turnResult);

        // Handle defeat analysis if present
        if (result.defeatAnalysis && onDefeat) {
          onDefeat({
            cause: result.defeatAnalysis.cause as DefeatAnalysis["cause"],
            finalTurn: result.defeatAnalysis.finalTurn,
            turnsPlayed: result.defeatAnalysis.turnsPlayed,
            finalCredits: result.defeatAnalysis.finalCredits,
            finalSectors: result.defeatAnalysis.finalSectors,
            finalPopulation: result.defeatAnalysis.finalPopulation,
            factors: result.defeatAnalysis.factors.map((f) => ({
              type: f.type as DefeatAnalysis["factors"][0]["type"],
              description: f.description,
              severity: f.severity as DefeatAnalysis["factors"][0]["severity"],
            })),
          });
        }

        // Refresh layout data after turn
        await refreshLayoutData();

        return turnResult;
      } else {
        onError?.(result.error ?? "Turn processing failed");
        return null;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      onError?.(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onSuccess, onError, onDefeat, refreshLayoutData]);

  return {
    isProcessing,
    processTurn,
    refreshLayoutData,
  };
}
