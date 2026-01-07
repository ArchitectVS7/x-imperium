"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { LCARSPanel } from "@/components/ui/lcars/LCARSPanel";
import type { EmpireMapData, IntelLevel } from "./types";
import type { GalaxyRegion } from "./GalaxyView";

interface SectorDetailProps {
  region: GalaxyRegion;
  playerEmpireId: string;
  isPlayerRegion: boolean;
  currentTurn: number;
  protectionTurns: number;
  onClose: () => void;
  onAttack?: (targetEmpireId: string) => void;
  onMessage?: (targetEmpireId: string) => void;
  onViewProfile?: (targetEmpireId: string) => void;
}

/**
 * Get region type display info
 */
function getRegionTypeInfo(type: string) {
  switch (type) {
    case "core":
      return { label: "Core World", color: "text-lcars-amber", desc: "High wealth, high danger" };
    case "inner":
      return { label: "Inner Region", color: "text-lcars-gold", desc: "Moderate wealth" };
    case "mid":
      return { label: "Mid Region", color: "text-lcars-lavender", desc: "Balanced" };
    case "outer":
      return { label: "Outer Region", color: "text-lcars-blue", desc: "Lower wealth, safer" };
    case "rim":
      return { label: "Rim Territory", color: "text-lcars-mint", desc: "Remote, undeveloped" };
    case "void":
      return { label: "Void Space", color: "text-gray-500", desc: "Uncharted" };
    default:
      return { label: "Unknown", color: "text-gray-400", desc: "" };
  }
}

/**
 * Get sector count range for moderate intel
 */
function getPlanetRange(sectorCount: number): string {
  if (sectorCount <= 2) return "1-2";
  if (sectorCount <= 4) return "3-4";
  if (sectorCount <= 6) return "5-6";
  if (sectorCount <= 8) return "7-8";
  if (sectorCount <= 10) return "9-10";
  return "10+";
}

/**
 * Get military tier label and color
 */
function getMilitaryInfo(tier: string | undefined) {
  switch (tier) {
    case "weak":
      return { label: "Weak", color: "text-green-400" };
    case "moderate":
      return { label: "Moderate", color: "text-yellow-400" };
    case "strong":
      return { label: "Strong", color: "text-orange-400" };
    case "dominant":
      return { label: "Dominant", color: "text-red-400" };
    default:
      return { label: "Unknown", color: "text-gray-500" };
  }
}

/**
 * Get threat badge info
 */
function getThreatInfo(threatLevel: string | undefined) {
  switch (threatLevel) {
    case "peaceful":
      return { label: "Peaceful", color: "text-green-400", bg: "bg-green-900/30" };
    case "neutral":
      return { label: "Neutral", color: "text-gray-400", bg: "bg-gray-700/30" };
    case "hostile":
      return { label: "Hostile", color: "text-yellow-400", bg: "bg-yellow-900/30" };
    case "at_war":
      return { label: "At War", color: "text-red-400", bg: "bg-red-900/30" };
    default:
      return null;
  }
}

interface EmpireRowProps {
  empire: EmpireMapData;
  isPlayer: boolean;
  isProtected: boolean;
  onAttack?: () => void;
  onMessage?: () => void;
  onViewProfile?: () => void;
}

function EmpireRow({
  empire,
  isPlayer,
  isProtected,
  onAttack,
  onMessage,
  onViewProfile,
}: EmpireRowProps) {
  const effectiveIntel: IntelLevel = isPlayer ? "full" : empire.intelLevel;
  const militaryInfo = getMilitaryInfo(empire.militaryTier);
  const threatInfo = getThreatInfo(empire.threatLevel);
  const canAttack = !isPlayer && !empire.isEliminated && !isProtected && !empire.hasTreaty;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        isPlayer
          ? "bg-blue-900/20 border-blue-500/50"
          : empire.isEliminated
            ? "bg-gray-800/30 border-gray-700/30 opacity-50"
            : empire.hasTreaty
              ? "bg-green-900/20 border-green-500/30"
              : empire.recentAggressor
                ? "bg-red-900/20 border-red-500/50"
                : "bg-gray-800/40 border-gray-600/30"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-semibold",
              isPlayer ? "text-blue-400" : empire.isEliminated ? "text-gray-500" : "text-lcars-amber"
            )}
          >
            {empire.name}
          </span>
          {isPlayer && (
            <span className="text-blue-400 text-xs">★ YOU</span>
          )}
          {empire.hasTreaty && !isPlayer && (
            <span className="text-lcars-mint text-xs px-1.5 py-0.5 bg-green-900/50 rounded">
              ALLY
            </span>
          )}
          {empire.recentAggressor && !isPlayer && (
            <span className="text-red-400 text-xs px-1.5 py-0.5 bg-red-900/50 rounded">
              AGGRESSOR
            </span>
          )}
          {empire.isEliminated && (
            <span className="text-gray-500 text-xs px-1.5 py-0.5 bg-gray-700/50 rounded">
              ELIMINATED
            </span>
          )}
        </div>

        {/* Intel level dots */}
        <div className="flex items-center gap-1">
          {(["unknown", "basic", "moderate", "full"] as const).map((level, i) => (
            <div
              key={level}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                i <= ["unknown", "basic", "moderate", "full"].indexOf(effectiveIntel)
                  ? "bg-lcars-amber"
                  : "bg-gray-700"
              )}
              title={level}
            />
          ))}
        </div>
      </div>

      {/* Stats row based on intel level */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        {effectiveIntel === "unknown" && (
          <>
            <div className="text-gray-500">
              <span className="text-gray-600">Planets:</span> ?
            </div>
            <div className="text-gray-500">
              <span className="text-gray-600">Military:</span> ?
            </div>
            <div className="text-gray-500">
              <span className="text-gray-600">Status:</span> Unknown
            </div>
          </>
        )}

        {effectiveIntel === "basic" && (
          <>
            <div>
              <span className="text-gray-500">Size:</span>{" "}
              <span className="text-gray-300">
                {empire.sectorCount <= 3 ? "Small" : empire.sectorCount <= 6 ? "Medium" : "Large"}
              </span>
            </div>
            <div className="text-gray-500">
              <span className="text-gray-600">Military:</span> ?
            </div>
            {threatInfo && (
              <div>
                <span className={threatInfo.color}>{threatInfo.label}</span>
              </div>
            )}
          </>
        )}

        {(effectiveIntel === "moderate" || effectiveIntel === "full") && (
          <>
            <div>
              <span className="text-gray-500">Planets:</span>{" "}
              <span className="text-gray-300 font-mono">
                {effectiveIntel === "full" ? empire.sectorCount : getPlanetRange(empire.sectorCount)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Military:</span>{" "}
              <span className={militaryInfo.color}>{militaryInfo.label}</span>
            </div>
            {threatInfo && (
              <div className={cn("px-1.5 py-0.5 rounded text-center", threatInfo.bg)}>
                <span className={threatInfo.color}>{threatInfo.label}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {!empire.isEliminated && !isPlayer && (
        <div className="flex gap-2 pt-2 border-t border-gray-700/50">
          {onViewProfile && (
            <button
              onClick={onViewProfile}
              className="flex-1 px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded hover:bg-gray-600/50 transition-colors"
            >
              Profile
            </button>
          )}
          {onMessage && (
            <button
              onClick={onMessage}
              className="flex-1 px-2 py-1 text-xs bg-lcars-lavender/20 text-lcars-lavender rounded hover:bg-lcars-lavender/30 transition-colors"
            >
              Message
            </button>
          )}
          {onAttack && canAttack && (
            <button
              onClick={onAttack}
              className="flex-1 px-2 py-1 text-xs bg-red-900/30 text-red-400 rounded hover:bg-red-800/40 transition-colors"
            >
              Attack
            </button>
          )}
          {isProtected && (
            <span className="flex-1 px-2 py-1 text-xs text-yellow-500 text-center">
              Protected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SectorDetail Component
 *
 * A detailed panel showing all information about a selected sector,
 * including all empires within it and available actions.
 */
export function SectorDetail({
  region,
  playerEmpireId,
  isPlayerRegion,
  currentTurn,
  protectionTurns,
  onClose,
  onAttack,
  onMessage,
  onViewProfile,
}: SectorDetailProps) {
  const regionTypeInfo = getRegionTypeInfo(region.regionType);
  const isProtected = currentTurn <= protectionTurns;

  // Sort empires: player first, then active by networth, then eliminated
  const sortedEmpires = useMemo(() => {
    return [...region.empires].sort((a, b) => {
      // Player first
      if (a.id === playerEmpireId) return -1;
      if (b.id === playerEmpireId) return 1;

      // Active empires before eliminated
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;

      // By networth descending
      return b.networth - a.networth;
    });
  }, [region.empires, playerEmpireId]);

  const activeCount = region.empires.filter((e) => !e.isEliminated).length;
  const eliminatedCount = region.empires.filter((e) => e.isEliminated).length;

  // Calculate sector danger
  const dangerLabel =
    region.dangerLevel > 80
      ? { label: "Extreme", color: "text-red-400" }
      : region.dangerLevel > 60
        ? { label: "High", color: "text-orange-400" }
        : region.dangerLevel > 40
          ? { label: "Moderate", color: "text-yellow-400" }
          : region.dangerLevel > 20
            ? { label: "Low", color: "text-green-400" }
            : { label: "Minimal", color: "text-lcars-mint" };

  return (
    <LCARSPanel
      title={`SECTOR: ${region.name.toUpperCase()}`}
      variant={isPlayerRegion ? "info" : "primary"}
      className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Sector info header */}
      <div className="border-b border-gray-700/50 pb-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className={cn("text-sm font-semibold", regionTypeInfo.color)}>
            {regionTypeInfo.label}
          </span>
          {isPlayerRegion && (
            <span className="text-blue-400 text-xs px-2 py-0.5 bg-blue-900/50 rounded">
              HOME SECTOR
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">{regionTypeInfo.desc}</p>

        {/* Sector stats */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-gray-500 mb-0.5">Wealth</div>
            <div className="font-mono text-lcars-amber">
              {region.wealthModifier.toFixed(1)}×
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Danger</div>
            <div className={dangerLabel.color}>{dangerLabel.label}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Capacity</div>
            <div className="font-mono">
              <span className="text-white">{activeCount}</span>
              <span className="text-gray-500">/{region.maxEmpires}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empire list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <div className="text-xs text-gray-500 mb-2">
          {activeCount} active empire{activeCount !== 1 ? "s" : ""}
          {eliminatedCount > 0 && `, ${eliminatedCount} eliminated`}
        </div>

        {sortedEmpires.map((empire) => (
          <EmpireRow
            key={empire.id}
            empire={empire}
            isPlayer={empire.id === playerEmpireId}
            isProtected={isProtected}
            onAttack={onAttack ? () => onAttack(empire.id) : undefined}
            onMessage={onMessage ? () => onMessage(empire.id) : undefined}
            onViewProfile={onViewProfile ? () => onViewProfile(empire.id) : undefined}
          />
        ))}

        {sortedEmpires.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No empires in this sector
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-xs text-gray-500 pt-3 mt-3 border-t border-gray-700/50 text-center">
        {isProtected
          ? `Protection active: ${protectionTurns - currentTurn + 1} turns remaining`
          : "Click an empire for more options"}
      </div>
    </LCARSPanel>
  );
}

export default SectorDetail;
