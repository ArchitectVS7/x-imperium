"use client";

/**
 * Compact Header Status
 *
 * Shows key stats in the header bar.
 * Minimal footprint, quick glance info.
 */

import { RESOURCE_ICONS } from "@/lib/theme/names";

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
      <div className="flex items-center gap-1">
        <span className="text-gray-500">T:</span>
        <span className="text-lcars-lavender font-mono">{currentTurn}</span>
        <span className="text-gray-600">/{turnLimit}</span>
      </div>

      <div className="h-4 w-px bg-gray-700" />

      {/* Credits */}
      <div className="flex items-center gap-1">
        <span>{RESOURCE_ICONS.credits}</span>
        <span className="text-lcars-amber font-mono">{formatCompact(credits)}</span>
      </div>

      {/* Food status */}
      <div className="flex items-center gap-1">
        <span>{RESOURCE_ICONS.food}</span>
        <span className={foodDisplay.color}>{foodDisplay.label}</span>
      </div>

      {/* Population */}
      <div className="flex items-center gap-1">
        <span>{RESOURCE_ICONS.population}</span>
        <span className="text-gray-300 font-mono">{formatCompact(population)}</span>
      </div>
    </div>
  );
}

export default CompactHeaderStatus;
