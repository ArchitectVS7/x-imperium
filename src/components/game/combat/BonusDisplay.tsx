"use client";

/**
 * BonusDisplay Component
 *
 * Displays combat bonuses prominently during battle.
 * Shows stance effects and theater bonuses as styled cards.
 */

import { getStanceModifiers, type CombatStance } from "@/lib/combat/stances";
import type { TheaterBonus } from "@/lib/combat/theater-control";
import { cn } from "@/lib/utils";
import { Swords, Shield, Target, Rocket, Users, CircleDot, Zap } from "lucide-react";

interface BonusDisplayProps {
  /** Combat stance for the side */
  stance?: CombatStance;
  /** Theater bonuses earned */
  theaterBonuses: TheaterBonus[];
  /** Which side these bonuses belong to */
  side: "attacker" | "defender";
  /** Compact mode for smaller displays */
  compact?: boolean;
}

// Icon mapping for theater bonuses
const theaterIcons: Record<string, React.ReactNode> = {
  "Space Dominance": <Rocket className="h-4 w-4" />,
  "Orbital Shield": <CircleDot className="h-4 w-4" />,
  "Ground Superiority": <Users className="h-4 w-4" />,
};

/**
 * Format modifier for display (+3, -2, etc.)
 */
function formatMod(mod: number, prefix = ""): string {
  if (mod > 0) return `${prefix}+${mod}`;
  if (mod < 0) return `${prefix}${mod}`;
  return `${prefix}0`;
}

export function BonusDisplay({
  stance,
  theaterBonuses,
  side,
  compact = false,
}: BonusDisplayProps) {
  const stanceData = stance ? getStanceModifiers(stance) : null;
  const hasAnyBonus = stanceData || theaterBonuses.length > 0;

  if (!hasAnyBonus) {
    return null;
  }

  // Determine side styling
  const sideColor = side === "attacker" ? "amber" : "blue";
  const sideLabel = side === "attacker" ? "Your Bonuses" : "Enemy Bonuses";

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {/* Stance chip */}
        {stanceData && stance !== "balanced" && (
          <div
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              `bg-${sideColor}-900/50 text-${sideColor}-300 border border-${sideColor}-700/50`
            )}
          >
            <Target className="h-3 w-3" />
            <span>{stanceData.label}</span>
            <span className="font-mono">{formatMod(stanceData.attackMod)}</span>
          </div>
        )}

        {/* Theater bonus chips */}
        {theaterBonuses.map((bonus) => (
          <div
            key={bonus.name}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              bonus.specialEffect
                ? "bg-purple-900/50 text-purple-300 border border-purple-700/50"
                : `bg-${sideColor}-900/50 text-${sideColor}-300 border border-${sideColor}-700/50`
            )}
          >
            {theaterIcons[bonus.name] || <Zap className="h-3 w-3" />}
            <span>{bonus.name}</span>
            {bonus.attackMod !== 0 && (
              <span className="font-mono text-green-400">{formatMod(bonus.attackMod, "ATK")}</span>
            )}
            {bonus.defenseMod !== 0 && (
              <span className="font-mono text-blue-400">{formatMod(bonus.defenseMod, "DEF")}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <h4 className={cn(
        "text-xs font-medium uppercase tracking-wider",
        side === "attacker" ? "text-amber-400" : "text-blue-400"
      )}>
        {sideLabel}
      </h4>

      <div className="flex flex-wrap gap-2">
        {/* Stance Bonus Card */}
        {stanceData && stance !== "balanced" && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border",
              side === "attacker"
                ? "bg-amber-950/40 border-amber-700/50"
                : "bg-blue-950/40 border-blue-700/50"
            )}
          >
            <div className={cn(
              "p-1.5 rounded",
              side === "attacker" ? "bg-amber-900/60" : "bg-blue-900/60"
            )}>
              <Target className={cn(
                "h-4 w-4",
                side === "attacker" ? "text-amber-400" : "text-blue-400"
              )} />
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-200">{stanceData.label}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-0.5">
                  <Swords className="h-3 w-3 text-gray-500" />
                  <span className={cn(
                    "font-mono",
                    stanceData.attackMod > 0 ? "text-green-400" : stanceData.attackMod < 0 ? "text-red-400" : "text-gray-400"
                  )}>
                    {formatMod(stanceData.attackMod)}
                  </span>
                </span>
                <span className="flex items-center gap-0.5">
                  <Shield className="h-3 w-3 text-gray-500" />
                  <span className={cn(
                    "font-mono",
                    stanceData.defenseMod > 0 ? "text-green-400" : stanceData.defenseMod < 0 ? "text-red-400" : "text-gray-400"
                  )}>
                    {formatMod(stanceData.defenseMod)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Theater Bonus Cards */}
        {theaterBonuses.map((bonus) => (
          <div
            key={bonus.name}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border",
              bonus.specialEffect
                ? "bg-purple-950/40 border-purple-700/50"
                : side === "attacker"
                  ? "bg-amber-950/40 border-amber-700/50"
                  : "bg-blue-950/40 border-blue-700/50"
            )}
          >
            <div className={cn(
              "p-1.5 rounded",
              bonus.specialEffect
                ? "bg-purple-900/60"
                : side === "attacker" ? "bg-amber-900/60" : "bg-blue-900/60"
            )}>
              <span className={cn(
                bonus.specialEffect
                  ? "text-purple-400"
                  : side === "attacker" ? "text-amber-400" : "text-blue-400"
              )}>
                {theaterIcons[bonus.name] || <Zap className="h-4 w-4" />}
              </span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-200">{bonus.name}</div>
              <div className="text-xs">
                {bonus.specialEffect ? (
                  <span className="text-purple-300">{bonus.specialEffect}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    {bonus.attackMod !== 0 && (
                      <span className="flex items-center gap-0.5">
                        <Swords className="h-3 w-3 text-gray-500" />
                        <span className="font-mono text-green-400">{formatMod(bonus.attackMod)}</span>
                      </span>
                    )}
                    {bonus.defenseMod !== 0 && (
                      <span className="flex items-center gap-0.5">
                        <Shield className="h-3 w-3 text-gray-500" />
                        <span className="font-mono text-blue-400">{formatMod(bonus.defenseMod)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Combined bonus display showing both attacker and defender bonuses
 */
interface CombinedBonusDisplayProps {
  attackerStance?: CombatStance;
  defenderStance?: CombatStance;
  attackerTheaterBonuses: TheaterBonus[];
  defenderTheaterBonuses: TheaterBonus[];
  compact?: boolean;
}

export function CombinedBonusDisplay({
  attackerStance,
  defenderStance,
  attackerTheaterBonuses,
  defenderTheaterBonuses,
  compact = false,
}: CombinedBonusDisplayProps) {
  const hasAttackerBonuses =
    (attackerStance && attackerStance !== "balanced") ||
    attackerTheaterBonuses.length > 0;
  const hasDefenderBonuses =
    (defenderStance && defenderStance !== "balanced") ||
    defenderTheaterBonuses.length > 0;

  if (!hasAttackerBonuses && !hasDefenderBonuses) {
    return (
      <div className="text-xs text-gray-500 text-center py-2">
        No active bonuses
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-2")}>
      {hasAttackerBonuses && (
        <BonusDisplay
          stance={attackerStance}
          theaterBonuses={attackerTheaterBonuses}
          side="attacker"
          compact={compact}
        />
      )}
      {hasDefenderBonuses && (
        <BonusDisplay
          stance={defenderStance}
          theaterBonuses={defenderTheaterBonuses}
          side="defender"
          compact={compact}
        />
      )}
    </div>
  );
}

export default BonusDisplay;
