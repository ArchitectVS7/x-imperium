"use client";

/**
 * Contextual Panel Component (M9.3)
 *
 * Wrapper that shows/hides panels based on turn progression.
 * Implements progressive disclosure to avoid overwhelming new players.
 */

import { type ReactNode } from "react";
import { isPanelVisible, getUIVisibilityLevel } from "@/lib/tutorial/types";

// =============================================================================
// PROPS
// =============================================================================

interface ContextualPanelProps {
  /** Panel identifier matching UI_PANELS_BY_LEVEL keys */
  panelId: string;
  /** Current game turn */
  turn: number;
  /** Panel content */
  children: ReactNode;
  /** Whether to show a "coming soon" placeholder instead of hiding */
  showPlaceholder?: boolean;
  /** Placeholder text when panel is not yet available */
  placeholderText?: string;
  /** Override visibility (for testing or manual control) */
  forceVisible?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ContextualPanel({
  panelId,
  turn,
  children,
  showPlaceholder = false,
  placeholderText,
  forceVisible,
}: ContextualPanelProps) {
  const isVisible = forceVisible ?? isPanelVisible(panelId, turn);

  if (isVisible) {
    return <>{children}</>;
  }

  if (showPlaceholder) {
    const level = getUIVisibilityLevel(turn);
    const defaultPlaceholder = getPlaceholderText(panelId, level, turn);

    return (
      <div
        className="p-4 rounded border border-dashed border-gray-700 bg-gray-900/50"
        data-testid={`contextual-placeholder-${panelId}`}
      >
        <div className="text-center text-gray-500 text-sm">
          <div className="mb-1">🔒</div>
          <div>{placeholderText ?? defaultPlaceholder}</div>
        </div>
      </div>
    );
  }

  // Don't render anything
  return null;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate default placeholder text based on panel and level.
 */
function getPlaceholderText(
  panelId: string,
  _level: string,
  turn: number
): string {
  const unlockTurns: Record<string, number> = {
    "threat-panel": 11,
    "diplomacy-basic": 11,
    "message-inbox": 11,
    "galaxy-view": 21,
    "wormhole-panel": 21,
    "alliance-panel": 21,
    "research-panel": 21,
    "covert-panel": 51,
    "market-panel": 51,
    "coalition-panel": 51,
    "crafting-panel": 51,
    "syndicate-panel": 51,
  };

  const unlockTurn = unlockTurns[panelId];
  if (unlockTurn) {
    const turnsRemaining = unlockTurn - turn;
    if (turnsRemaining > 0) {
      return `Unlocks in ${turnsRemaining} turn${turnsRemaining !== 1 ? "s" : ""}`;
    }
  }

  return "Coming soon...";
}

/**
 * Hook to check if multiple panels are visible.
 */
export function usePanelVisibility(
  panelIds: string[],
  turn: number
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const id of panelIds) {
    result[id] = isPanelVisible(id, turn);
  }
  return result;
}

export default ContextualPanel;
