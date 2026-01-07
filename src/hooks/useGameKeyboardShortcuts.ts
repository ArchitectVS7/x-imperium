/**
 * Game Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcuts for starmap-centric gameplay:
 * - M: Open military panel
 * - S: Open sectors panel
 * - C: Open combat panel
 * - T: Open market/trade panel
 * - R: Open research panel
 * - D: Open diplomacy panel
 * - O: Open covert ops panel
 * - I: Open messages/inbox panel
 * - Escape: Close current panel
 * - Space: End turn (when no panel open)
 */

import { useEffect, useCallback } from "react";
import type { PanelType } from "@/components/game/EmpireStatusBar";

interface UseGameKeyboardShortcutsOptions {
  /** Callback to open a panel */
  onOpenPanel: (panel: PanelType) => void;
  /** Callback to close any open panel */
  onClosePanel: () => void;
  /** Currently active panel */
  activePanel: PanelType;
  /** Callback for end turn action */
  onEndTurn?: () => void;
  /** Whether turn is currently processing */
  isProcessing?: boolean;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

const PANEL_SHORTCUTS: Record<string, PanelType> = {
  m: "military",
  s: "sectors", // sectors
  c: "combat",
  t: "market", // trade
  r: "research",
  d: "diplomacy",
  o: "covert", // ops
  i: "messages", // inbox
};

export function useGameKeyboardShortcuts({
  onOpenPanel,
  onClosePanel,
  activePanel,
  onEndTurn,
  isProcessing = false,
  enabled = true,
}: UseGameKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Escape: Close panel
      if (event.key === "Escape") {
        if (activePanel) {
          event.preventDefault();
          onClosePanel();
        }
        return;
      }

      // Space: End turn (only when no panel is open)
      if (event.key === " " && !activePanel && onEndTurn && !isProcessing) {
        event.preventDefault();
        onEndTurn();
        return;
      }

      // Panel shortcuts (only when not in a panel or to switch panels)
      const key = event.key.toLowerCase();
      const panelType = PANEL_SHORTCUTS[key];

      if (panelType) {
        event.preventDefault();
        if (activePanel === panelType) {
          // Toggle off if same panel
          onClosePanel();
        } else {
          onOpenPanel(panelType);
        }
      }
    },
    [activePanel, onClosePanel, onEndTurn, onOpenPanel, isProcessing]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

export default useGameKeyboardShortcuts;
