"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GameLayoutData } from "@/app/actions/turn-actions";
import type { TurnProcessingResult } from "@/hooks/useTurnProcessing";

export interface UseWelcomeModalOptions {
  /** Current layout data (null if not loaded). */
  layoutData: GameLayoutData | null;
  /** Whether the tutorial has been completed. */
  tutorialCompleted: boolean;
  /** Callback to set the turn result for the modal. */
  setTurnResult: (result: TurnProcessingResult) => void;
  /** Callback to show the modal. */
  setShowModal: (show: boolean) => void;
}

/**
 * Hook for managing the welcome modal display logic.
 *
 * Shows the welcome modal on turn 1 after the tutorial completes,
 * but only once per component mount.
 */
export function useWelcomeModal({
  layoutData,
  tutorialCompleted,
  setTurnResult,
  setShowModal,
}: UseWelcomeModalOptions) {
  // Track if we've shown the initial welcome modal
  const hasShownWelcomeModal = useRef(false);

  useEffect(() => {
    // Only show welcome modal once per component mount, for turn 1,
    // AND after tutorial is completed
    if (
      layoutData &&
      layoutData.currentTurn === 1 &&
      !hasShownWelcomeModal.current &&
      tutorialCompleted
    ) {
      hasShownWelcomeModal.current = true;

      // Show immediately - no delay needed
      setTurnResult({
        turn: 1,
        processingMs: 0,
        resourceChanges: {
          credits: layoutData.credits,
          food: layoutData.food,
          ore: layoutData.ore,
          petroleum: layoutData.petroleum,
          researchPoints: layoutData.researchPoints,
        },
        populationBefore: 0,
        populationAfter: layoutData.population,
        events: [
          {
            type: "other" as const,
            severity: "info" as const,
            message: "Welcome to Nexus Dominion! Your empire begins with starting resources and population.",
          },
          {
            type: "other" as const,
            severity: "info" as const,
            message: `You have ${layoutData.protectionTurnsLeft} turns of protection from attacks.`,
          },
        ],
        messagesReceived: 0,
        botBattles: 0,
        empiresEliminated: [],
      });
      setShowModal(true);
    }
  }, [layoutData, tutorialCompleted, setTurnResult, setShowModal]);

  /**
   * Reset the welcome modal state (for testing or re-showing).
   */
  const resetWelcomeModalState = useCallback(() => {
    hasShownWelcomeModal.current = false;
  }, []);

  return {
    hasShownWelcomeModal: hasShownWelcomeModal.current,
    resetWelcomeModalState,
  };
}
