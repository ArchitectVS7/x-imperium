"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { EmpireMapData, TreatyConnection } from "./types";
import type { GalaxyRegion } from "./GalaxyView";
import { TellIndicator } from "./TellIndicator";

interface SectorBoxProps {
  region: GalaxyRegion;
  x: number;
  y: number;
  width: number;
  height: number;
  playerEmpireId: string;
  isPlayerRegion: boolean;
  treaties: TreatyConnection[];
  onClick?: () => void;
}

/**
 * Get border color based on region type
 */
function getRegionBorderColor(type: string): string {
  switch (type) {
    case "core": return "#FFCC66"; // lcars-amber
    case "inner": return "#CC9933"; // lcars-gold
    case "mid": return "#CC99FF"; // lcars-lavender
    case "outer": return "#6699FF"; // lcars-blue
    case "rim": return "#66FFCC"; // lcars-mint
    case "void": return "#374151"; // gray-700
    default: return "#4b5563"; // gray-600
  }
}

/**
 * Get background color based on region type
 */
function getRegionBgColor(type: string): string {
  switch (type) {
    case "core": return "rgba(255,204,102,0.1)";
    case "inner": return "rgba(204,153,51,0.08)";
    case "mid": return "rgba(204,153,255,0.08)";
    case "outer": return "rgba(102,153,255,0.08)";
    case "rim": return "rgba(102,255,204,0.08)";
    case "void": return "rgba(55,65,81,0.05)";
    default: return "rgba(75,85,99,0.05)";
  }
}

/**
 * Get empire indicator color
 */
function getEmpireColor(
  empire: EmpireMapData,
  isPlayer: boolean
): string {
  if (empire.isEliminated) return "#374151";
  if (isPlayer) return "#3b82f6"; // blue
  if (empire.hasTreaty) return "#059669"; // green
  if (empire.recentAggressor) return "#dc2626"; // red

  switch (empire.intelLevel) {
    case "unknown": return "#4b5563"; // dim gray
    case "basic": return "#6b7280";
    case "moderate": return "#ef4444"; // red
    case "full": return "#f87171";
    default: return "#6b7280";
  }
}

/**
 * SectorBox Component
 *
 * Displays a single sector (region) with its empires as small indicators.
 * Part of the static Galaxy View.
 */
export function SectorBox({
  region,
  x,
  y,
  width,
  height,
  playerEmpireId,
  isPlayerRegion,
  treaties: _treaties, // Reserved for future treaty line rendering
  onClick,
}: SectorBoxProps) {
  // Suppress unused warning - reserved for future use
  void _treaties;

  const borderColor = getRegionBorderColor(region.regionType);
  const bgColor = getRegionBgColor(region.regionType);

  // Sort empires: player first, then by networth
  const sortedEmpires = useMemo(() => {
    return [...region.empires]
      .filter((e) => !e.isEliminated)
      .sort((a, b) => {
        if (a.id === playerEmpireId) return -1;
        if (b.id === playerEmpireId) return 1;
        return b.networth - a.networth;
      })
      .slice(0, 6); // Show max 6 empire indicators
  }, [region.empires, playerEmpireId]);

  const hasMoreEmpires = region.empires.filter((e) => !e.isEliminated).length > 6;

  // Calculate wealth indicator (1-5 bars)
  const wealthBars = Math.min(5, Math.max(1, Math.round(region.wealthModifier * 3)));

  return (
    <g
      className={cn("cursor-pointer transition-all", {
        "hover:opacity-100": true,
      })}
      onClick={onClick}
      data-testid={`sector-${region.id}`}
    >
      {/* Sector background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={isPlayerRegion ? 2 : 1}
        strokeOpacity={isPlayerRegion ? 1 : 0.5}
        rx={4}
        className="transition-all hover:stroke-opacity-100"
      />

      {/* Player region highlight */}
      {isPlayerRegion && (
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={height - 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="4,4"
          rx={3}
          opacity={0.6}
        />
      )}

      {/* Region name header */}
      <rect
        x={x}
        y={y}
        width={width}
        height={18}
        fill={borderColor}
        fillOpacity={0.3}
        rx={4}
      />
      <text
        x={x + 6}
        y={y + 13}
        fill={borderColor}
        fontSize="10"
        fontWeight="bold"
        className="pointer-events-none select-none"
      >
        {region.name.length > 14 ? region.name.slice(0, 12) + ".." : region.name}
      </text>

      {/* Wealth indicator */}
      <g transform={`translate(${x + width - 30}, ${y + 4})`}>
        {[...Array(5)].map((_, i) => (
          <rect
            key={i}
            x={i * 5}
            y={0}
            width={3}
            height={10}
            fill={i < wealthBars ? "#FFCC66" : "#374151"}
            opacity={i < wealthBars ? 0.8 : 0.3}
          />
        ))}
      </g>

      {/* Empire indicators grid */}
      <g transform={`translate(${x + 8}, ${y + 26})`}>
        {sortedEmpires.map((empire, index) => {
          const isPlayer = empire.id === playerEmpireId;
          const color = getEmpireColor(empire, isPlayer);
          const col = index % 3;
          const row = Math.floor(index / 3);
          const size = isPlayer ? 14 : 12;
          const cx = col * 35 + size / 2;
          const cy = row * 30 + size / 2;

          const isBoss = empire.isBoss ?? false;

          return (
            <g key={empire.id}>
              {/* Boss glow effect */}
              {isBoss && (
                <>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={size / 2 + 6}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeOpacity={0.3}
                    className="animate-pulse"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={size / 2 + 4}
                    fill="none"
                    stroke="#f87171"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                </>
              )}

              {/* Empire circle */}
              <circle
                cx={cx}
                cy={cy}
                r={size / 2}
                fill={isBoss ? "#dc2626" : color}
                stroke={isPlayer ? "#60a5fa" : isBoss ? "#fca5a5" : "none"}
                strokeWidth={isPlayer ? 2 : isBoss ? 2 : 0}
                opacity={empire.intelLevel === "unknown" && !isPlayer ? 0.4 : 0.9}
              />

              {/* Boss crown indicator */}
              {isBoss && (
                <text
                  x={cx}
                  y={cy - size / 2 - 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fbbf24"
                  fontSize="10"
                  className="pointer-events-none select-none"
                >
                  ♛
                </text>
              )}

              {/* Player star indicator */}
              {isPlayer && (
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="8"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  ★
                </text>
              )}

              {/* Threat indicator for aggressors */}
              {empire.recentAggressor && !isPlayer && !isBoss && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={size / 2 + 2}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                  className="animate-pulse"
                />
              )}

              {/* Treaty indicator */}
              {empire.hasTreaty && !isPlayer && !isBoss && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={size / 2 + 2}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={1}
                  opacity={0.6}
                />
              )}

              {/* Empire abbreviation (only if known) */}
              {empire.intelLevel !== "unknown" && !isPlayer && (
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="6"
                  className="pointer-events-none select-none"
                >
                  {empire.name.slice(0, 2).toUpperCase()}
                </text>
              )}

              {/* Question mark for unknown */}
              {empire.intelLevel === "unknown" && !isPlayer && (
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#9ca3af"
                  fontSize="8"
                  className="pointer-events-none select-none"
                >
                  ?
                </text>
              )}

              {/* PRD 7.10: Tell indicator for bot empires */}
              {!isPlayer && empire.activeTell && (
                <TellIndicator
                  tell={empire.activeTell}
                  cx={cx}
                  cy={cy}
                  size={size}
                  intelLevel={empire.intelLevel}
                />
              )}
            </g>
          );
        })}

        {/* More empires indicator */}
        {hasMoreEmpires && (
          <text
            x={width - 30}
            y={50}
            fill="#6b7280"
            fontSize="9"
            className="pointer-events-none select-none"
          >
            +{region.empires.filter((e) => !e.isEliminated).length - 6}
          </text>
        )}
      </g>

      {/* Empire count footer */}
      <text
        x={x + 6}
        y={y + height - 6}
        fill="#6b7280"
        fontSize="9"
        className="pointer-events-none select-none"
      >
        {region.empires.filter((e) => !e.isEliminated).length}/{region.maxEmpires} empires
      </text>

      {/* Danger level indicator */}
      {region.dangerLevel > 70 && (
        <g transform={`translate(${x + width - 18}, ${y + height - 16})`}>
          <polygon
            points="6,0 12,10 0,10"
            fill="#ef4444"
            opacity={0.8}
          />
          <text
            x="6"
            y="9"
            textAnchor="middle"
            fill="white"
            fontSize="7"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            !
          </text>
        </g>
      )}
    </g>
  );
}

export default SectorBox;
