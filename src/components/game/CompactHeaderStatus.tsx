"use client";

/**
 * Compact Header Status
 *
 * Shows key stats in the header bar.
 * Minimal footprint, quick glance info.
 */

import { RESOURCE_ICONS } from "@/lib/theme/names";
import {
  Tooltip,
  TurnTooltip,
  CreditsTooltip,
  FoodStatusTooltip,
  PopulationTooltip,
} from "./Tooltip";

interface CompactHeaderStatusProps {
  credits: number;
  foodStatus: "surplus" | "stable" | "deficit" | "critical";
  population: number;
  currentTurn: number;
  turnLimit: number;
}

const FOOD_STATUS_DISPLAY = {
  surplus: { label: "Surplus", color: "text-green-400" },
  stable: { label: "Stable", color: "text-blue-400" },
  deficit: { label: "Deficit", color: "text-yellow-400" },
  critical: { label: "Critical", color: "text-red-400" },
};

export function CompactHeaderStatus({
  credits,
  foodStatus,
  population,
  currentTurn,
  turnLimit,
}: CompactHeaderStatusProps) {
  const foodDisplay = FOOD_STATUS_DISPLAY[foodStatus];

  // Format large numbers compactly
  const formatCompact = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div
      className="hidden md:flex items-center gap-4 text-sm"
      role="status"
      aria-live="polite"
      aria-label="Game status"
    >
      {/* Turn indicator */}
      <Tooltip content={<TurnTooltip />} position="bottom">
        <div className="flex items-center gap-1 cursor-help" data-testid="turn-counter">
          <span className="text-gray-500">T:</span>
          <span className="text-lcars-lavender font-mono" data-testid="turn-value">{currentTurn}</span>
          <span className="text-gray-600">/{turnLimit}</span>
        </div>
      </Tooltip>

      <div className="h-4 w-px bg-gray-700" />

      {/* Credits */}
      <Tooltip content={<CreditsTooltip />} position="bottom">
        <div className="flex items-center gap-1 cursor-help" data-testid="header-credits">
          <span>{RESOURCE_ICONS.credits}</span>
          <span className="text-lcars-amber font-mono" data-testid="credits-value">{formatCompact(credits)}</span>
        </div>
      </Tooltip>

      {/* Food status */}
      <Tooltip content={<FoodStatusTooltip />} position="bottom">
        <div className="flex items-center gap-1 cursor-help" data-testid="header-food">
          <span>{RESOURCE_ICONS.food}</span>
          <span className={foodDisplay.color} data-testid="food-status">{foodDisplay.label}</span>
        </div>
      </Tooltip>

      {/* Population */}
      <Tooltip content={<PopulationTooltip />} position="bottom">
        <div className="flex items-center gap-1 cursor-help" data-testid="header-population">
          <span>{RESOURCE_ICONS.population}</span>
          <span className="text-gray-300 font-mono" data-testid="population-value">{formatCompact(population)}</span>
        </div>
      </Tooltip>
    </div>
  );
}

export default CompactHeaderStatus;
