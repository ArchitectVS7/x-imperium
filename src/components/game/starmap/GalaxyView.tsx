"use client";

import { useMemo } from "react";
import { SectorBox } from "./SectorBox";
import { WormholeConnection } from "./WormholeConnection";
import { cn } from "@/lib/utils";
import type { EmpireMapData, TreatyConnection } from "./types";

/**
 * Region data structure for galaxy visualization
 */
export interface GalaxyRegion {
  id: string;
  name: string;
  regionType: "core" | "inner" | "mid" | "outer" | "rim" | "void";
  positionX: number;
  positionY: number;
  wealthModifier: number;
  dangerLevel: number;
  maxEmpires: number;
  empires: EmpireMapData[];
}

/**
 * Wormhole connection between regions
 */
export interface WormholeData {
  id: string;
  fromRegionId: string;
  toRegionId: string;
  status: "undiscovered" | "discovered" | "stabilized" | "collapsed";
  isKnown: boolean;
}

interface GalaxyViewProps {
  regions: GalaxyRegion[];
  wormholes: WormholeData[];
  playerEmpireId: string;
  playerRegionId: string;
  currentTurn: number;
  protectionTurns: number;
  treaties: TreatyConnection[];
  width?: number;
  height?: number;
  onSelectSector?: (regionId: string) => void;
}

/**
 * Galaxy View Component
 *
 * Displays a static grid of sectors (regions) with empires positioned within them.
 * Replaces the D3 force-directed graph with a more strategic sector-based view.
 */
export function GalaxyView({
  regions,
  wormholes,
  playerEmpireId,
  playerRegionId,
  currentTurn,
  protectionTurns,
  treaties,
  width = 900,
  height = 600,
  onSelectSector,
}: GalaxyViewProps) {
  const isProtected = currentTurn <= protectionTurns;

  // Calculate bounds for positioning
  const bounds = useMemo(() => {
    if (regions.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };

    const xs = regions.map((r) => r.positionX);
    const ys = regions.map((r) => r.positionY);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [regions]);

  // Map positions to screen coordinates with padding
  const padding = 80;
  const sectorSize = 120;

  const getScreenPosition = (posX: number, posY: number) => {
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;

    const x = padding + ((posX - bounds.minX) / rangeX) * (width - padding * 2 - sectorSize);
    const y = padding + ((posY - bounds.minY) / rangeY) * (height - padding * 2 - sectorSize);

    return { x, y };
  };

  // Create region position map for wormhole connections
  const regionPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    regions.forEach((region) => {
      const pos = getScreenPosition(region.positionX, region.positionY);
      map.set(region.id, { x: pos.x + sectorSize / 2, y: pos.y + sectorSize / 2 });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, bounds, width, height]);

  // Count active empires and intel status
  const stats = useMemo(() => {
    const allEmpires = regions.flatMap((r) => r.empires);
    const activeEmpires = allEmpires.filter((e) => !e.isEliminated);
    const intelCounts = { unknown: 0, basic: 0, moderate: 0, full: 0 };

    activeEmpires.forEach((e) => {
      if (e.id !== playerEmpireId && !e.isEliminated) {
        intelCounts[e.intelLevel]++;
      }
    });

    return {
      totalEmpires: allEmpires.length,
      activeEmpires: activeEmpires.length,
      intelCounts,
    };
  }, [regions, playerEmpireId]);

  // Get region type color
  const getRegionTypeLabel = (type: string) => {
    switch (type) {
      case "core": return { label: "Core", color: "text-lcars-amber" };
      case "inner": return { label: "Inner", color: "text-lcars-gold" };
      case "mid": return { label: "Mid", color: "text-lcars-lavender" };
      case "outer": return { label: "Outer", color: "text-lcars-blue" };
      case "rim": return { label: "Rim", color: "text-lcars-mint" };
      case "void": return { label: "Void", color: "text-gray-500" };
      default: return { label: "Unknown", color: "text-gray-400" };
    }
  };

  return (
    <div className="relative" data-testid="galaxy-view">
      {/* Legend Panel */}
      <div className="absolute top-2 left-2 bg-gray-900/90 p-3 rounded-lg text-sm space-y-2 z-10 backdrop-blur-sm border border-gray-700/50">
        <div className="text-xs text-gray-400 font-semibold mb-2">SECTOR TYPES</div>
        {["core", "inner", "mid", "outer", "rim"].map((type) => {
          const { label, color } = getRegionTypeLabel(type);
          return (
            <div key={type} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-sm", {
                "bg-lcars-amber": type === "core",
                "bg-lcars-gold": type === "inner",
                "bg-lcars-lavender": type === "mid",
                "bg-lcars-blue": type === "outer",
                "bg-lcars-mint": type === "rim",
              })} />
              <span className={color}>{label}</span>
            </div>
          );
        })}

        {/* Wormhole indicators */}
        <div className="pt-2 border-t border-gray-700 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-lcars-mint" />
            <span className="text-gray-300 text-xs">Stable Wormhole</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t border-dashed border-lcars-amber" />
            <span className="text-gray-300 text-xs">Unstable Wormhole</span>
          </div>
        </div>

        {/* Protection timer */}
        {isProtected && (
          <div className="text-yellow-400 text-xs pt-2 border-t border-gray-700">
            Protection: {protectionTurns - currentTurn + 1} turns
          </div>
        )}
      </div>

      {/* Intel Status Panel */}
      <div className="absolute top-2 right-2 bg-gray-900/90 p-3 rounded-lg text-sm z-10 backdrop-blur-sm border border-gray-700/50">
        <div className="text-xs text-gray-400 font-semibold mb-2">INTEL STATUS</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Full Intel:</span>
            <span className="text-lcars-mint font-mono">{stats.intelCounts.full}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Partial:</span>
            <span className="text-lcars-amber font-mono">
              {stats.intelCounts.moderate + stats.intelCounts.basic}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Unknown:</span>
            <span className="text-gray-500 font-mono">{stats.intelCounts.unknown}</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="text-gray-400">Active Empires</div>
          <div className="text-2xl font-bold text-lcars-amber">
            {stats.activeEmpires}/{stats.totalEmpires}
          </div>
        </div>
        <div className="mt-2 text-gray-400 text-xs">
          Sectors: {regions.length}
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        width={width}
        height={height}
        className="bg-gray-950/80 rounded-lg border border-gray-800"
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="galaxy-bg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="50%" stopColor="#0f0f1a" />
            <stop offset="100%" stopColor="#050510" />
          </radialGradient>

          {/* Grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2937" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#galaxy-bg)" />
        <rect width={width} height={height} fill="url(#grid)" opacity="0.3" />

        {/* Wormhole connections (rendered below sectors) */}
        <g className="wormhole-layer">
          {wormholes
            .filter((w) => w.isKnown && w.status !== "collapsed")
            .map((wormhole) => {
              const fromPos = regionPositions.get(wormhole.fromRegionId);
              const toPos = regionPositions.get(wormhole.toRegionId);

              if (!fromPos || !toPos) return null;

              return (
                <WormholeConnection
                  key={wormhole.id}
                  id={wormhole.id}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  status={wormhole.status}
                />
              );
            })}
        </g>

        {/* Sector boxes */}
        <g className="sector-layer">
          {regions.map((region) => {
            const pos = getScreenPosition(region.positionX, region.positionY);
            const isPlayerRegion = region.id === playerRegionId;

            return (
              <SectorBox
                key={region.id}
                region={region}
                x={pos.x}
                y={pos.y}
                width={sectorSize}
                height={sectorSize}
                playerEmpireId={playerEmpireId}
                isPlayerRegion={isPlayerRegion}
                treaties={treaties}
                onClick={() => onSelectSector?.(region.id)}
              />
            );
          })}
        </g>
      </svg>

      {/* Help hint */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">
        Click a sector for details • Intel from spy operations reveals more
      </div>
    </div>
  );
}

export default GalaxyView;
