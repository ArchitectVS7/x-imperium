"use client";

/**
 * StanceSelector Component
 *
 * Pre-combat stance selection with effect preview.
 * Displays a 2x2 grid of combat stances with their modifiers.
 */

import { useState } from "react";
import { getAllStances, getStanceModifiers, type CombatStance } from "@/lib/combat/stances";
import { cn } from "@/lib/utils";
import { Swords, Shield, Target, Wind, Info } from "lucide-react";

interface StanceSelectorProps {
  selectedStance: CombatStance;
  onStanceChange: (stance: CombatStance) => void;
  disabled?: boolean;
}

// Icons for each stance
const stanceIcons: Record<CombatStance, React.ReactNode> = {
  aggressive: <Swords className="h-5 w-5" />,
  balanced: <Target className="h-5 w-5" />,
  defensive: <Shield className="h-5 w-5" />,
  evasive: <Wind className="h-5 w-5" />,
};

// Color themes for each stance (LCARS-inspired)
const stanceColors: Record<CombatStance, { bg: string; border: string; text: string; selected: string }> = {
  aggressive: {
    bg: "bg-red-950/30",
    border: "border-red-700/50",
    text: "text-red-400",
    selected: "bg-red-900/60 border-red-500",
  },
  balanced: {
    bg: "bg-amber-950/30",
    border: "border-amber-700/50",
    text: "text-amber-400",
    selected: "bg-amber-900/60 border-amber-500",
  },
  defensive: {
    bg: "bg-blue-950/30",
    border: "border-blue-700/50",
    text: "text-blue-400",
    selected: "bg-blue-900/60 border-blue-500",
  },
  evasive: {
    bg: "bg-emerald-950/30",
    border: "border-emerald-700/50",
    text: "text-emerald-400",
    selected: "bg-emerald-900/60 border-emerald-500",
  },
};

/**
 * Format modifier for display (+3, -2, etc.)
 */
function formatModifier(mod: number): string {
  if (mod > 0) return `+${mod}`;
  if (mod < 0) return `${mod}`;
  return "0";
}

/**
 * Format casualty multiplier as percentage
 */
function formatCasualty(multiplier: number): string {
  const percent = Math.round((multiplier - 1) * 100);
  if (percent > 0) return `+${percent}%`;
  if (percent < 0) return `${percent}%`;
  return "0%";
}

export function StanceSelector({
  selectedStance,
  onStanceChange,
  disabled = false,
}: StanceSelectorProps) {
  const [hoveredStance, setHoveredStance] = useState<CombatStance | null>(null);
  const allStances = getAllStances();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
          Combat Stance
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Info className="h-3 w-3" />
          <span>Affects attack and defense rolls</span>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2">
        {allStances.map((stanceId) => {
          const stance = getStanceModifiers(stanceId);
          const isSelected = selectedStance === stanceId;
          const colors = stanceColors[stanceId];
          const icon = stanceIcons[stanceId];

          return (
            <button
              key={stanceId}
              type="button"
              onClick={() => !disabled && onStanceChange(stanceId)}
              onMouseEnter={() => setHoveredStance(stanceId)}
              onMouseLeave={() => setHoveredStance(null)}
              disabled={disabled}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900",
                disabled && "opacity-50 cursor-not-allowed",
                isSelected
                  ? cn(colors.selected, "ring-2 ring-offset-2 ring-offset-gray-900", colors.text.replace("text-", "ring-"))
                  : cn(colors.bg, colors.border, "hover:border-opacity-100")
              )}
              data-testid={`stance-${stanceId}`}
            >
              {/* Stance Icon and Name */}
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(colors.text)}>{icon}</span>
                <span className={cn("font-semibold", isSelected ? "text-white" : "text-gray-200")}>
                  {stance.label}
                </span>
              </div>

              {/* Modifiers */}
              <div className="flex items-center gap-3 text-xs">
                {/* Attack Modifier */}
                <div className="flex items-center gap-1">
                  <Swords className="h-3 w-3 text-gray-500" />
                  <span
                    className={cn(
                      "font-mono",
                      stance.attackMod > 0 ? "text-green-400" : stance.attackMod < 0 ? "text-red-400" : "text-gray-400"
                    )}
                  >
                    {formatModifier(stance.attackMod)}
                  </span>
                </div>

                {/* Defense Modifier */}
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-gray-500" />
                  <span
                    className={cn(
                      "font-mono",
                      stance.defenseMod > 0 ? "text-green-400" : stance.defenseMod < 0 ? "text-red-400" : "text-gray-400"
                    )}
                  >
                    {formatModifier(stance.defenseMod)}
                  </span>
                </div>

                {/* Casualty Modifier */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-[10px]">CAS</span>
                  <span
                    className={cn(
                      "font-mono",
                      stance.casualtyMultiplier < 1 ? "text-green-400" : stance.casualtyMultiplier > 1 ? "text-red-400" : "text-gray-400"
                    )}
                  >
                    {formatCasualty(stance.casualtyMultiplier)}
                  </span>
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <div className={cn("w-2 h-2 rounded-full", colors.text.replace("text-", "bg-"))} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tooltip / Description */}
      {hoveredStance && (
        <div className="text-xs text-gray-400 bg-gray-900/80 rounded px-3 py-2 border border-gray-700">
          {getStanceModifiers(hoveredStance).description}
        </div>
      )}
    </div>
  );
}

export default StanceSelector;
