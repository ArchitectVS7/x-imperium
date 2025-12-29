"use client";

/**
 * Empire Status Bar
 *
 * Compact horizontal bar at the bottom of the game view.
 * Shows key empire stats with clickable items to expand panels.
 * Replaces the GameFooter with more interactivity.
 */

import {
  RESOURCE_ICONS,
  CIVIL_STATUS_NAMES,
  CIVIL_STATUS_ICONS,
  SECTOR_TERM,
  SECTORS_TERM,
  type CivilStatusKey,
} from "@/lib/theme/names";

export type PanelType = "resources" | "military" | "planets" | "population" | null;

interface EmpireStatusBarProps {
  // Resources
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
  // Empire stats
  population: number;
  sectorCount: number;
  militaryPower: number;
  networth: number;
  rank?: number;
  civilStatus: CivilStatusKey;
  // Interaction
  activePanel?: PanelType;
  onPanelToggle?: (panel: PanelType) => void;
}

export function EmpireStatusBar({
  credits,
  food,
  ore,
  petroleum,
  researchPoints,
  population,
  sectorCount,
  militaryPower,
  networth,
  rank,
  civilStatus,
  activePanel,
  onPanelToggle,
}: EmpireStatusBarProps) {
  // Format large numbers compactly
  const formatCompact = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  const statusName = CIVIL_STATUS_NAMES[civilStatus] ?? civilStatus;
  const statusIcon = CIVIL_STATUS_ICONS[civilStatus] ?? "😐";

  return (
    <div
      className="bg-gray-900 border-t border-lcars-amber/30 px-4 py-2"
      data-testid="empire-status-bar"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Resources group - clickable */}
        <button
          onClick={() => onPanelToggle?.(activePanel === "resources" ? null : "resources")}
          className={`flex items-center gap-3 px-3 py-1 rounded transition-colors ${
            activePanel === "resources"
              ? "bg-lcars-amber/20 border border-lcars-amber/50"
              : "hover:bg-gray-800"
          }`}
        >
          <StatusItem icon={RESOURCE_ICONS.credits} value={formatCompact(credits)} color="text-lcars-amber" />
          <StatusItem icon={RESOURCE_ICONS.food} value={formatCompact(food)} color="text-green-400" />
          <StatusItem icon={RESOURCE_ICONS.ore} value={formatCompact(ore)} color="text-gray-400" />
          <StatusItem icon={RESOURCE_ICONS.petroleum} value={formatCompact(petroleum)} color="text-purple-400" />
          <StatusItem icon={RESOURCE_ICONS.researchPoints} value={formatCompact(researchPoints)} color="text-blue-400" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-700 hidden sm:block" />

        {/* Sectors - clickable */}
        <button
          onClick={() => onPanelToggle?.(activePanel === "planets" ? null : "planets")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            activePanel === "planets"
              ? "bg-lcars-amber/20 border border-lcars-amber/50"
              : "hover:bg-gray-800"
          }`}
        >
          <span>🌍</span>
          <span className="text-sm text-gray-300">
            <span className="font-mono text-white">{sectorCount}</span>{" "}
            <span className="hidden sm:inline">{sectorCount === 1 ? SECTOR_TERM : SECTORS_TERM}</span>
          </span>
        </button>

        {/* Military - clickable */}
        <button
          onClick={() => onPanelToggle?.(activePanel === "military" ? null : "military")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            activePanel === "military"
              ? "bg-lcars-amber/20 border border-lcars-amber/50"
              : "hover:bg-gray-800"
          }`}
        >
          <span>⚔️</span>
          <span className="text-sm text-gray-300">
            <span className="font-mono text-white">{formatCompact(militaryPower)}</span>{" "}
            <span className="hidden sm:inline">Power</span>
          </span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-700 hidden sm:block" />

        {/* Population - clickable */}
        <button
          onClick={() => onPanelToggle?.(activePanel === "population" ? null : "population")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            activePanel === "population"
              ? "bg-lcars-amber/20 border border-lcars-amber/50"
              : "hover:bg-gray-800"
          }`}
        >
          <span>{RESOURCE_ICONS.population}</span>
          <span className="text-sm text-gray-300 font-mono">{formatCompact(population)}</span>
        </button>

        {/* Civil Status */}
        <div className="flex items-center gap-1 px-2 py-1">
          <span>{statusIcon}</span>
          <span className="text-sm text-gray-400 hidden sm:inline">{statusName}</span>
        </div>

        {/* Rank & Networth */}
        <div className="flex items-center gap-3 px-2">
          {rank && (
            <div className="text-sm">
              <span className="text-gray-500">Rank </span>
              <span className="font-mono text-lcars-lavender">#{rank}</span>
            </div>
          )}
          <div className="text-sm hidden lg:block">
            <span className="text-gray-500">Renown </span>
            <span className="font-mono text-lcars-blue">{formatCompact(networth)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  icon,
  value,
  color = "text-white",
}: {
  icon: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">{icon}</span>
      <span className={`text-sm font-mono ${color}`}>{value}</span>
    </div>
  );
}

export default EmpireStatusBar;
