"use client";

/**
 * VolleySummaryCard Component
 *
 * Displays a single volley's summary with hit counts, damage, and criticals.
 * Format: "Hits: 3/5 | Damage: 24 | 1 Critical"
 */

import { cn } from "@/lib/utils";
import { summarizeVolley, type VolleyResult, type VolleySummary } from "@/lib/combat/volley-combat-v2";
import { type CombatStance, getStanceModifiers } from "@/lib/combat/stances";
import { Target, Crosshair, Zap, Skull, Shield, Flame } from "lucide-react";

interface VolleySummaryCardProps {
  /** The volley result data */
  volley: VolleyResult;
  /** Which side this card represents */
  side: "attacker" | "defender";
  /** Combat stance used */
  stance?: CombatStance;
  /** Whether this side won the volley */
  isWinner: boolean;
  /** Show expanded details */
  expanded?: boolean;
}

/**
 * Format large numbers with K suffix
 */
function formatDamage(damage: number): string {
  if (damage >= 1000) {
    return `${(damage / 1000).toFixed(1)}K`;
  }
  return damage.toString();
}

export function VolleySummaryCard({
  volley,
  side,
  stance,
  isWinner,
  expanded = false,
}: VolleySummaryCardProps) {
  const summary = summarizeVolley(volley, side);
  const stanceData = stance ? getStanceModifiers(stance) : null;

  // Determine styling based on side and winner status
  const isAttacker = side === "attacker";
  const borderColor = isWinner
    ? isAttacker
      ? "border-amber-500"
      : "border-blue-500"
    : "border-gray-700";
  const bgColor = isWinner
    ? isAttacker
      ? "bg-amber-950/40"
      : "bg-blue-950/40"
    : "bg-gray-900/40";
  const headerColor = isAttacker ? "text-amber-400" : "text-blue-400";

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3 transition-all duration-300",
        borderColor,
        bgColor,
        isWinner && "ring-1 ring-offset-1 ring-offset-gray-950",
        isWinner && (isAttacker ? "ring-amber-500/50" : "ring-blue-500/50")
      )}
      data-testid={`volley-summary-${side}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className={cn("text-sm font-semibold uppercase tracking-wider", headerColor)}>
          {isAttacker ? "Your Attack" : "Enemy Attack"}
        </h4>
        {isWinner && (
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded",
            isAttacker ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
          )}>
            WINNER
          </span>
        )}
      </div>

      {/* Main Summary Line: "Hits: 3/5 | Damage: 24 | 1 Critical" */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* Hits */}
        <div className="flex items-center gap-1.5">
          <Crosshair className="h-4 w-4 text-gray-500" />
          <span className="text-gray-400">Hits:</span>
          <span className={cn(
            "font-mono font-semibold",
            summary.hits > 0 ? "text-green-400" : "text-gray-500"
          )}>
            {summary.hits}/{summary.totalRolls}
          </span>
        </div>

        {/* Separator */}
        <span className="text-gray-700">|</span>

        {/* Damage */}
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-gray-500" />
          <span className="text-gray-400">Damage:</span>
          <span className={cn(
            "font-mono font-semibold",
            summary.totalDamage > 0 ? "text-orange-400" : "text-gray-500"
          )}>
            {formatDamage(summary.totalDamage)}
          </span>
        </div>

        {/* Separator */}
        <span className="text-gray-700">|</span>

        {/* Criticals */}
        <div className="flex items-center gap-1.5">
          {summary.criticals > 0 ? (
            <>
              <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="font-mono font-bold text-amber-400">
                {summary.criticals} CRITICAL{summary.criticals > 1 ? "S" : ""}!
              </span>
            </>
          ) : summary.fumbles > 0 ? (
            <>
              <Skull className="h-4 w-4 text-red-400" />
              <span className="font-mono text-red-400">
                {summary.fumbles} Fumble{summary.fumbles > 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500">0 Criticals</span>
            </>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
          {/* Stance info */}
          {stanceData && stance !== "balanced" && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="h-3 w-3" />
              <span>{stanceData.label} stance:</span>
              <span className={cn(
                "font-mono",
                stanceData.attackMod > 0 ? "text-green-400" : stanceData.attackMod < 0 ? "text-red-400" : ""
              )}>
                ATK {stanceData.attackMod >= 0 ? "+" : ""}{stanceData.attackMod}
              </span>
              <span className={cn(
                "font-mono",
                stanceData.defenseMod > 0 ? "text-green-400" : stanceData.defenseMod < 0 ? "text-red-400" : ""
              )}>
                DEF {stanceData.defenseMod >= 0 ? "+" : ""}{stanceData.defenseMod}
              </span>
            </div>
          )}

          {/* Hit rate */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Crosshair className="h-3 w-3" />
            <span>Hit Rate:</span>
            <span className="font-mono">
              {summary.totalRolls > 0
                ? `${Math.round((summary.hits / summary.totalRolls) * 100)}%`
                : "N/A"}
            </span>
          </div>

          {/* Average damage per hit */}
          {summary.hits > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Flame className="h-3 w-3" />
              <span>Avg per Hit:</span>
              <span className="font-mono">
                {Math.round(summary.totalDamage / summary.hits)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function VolleySummaryInline({
  summary,
  side,
}: {
  summary: VolleySummary;
  side: "attacker" | "defender";
}) {
  const isAttacker = side === "attacker";
  const color = isAttacker ? "text-amber-400" : "text-blue-400";

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", color)}>
      <span className="font-mono">{summary.hits}/{summary.totalRolls}</span>
      <span className="text-gray-500">|</span>
      <span className="font-mono">{formatDamage(summary.totalDamage)} dmg</span>
      {summary.criticals > 0 && (
        <>
          <span className="text-gray-500">|</span>
          <span className="text-amber-400 font-bold flex items-center gap-0.5">
            <Zap className="h-3 w-3" />
            {summary.criticals}
          </span>
        </>
      )}
    </span>
  );
}

export default VolleySummaryCard;
