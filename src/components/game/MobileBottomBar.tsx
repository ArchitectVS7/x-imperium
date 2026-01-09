"use client";

/**
 * Mobile Bottom Bar
 *
 * Compact bottom bar for mobile devices showing:
 * - Key status indicators
 * - END TURN button (always accessible)
 * - Button to open full action sheet
 *
 * Visible only on mobile (< lg breakpoint)
 *
 * Accessibility: Status indicators use both color AND icons to support
 * colorblind users. Each status also has an aria-label for screen readers.
 */

import { UI_LABELS } from "@/lib/theme/names";
import { ResourceIcons, ActionIcons } from "@/lib/theme/icons";
import {
  Menu,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

interface MobileBottomBarProps {
  currentTurn: number;
  turnLimit: number;
  credits: number;
  foodStatus: "surplus" | "stable" | "deficit" | "critical";
  armyStrength: "strong" | "moderate" | "weak" | "critical";
  unreadMessages?: number;
  onEndTurn: () => void;
  onOpenActions: () => void;
  isProcessing?: boolean;
}

// Food status indicators with color, icon, and accessible label
const FOOD_INDICATORS: Record<
  MobileBottomBarProps["foodStatus"],
  { color: string; icon: LucideIcon; label: string }
> = {
  surplus: { color: "text-green-400", icon: TrendingUp, label: "Food surplus - production exceeds consumption" },
  stable: { color: "text-blue-400", icon: Minus, label: "Food stable - production matches consumption" },
  deficit: { color: "text-yellow-400", icon: TrendingDown, label: "Food deficit - consumption exceeds production" },
  critical: { color: "text-red-400", icon: AlertTriangle, label: "Food critical - severe shortage" },
};

// Army strength indicators with color, icon, and accessible label
const ARMY_INDICATORS: Record<
  MobileBottomBarProps["armyStrength"],
  { color: string; icon: LucideIcon; label: string }
> = {
  strong: { color: "text-green-400", icon: Shield, label: "Army strong - well defended" },
  moderate: { color: "text-blue-400", icon: CheckCircle2, label: "Army moderate - adequate defense" },
  weak: { color: "text-yellow-400", icon: ShieldAlert, label: "Army weak - vulnerable to attack" },
  critical: { color: "text-red-400", icon: AlertTriangle, label: "Army critical - severely under-defended" },
};

export function MobileBottomBar({
  currentTurn,
  turnLimit,
  credits,
  foodStatus,
  armyStrength,
  unreadMessages = 0,
  onEndTurn,
  onOpenActions,
  isProcessing = false,
}: MobileBottomBarProps) {
  const formatCompact = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const foodIndicator = FOOD_INDICATORS[foodStatus];
  const armyIndicator = ARMY_INDICATORS[armyStrength];
  const FoodStatusIcon = foodIndicator.icon;
  const ArmyStatusIcon = armyIndicator.icon;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-lcars-amber/30 z-30"
      data-testid="mobile-bottom-bar"
    >
      {/* Status row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        {/* Turn */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">T:</span>
          <span className="text-sm font-mono text-lcars-lavender">{currentTurn}</span>
          <span className="text-xs text-gray-600">/{turnLimit}</span>
        </div>

        {/* Credits */}
        <div className="flex items-center gap-1">
          <ResourceIcons.credits className="w-4 h-4 text-lcars-amber" />
          <span className="text-sm font-mono text-lcars-amber">{formatCompact(credits)}</span>
        </div>

        {/* Food status indicator - uses icon + color for accessibility */}
        <div
          className="flex items-center gap-1"
          role="status"
          aria-label={foodIndicator.label}
        >
          <ResourceIcons.food className="w-4 h-4 text-green-400" aria-hidden="true" />
          <FoodStatusIcon
            className={`w-3 h-3 ${foodIndicator.color}`}
            aria-hidden="true"
          />
          <span className={`text-xs ${foodIndicator.color}`}>
            {foodStatus.charAt(0).toUpperCase() + foodStatus.slice(1)}
          </span>
        </div>

        {/* Army status indicator - uses icon + color for accessibility */}
        <div
          className="flex items-center gap-1"
          role="status"
          aria-label={armyIndicator.label}
        >
          <ActionIcons.military className="w-4 h-4 text-red-400" aria-hidden="true" />
          <ArmyStatusIcon
            className={`w-3 h-3 ${armyIndicator.color}`}
            aria-hidden="true"
          />
          <span className={`text-xs ${armyIndicator.color}`}>
            {armyStrength.charAt(0).toUpperCase() + armyStrength.slice(1)}
          </span>
        </div>

        {/* Open actions button */}
        <button
          onClick={onOpenActions}
          className="relative p-2 text-gray-400 hover:text-white"
          aria-label="Open actions"
        >
          <Menu className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </button>
      </div>

      {/* End Turn button row */}
      <div className="p-2">
        <button
          onClick={onEndTurn}
          disabled={isProcessing}
          className={`w-full py-3 px-4 rounded-lg font-display text-base transition-all ${
            isProcessing
              ? "bg-gray-700 text-gray-400 cursor-wait animate-pulse"
              : "bg-lcars-amber text-gray-900 hover:bg-lcars-amber/90 active:scale-[0.98]"
          }`}
          data-testid="mobile-end-turn"
        >
          {isProcessing ? "PROCESSING..." : UI_LABELS.endTurn.toUpperCase()}
        </button>
      </div>
    </div>
  );
}

export default MobileBottomBar;
