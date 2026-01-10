"use client";

import { useState, useCallback } from "react";
import type { PanelType } from "../EmpireStatusBar";
import type { PanelContextData } from "@/contexts/PanelContext";

export interface UsePanelStateOptions {
  /** Function to check if a panel is locked (progressive disclosure). */
  isPanelLocked: (panel: NonNullable<PanelType>) => boolean;
  /** Function to get the turn when a panel unlocks. */
  getUnlockTurn: (panel: PanelType) => number | null;
  /** Function to show a toast notification. */
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

/**
 * Hook for managing panel state including active panel and panel context.
 *
 * Handles panel toggling with progressive disclosure integration,
 * preventing access to locked panels and showing unlock information.
 */
export function usePanelState({
  isPanelLocked,
  getUnlockTurn,
  showToast,
}: UsePanelStateOptions) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [panelContext, setPanelContext] = useState<PanelContextData | null>(null);

  /**
   * Toggle a panel open/closed.
   */
  const handlePanelToggle = useCallback((panel: PanelType, context?: PanelContextData) => {
    setActivePanel(panel);
    setPanelContext(context ?? null);
  }, []);

  /**
   * Close the active panel.
   */
  const handlePanelClose = useCallback(() => {
    setActivePanel(null);
    setPanelContext(null);
  }, []);

  /**
   * Toggle a panel with progressive disclosure lock check.
   * Shows a toast if the panel is locked.
   */
  const handlePanelToggleWithLock = useCallback(
    (panel: PanelType, context?: PanelContextData) => {
      if (panel && isPanelLocked(panel)) {
        const unlockTurn = getUnlockTurn(panel);
        showToast(`This feature unlocks at turn ${unlockTurn ?? "?"}`, "error");
        return;
      }
      handlePanelToggle(panel, context);
    },
    [isPanelLocked, getUnlockTurn, showToast, handlePanelToggle]
  );

  return {
    activePanel,
    panelContext,
    handlePanelToggle,
    handlePanelClose,
    handlePanelToggleWithLock,
  };
}
