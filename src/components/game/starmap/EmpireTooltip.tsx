"use client";

import type { EmpireMapData, IntelLevel } from "./types";

interface EmpireTooltipProps {
  empire: EmpireMapData;
  isProtected: boolean;
  x: number;
  y: number;
}

// Get approximate size description for basic intel
function getApproximateSize(planetCount: number): string {
  if (planetCount <= 3) return "Small";
  if (planetCount <= 6) return "Medium";
  if (planetCount <= 10) return "Large";
  return "Massive";
}

// Get planet count range for moderate intel
function getPlanetRange(planetCount: number): string {
  if (planetCount <= 2) return "1-2";
  if (planetCount <= 4) return "3-4";
  if (planetCount <= 6) return "5-6";
  if (planetCount <= 8) return "7-8";
  if (planetCount <= 10) return "9-10";
  return "10+";
}

// Get networth range for moderate intel
function getNetworthRange(networth: number): string {
  if (networth < 10000) return "< 10K";
  if (networth < 50000) return "10K - 50K";
  if (networth < 100000) return "50K - 100K";
  if (networth < 250000) return "100K - 250K";
  if (networth < 500000) return "250K - 500K";
  return "500K+";
}

// Get military tier label
function getMilitaryTierLabel(tier: string | undefined): string {
  switch (tier) {
    case "weak":
      return "Weak";
    case "moderate":
      return "Moderate";
    case "strong":
      return "Strong";
    case "dominant":
      return "Dominant";
    default:
      return "Unknown";
  }
}

// Get archetype display name
function getArchetypeLabel(archetype: string | undefined): string {
  switch (archetype) {
    case "warlord":
      return "Warlord";
    case "diplomat":
      return "Diplomat";
    case "merchant":
      return "Merchant";
    case "schemer":
      return "Schemer";
    case "turtle":
      return "Turtle";
    case "blitzkrieg":
      return "Blitzkrieg";
    case "tech_rush":
      return "Tech Rush";
    case "opportunist":
      return "Opportunist";
    default:
      return "Unknown";
  }
}

// Get threat level badge
function getThreatBadge(threatLevel: string | undefined): { label: string; color: string } | null {
  switch (threatLevel) {
    case "peaceful":
      return { label: "Peaceful", color: "text-green-400" };
    case "neutral":
      return { label: "Neutral", color: "text-gray-400" };
    case "hostile":
      return { label: "Hostile", color: "text-yellow-400" };
    case "at_war":
      return { label: "At War", color: "text-red-400" };
    default:
      return null;
  }
}

export function EmpireTooltip({ empire, isProtected, x, y }: EmpireTooltipProps) {
  const isPlayer = empire.type === "player";
  const intelLevel = empire.intelLevel;

  // Player always has full intel on themselves
  const effectiveIntel: IntelLevel = isPlayer ? "full" : intelLevel;

  const threatBadge = getThreatBadge(empire.threatLevel);

  return (
    <div
      className="absolute pointer-events-none z-50 bg-gray-900/95 border border-lcars-amber/30 rounded-lg p-3 shadow-lg min-w-[200px]"
      style={{
        left: x + 15,
        top: y - 10,
        transform: "translateY(-50%)",
      }}
    >
      <div className="space-y-2">
        {/* Empire name - always visible */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-lcars-amber">{empire.name}</span>
          {empire.recentAggressor && (
            <span className="text-red-400 text-xs px-1 bg-red-900/50 rounded">
              AGGRESSOR
            </span>
          )}
        </div>

        {/* Intel level indicator */}
        <div className="flex items-center gap-2 text-xs border-b border-gray-700 pb-2">
          <span className="text-gray-500">Intel:</span>
          <div className="flex gap-1">
            {(["unknown", "basic", "moderate", "full"] as const).map((level, i) => (
              <div
                key={level}
                className={`w-2 h-2 rounded-full ${
                  i <= ["unknown", "basic", "moderate", "full"].indexOf(effectiveIntel)
                    ? "bg-lcars-amber"
                    : "bg-gray-700"
                }`}
                title={level}
              />
            ))}
          </div>
          <span className="text-gray-400 capitalize">{effectiveIntel}</span>
        </div>

        <div className="text-xs space-y-1 text-gray-300">
          {/* Type - always visible */}
          <div className="flex justify-between">
            <span>Type:</span>
            <span className={isPlayer ? "text-blue-400" : "text-red-400"}>
              {isPlayer ? "Your Empire" : "Rival"}
            </span>
          </div>

          {/* Unknown intel - very limited info */}
          {effectiveIntel === "unknown" && (
            <>
              <div className="flex justify-between">
                <span>Size:</span>
                <span className="text-gray-500 italic">Unknown</span>
              </div>
              <div className="flex justify-between">
                <span>Strength:</span>
                <span className="text-gray-500 italic">Unknown</span>
              </div>
              <div className="text-center mt-2 pt-2 border-t border-gray-700 text-gray-500 italic">
                Run Intel Ops to gather information
              </div>
            </>
          )}

          {/* Basic intel - approximate size */}
          {effectiveIntel === "basic" && (
            <>
              <div className="flex justify-between">
                <span>Size:</span>
                <span className="text-gray-300">{getApproximateSize(empire.planetCount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Strength:</span>
                <span className="text-gray-500 italic">Unknown</span>
              </div>
              {empire.hasTreaty && (
                <div className="flex justify-between">
                  <span>Relations:</span>
                  <span className="text-lcars-mint">Treaty Partner</span>
                </div>
              )}
              <div className="text-center mt-2 pt-2 border-t border-gray-700 text-gray-500 italic">
                Run recon for more details
              </div>
            </>
          )}

          {/* Moderate intel - ranges and tier */}
          {effectiveIntel === "moderate" && (
            <>
              <div className="flex justify-between">
                <span>Planets:</span>
                <span className="font-mono">{getPlanetRange(empire.planetCount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Networth:</span>
                <span className="font-mono text-lcars-amber">
                  {getNetworthRange(empire.networth)}
                </span>
              </div>
              {empire.militaryTier && (
                <div className="flex justify-between">
                  <span>Military:</span>
                  <span
                    className={
                      empire.militaryTier === "dominant"
                        ? "text-red-400"
                        : empire.militaryTier === "strong"
                          ? "text-orange-400"
                          : empire.militaryTier === "moderate"
                            ? "text-yellow-400"
                            : "text-green-400"
                    }
                  >
                    {getMilitaryTierLabel(empire.militaryTier)}
                  </span>
                </div>
              )}
              {empire.archetype && empire.archetype !== "unknown" && (
                <div className="flex justify-between">
                  <span>Strategy:</span>
                  <span className="text-lcars-lavender">
                    {getArchetypeLabel(empire.archetype)}
                  </span>
                </div>
              )}
              {threatBadge && (
                <div className="flex justify-between">
                  <span>Threat:</span>
                  <span className={threatBadge.color}>{threatBadge.label}</span>
                </div>
              )}
            </>
          )}

          {/* Full intel - everything visible */}
          {effectiveIntel === "full" && (
            <>
              <div className="flex justify-between">
                <span>Planets:</span>
                <span className="font-mono">{empire.planetCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Networth:</span>
                <span className="font-mono text-lcars-amber">
                  {empire.networth.toLocaleString()}
                </span>
              </div>
              {empire.militaryTier && (
                <div className="flex justify-between">
                  <span>Military:</span>
                  <span
                    className={
                      empire.militaryTier === "dominant"
                        ? "text-red-400"
                        : empire.militaryTier === "strong"
                          ? "text-orange-400"
                          : empire.militaryTier === "moderate"
                            ? "text-yellow-400"
                            : "text-green-400"
                    }
                  >
                    {getMilitaryTierLabel(empire.militaryTier)}
                  </span>
                </div>
              )}
              {empire.archetype && empire.archetype !== "unknown" && (
                <div className="flex justify-between">
                  <span>Strategy:</span>
                  <span className="text-lcars-lavender">
                    {getArchetypeLabel(empire.archetype)}
                  </span>
                </div>
              )}
              {threatBadge && (
                <div className="flex justify-between">
                  <span>Threat:</span>
                  <span className={threatBadge.color}>{threatBadge.label}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={empire.isEliminated ? "text-gray-500" : "text-green-400"}>
                  {empire.isEliminated ? "Eliminated" : "Active"}
                </span>
              </div>
            </>
          )}

          {/* Protection warning */}
          {isProtected && !empire.isEliminated && !isPlayer && (
            <div className="text-yellow-400 text-center mt-2 border-t border-gray-700 pt-2">
              Protected (cannot attack)
            </div>
          )}

          {/* Treaty indicator */}
          {empire.hasTreaty && effectiveIntel !== "basic" && (
            <div className="text-lcars-mint text-center mt-2 border-t border-gray-700 pt-2">
              Treaty Partner
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
