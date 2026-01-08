"use client";

/**
 * Empire Status Bar
 *
 * Compact horizontal bar at the bottom of the game view.
 * Shows key empire stats with clickable items to expand panels.
 * Replaces the GameFooter with more interactivity.
 */

import {
  CIVIL_STATUS_NAMES,
  SECTOR_TERM,
  SECTORS_TERM,
  type CivilStatusKey,
} from "@/lib/theme/names";
import { ResourceIconWithValue, CivilStatusIcons, UnitIcons } from "@/lib/theme/icons";
import { MapPin } from "lucide-react";
import {
  Tooltip,
  CreditsTooltip,
  FoodTooltip,
  OreTooltip,
  PetroleumTooltip,
  ResearchTooltip,
  PopulationTooltip,
  SectorsTooltip,
  MilitaryPowerTooltip,
  CivilStatusTooltip,
  NetworthTooltip,
  RankTooltip,
} from "./Tooltip";

export type PanelType =
  | "resources"
  | "military"
  | "sectors"
  | "population"
  | "combat"
  | "market"
  | "research"
  | "diplomacy"
  | "covert"
  | "messages"
  | null;

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
  const StatusIconComponent = CivilStatusIcons[civilStatus] ?? CivilStatusIcons.content;

  return (
    <div
      className="hidden lg:block bg-gray-900 border-t border-lcars-amber/30 px-4 py-2"
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
          <Tooltip content={<CreditsTooltip />} position="top">
            <span><ResourceIconWithValue resource="credits" value={credits} compact /></span>
          </Tooltip>
          <Tooltip content={<FoodTooltip />} position="top">
            <span><ResourceIconWithValue resource="food" value={food} compact /></span>
          </Tooltip>
          <Tooltip content={<OreTooltip />} position="top">
            <span><ResourceIconWithValue resource="ore" value={ore} compact /></span>
          </Tooltip>
          <Tooltip content={<PetroleumTooltip />} position="top">
            <span><ResourceIconWithValue resource="petroleum" value={petroleum} compact /></span>
          </Tooltip>
          <Tooltip content={<ResearchTooltip />} position="top">
            <span><ResourceIconWithValue resource="researchPoints" value={researchPoints} compact /></span>
          </Tooltip>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-700 hidden sm:block" />

        {/* Sectors - clickable */}
        <Tooltip content={<SectorsTooltip />} position="top">
          <button
            onClick={() => onPanelToggle?.(activePanel === "sectors" ? null : "sectors")}
            className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
              activePanel === "sectors"
                ? "bg-lcars-amber/20 border border-lcars-amber/50"
                : "hover:bg-gray-800"
            }`}
          >
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">
              <span className="font-mono text-white">{sectorCount}</span>{" "}
              <span className="hidden sm:inline">{sectorCount === 1 ? SECTOR_TERM : SECTORS_TERM}</span>
            </span>
          </button>
        </Tooltip>

        {/* Military - clickable */}
        <Tooltip content={<MilitaryPowerTooltip />} position="top">
          <button
            onClick={() => onPanelToggle?.(activePanel === "military" ? null : "military")}
            className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
              activePanel === "military"
                ? "bg-lcars-amber/20 border border-lcars-amber/50"
                : "hover:bg-gray-800"
            }`}
          >
            <UnitIcons.soldiers className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-300">
              <span className="font-mono text-white">{formatCompact(militaryPower)}</span>{" "}
              <span className="hidden sm:inline">Power</span>
            </span>
          </button>
        </Tooltip>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-700 hidden sm:block" />

        {/* Population - clickable */}
        <Tooltip content={<PopulationTooltip />} position="top">
          <button
            onClick={() => onPanelToggle?.(activePanel === "population" ? null : "population")}
            className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
              activePanel === "population"
                ? "bg-lcars-amber/20 border border-lcars-amber/50"
                : "hover:bg-gray-800"
            }`}
          >
            <ResourceIconWithValue resource="population" value={population} compact />
          </button>
        </Tooltip>

        {/* Civil Status */}
        <Tooltip content={<CivilStatusTooltip />} position="top">
          <div className="flex items-center gap-1 px-2 py-1 cursor-help">
            <StatusIconComponent className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 hidden sm:inline">{statusName}</span>
          </div>
        </Tooltip>

        {/* Rank & Networth */}
        <div className="flex items-center gap-3 px-2">
          {rank && (
            <Tooltip content={<RankTooltip />} position="top">
              <div className="text-sm cursor-help">
                <span className="text-gray-500">Rank </span>
                <span className="font-mono text-lcars-lavender">#{rank}</span>
              </div>
            </Tooltip>
          )}
          <Tooltip content={<NetworthTooltip />} position="top">
            <div className="text-sm hidden lg:block cursor-help">
              <span className="text-gray-500">Renown </span>
              <span className="font-mono text-lcars-blue">{formatCompact(networth)}</span>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default EmpireStatusBar;
