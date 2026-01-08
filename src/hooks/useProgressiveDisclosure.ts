/**
 * Progressive UI Disclosure Hook
 *
 * Manages UI visibility based on turn progression.
 * Features unlock gradually to avoid overwhelming new players.
 */

import { useMemo, useEffect, useRef } from "react";
import {
  getUIVisibilityLevel,
  isPanelVisible,
  UI_VISIBILITY_THRESHOLDS,
  type UIVisibilityLevel,
} from "@/lib/tutorial/types";
import type { PanelType } from "@/components/game/EmpireStatusBar";

// Map panel types to their visibility panel IDs
const PANEL_VISIBILITY_MAP: Record<NonNullable<PanelType>, string> = {
  resources: "resource-panel",
  military: "military-overview",
  sectors: "sector-list",
  population: "resource-panel", // Part of resources
  combat: "military-overview", // Part of military
  market: "market-panel",
  research: "research-panel",
  diplomacy: "diplomacy-basic",
  covert: "covert-panel",
  messages: "message-inbox",
};

// Features unlocked at each level
const LEVEL_UNLOCKS: Record<UIVisibilityLevel, string[]> = {
  basic: [],
  intermediate: ["Diplomacy", "Messages"],
  advanced: ["Research", "Galaxy Map", "Wormholes"],
  full: ["Covert Operations", "Market Trading", "Crafting"],
};

export interface UseProgressiveDisclosureOptions {
  currentTurn: number;
  onUnlock?: (features: string[]) => void;
  enabled?: boolean;
}

export interface UseProgressiveDisclosureReturn {
  /** Current UI visibility level */
  level: UIVisibilityLevel;
  /** Check if a panel is visible */
  isPanelEnabled: (panel: PanelType) => boolean;
  /** Check if a panel is locked (exists but not yet available) */
  isPanelLocked: (panel: PanelType) => boolean;
  /** Get unlock turn for a locked panel */
  getUnlockTurn: (panel: PanelType) => number | null;
  /** List of all visible panels */
  visiblePanels: PanelType[];
  /** List of locked panels */
  lockedPanels: PanelType[];
  /** Features that were just unlocked */
  newlyUnlocked: string[];
}

export function useProgressiveDisclosure({
  currentTurn,
  onUnlock,
  enabled = true,
}: UseProgressiveDisclosureOptions): UseProgressiveDisclosureReturn {
  const previousLevel = useRef<UIVisibilityLevel | null>(null);

  // Calculate current visibility level
  const level = useMemo(() => {
    if (!enabled) return "full" as UIVisibilityLevel;
    return getUIVisibilityLevel(currentTurn);
  }, [currentTurn, enabled]);

  // Track newly unlocked features
  const newlyUnlocked = useMemo(() => {
    if (previousLevel.current === null || previousLevel.current === level) {
      return [];
    }
    return LEVEL_UNLOCKS[level];
  }, [level]);

  // Call onUnlock callback when features are unlocked
  useEffect(() => {
    if (newlyUnlocked.length > 0 && onUnlock) {
      onUnlock(newlyUnlocked);
    }
    previousLevel.current = level;
  }, [level, newlyUnlocked, onUnlock]);

  // Check if a panel is enabled
  const isPanelEnabled = useMemo(() => {
    return (panel: PanelType): boolean => {
      if (!enabled || panel === null) return true;
      const panelId = PANEL_VISIBILITY_MAP[panel];
      if (!panelId) return true; // Unknown panels are always visible
      return isPanelVisible(panelId, currentTurn);
    };
  }, [currentTurn, enabled]);

  // Check if a panel is locked
  const isPanelLocked = useMemo(() => {
    return (panel: PanelType): boolean => {
      if (!enabled || panel === null) return false;
      const panelId = PANEL_VISIBILITY_MAP[panel];
      if (!panelId) return false;
      // Panel exists but not visible at current turn
      return !isPanelVisible(panelId, currentTurn);
    };
  }, [currentTurn, enabled]);

  // Get unlock turn for a locked panel
  const getUnlockTurn = useMemo(() => {
    return (panel: PanelType): number | null => {
      if (panel === null) return null;
      const panelId = PANEL_VISIBILITY_MAP[panel];
      if (!panelId) return null;

      // Find which level unlocks this panel
      const levels: UIVisibilityLevel[] = ["basic", "intermediate", "advanced", "full"];
      for (const lvl of levels) {
        const { minTurn } = UI_VISIBILITY_THRESHOLDS[lvl];
        if (isPanelVisible(panelId, minTurn)) {
          return minTurn;
        }
      }
      return null;
    };
  }, []);

  // List visible panels
  const visiblePanels = useMemo(() => {
    const allPanels: PanelType[] = [
      "resources", "military", "sectors", "population", "combat",
      "market", "research", "diplomacy", "covert", "messages"
    ];
    return allPanels.filter(p => isPanelEnabled(p));
  }, [isPanelEnabled]);

  // List locked panels
  const lockedPanels = useMemo(() => {
    const allPanels: PanelType[] = [
      "resources", "military", "sectors", "population", "combat",
      "market", "research", "diplomacy", "covert", "messages"
    ];
    return allPanels.filter(p => isPanelLocked(p));
  }, [isPanelLocked]);

  return {
    level,
    isPanelEnabled,
    isPanelLocked,
    getUnlockTurn,
    visiblePanels,
    lockedPanels,
    newlyUnlocked,
  };
}

export default useProgressiveDisclosure;
