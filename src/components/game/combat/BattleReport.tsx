/**
 * BattleReport Component
 *
 * Displays a complete battle report showing all 3 combat phases:
 * 1. Space Combat - Cruisers vs Cruisers
 * 2. Orbital Combat - Fighters vs Stations
 * 3. Ground Combat - Soldiers capture sectors
 *
 * Each phase shows power comparison, casualties, and outcome.
 */

import type { PhaseResult, CombatResult } from "@/lib/combat";
import { CasualtyReport } from "./CasualtyReport";
import { Rocket, CircleDot, Swords, Scale, Trophy, Shield, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface BattleReportProps {
  /** The complete combat result */
  result: CombatResult;
  /** Name of the attacking empire */
  attackerName: string;
  /** Name of the defending empire */
  defenderName: string;
  /** Optional callback when report is dismissed */
  onDismiss?: () => void;
}

interface PhaseReportProps {
  phase: PhaseResult;
  attackerName: string;
  defenderName: string;
}

// =============================================================================
// PHASE ICONS & LABELS
// =============================================================================

const PHASE_CONFIG: Record<string, { icon: LucideIcon; label: string; description: string; color: string; bgColor: string }> = {
  space: {
    icon: Rocket,
    label: "Space Combat",
    description: "Cruisers clash for space superiority",
    color: "text-blue-400",
    bgColor: "bg-blue-900/30",
  },
  orbital: {
    icon: CircleDot,
    label: "Orbital Combat",
    description: "Fighters vs Stations for orbital control",
    color: "text-purple-400",
    bgColor: "bg-purple-900/30",
  },
  ground: {
    icon: Swords,
    label: "Ground Combat",
    description: "Soldiers fight to capture sectors",
    color: "text-green-400",
    bgColor: "bg-green-900/30",
  },
  guerilla: {
    icon: Swords,
    label: "Guerilla Raid",
    description: "Quick strike raid",
    color: "text-orange-400",
    bgColor: "bg-orange-900/30",
  },
  pirate_defense: {
    icon: Shield,
    label: "Pirate Defense",
    description: "Defending against pirates",
    color: "text-red-400",
    bgColor: "bg-red-900/30",
  },
};

const OUTCOME_CONFIG: Record<string, { icon: LucideIcon; label: string; description: string; color: string; bgColor: string }> = {
  attacker_victory: {
    icon: Trophy,
    label: "Victory",
    description: "Invasion Successful",
    color: "text-green-400",
    bgColor: "bg-green-900/50",
  },
  defender_victory: {
    icon: Shield,
    label: "Defended",
    description: "Invasion Repelled",
    color: "text-red-400",
    bgColor: "bg-red-900/50",
  },
  retreat: {
    icon: UserX,
    label: "Retreat",
    description: "Forces Withdrew",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/50",
  },
  stalemate: {
    icon: Scale,
    label: "Stalemate",
    description: "No Victor",
    color: "text-gray-400",
    bgColor: "bg-gray-900/50",
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPower(power: number): string {
  if (power >= 1000000) {
    return `${(power / 1000000).toFixed(1)}M`;
  }
  if (power >= 1000) {
    return `${(power / 1000).toFixed(1)}K`;
  }
  return formatNumber(Math.round(power));
}

function getWinnerColor(winner: "attacker" | "defender" | "draw"): string {
  switch (winner) {
    case "attacker":
      return "text-green-400";
    case "defender":
      return "text-red-400";
    default:
      return "text-yellow-400";
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PhaseReport({ phase, attackerName, defenderName }: PhaseReportProps) {
  const config = PHASE_CONFIG[phase.phase];
  if (!config) return null;
  const IconComponent = config.icon;
  const winnerLabel = phase.winner === "attacker" ? attackerName :
                      phase.winner === "defender" ? defenderName : "Draw";

  return (
    <div className={`${config.bgColor} rounded-lg p-4 border border-gray-700`}>
      {/* Phase Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconComponent className={`w-8 h-8 ${config.color}`} />
          <div>
            <h4 className={`font-semibold ${config.color}`}>
              Phase {phase.phaseNumber}: {config.label}
            </h4>
            <p className="text-xs text-gray-400">{config.description}</p>
          </div>
        </div>
        <div className={`text-sm font-semibold ${getWinnerColor(phase.winner)}`}>
          {phase.winner === "draw" ? "Draw" : `${winnerLabel} Wins`}
        </div>
      </div>

      {/* Power Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">{attackerName}</div>
          <div className="text-xl font-mono text-lcars-amber">
            {formatPower(phase.attackerPower)}
          </div>
          <div className="text-xs text-gray-500">Combat Power</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">{defenderName}</div>
          <div className="text-xl font-mono text-lcars-lavender">
            {formatPower(phase.defenderPower)}
          </div>
          <div className="text-xs text-gray-500">Combat Power</div>
        </div>
      </div>

      {/* Phase Casualties */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <CasualtyReport
          casualties={phase.attackerCasualties}
          label={`${attackerName} Losses`}
          compact
        />
        <CasualtyReport
          casualties={phase.defenderCasualties}
          label={`${defenderName} Losses`}
          compact
        />
      </div>

      {/* Phase Description */}
      <p className="text-xs text-gray-400 mt-2 italic">{phase.description}</p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BattleReport({
  result,
  attackerName,
  defenderName,
  onDismiss,
}: BattleReportProps) {
  const outcomeConfig = OUTCOME_CONFIG[result.outcome];
  if (!outcomeConfig) return null;
  const OutcomeIcon = outcomeConfig.icon;

  return (
    <div
      className="lcars-panel max-w-2xl mx-auto"
      data-testid="battle-report"
      role="region"
      aria-live="polite"
      aria-label="Battle report"
    >
      {/* Header */}
      <div className={`${outcomeConfig.bgColor} rounded-lg p-4 mb-4 text-center`}>
        <OutcomeIcon className={`w-12 h-12 mx-auto mb-2 ${outcomeConfig.color}`} />
        <h2 className={`text-2xl font-bold ${outcomeConfig.color}`}>
          {outcomeConfig.label}
        </h2>
        <p className="text-gray-300">{outcomeConfig.description}</p>
        {result.planetsCaptured > 0 && (
          <p className="text-green-400 mt-2 font-semibold">
            {result.planetsCaptured} sector{result.planetsCaptured !== 1 ? "s" : ""} captured!
          </p>
        )}
      </div>

      {/* Combat Phases */}
      <div className="space-y-4 mb-4">
        <h3 className="text-lg font-semibold text-lcars-lavender">Combat Phases</h3>
        {result.phases.map((phase, index) => (
          <PhaseReport
            key={`${phase.phase}-${index}`}
            phase={phase}
            attackerName={attackerName}
            defenderName={defenderName}
          />
        ))}
      </div>

      {/* Total Casualties Summary */}
      <div className="border-t border-gray-700 pt-4 mb-4">
        <h3 className="text-lg font-semibold text-lcars-lavender mb-3">Total Casualties</h3>
        <div className="grid grid-cols-2 gap-4">
          <CasualtyReport
            casualties={result.attackerTotalCasualties}
            label={attackerName}
          />
          <CasualtyReport
            casualties={result.defenderTotalCasualties}
            label={defenderName}
          />
        </div>
      </div>

      {/* Effectiveness Changes */}
      <div className="border-t border-gray-700 pt-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Army Effectiveness Changes</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>{attackerName}:</span>
            <span className={result.attackerEffectivenessChange >= 0 ? "text-green-400" : "text-red-400"}>
              {result.attackerEffectivenessChange >= 0 ? "+" : ""}
              {result.attackerEffectivenessChange}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>{defenderName}:</span>
            <span className={result.defenderEffectivenessChange >= 0 ? "text-green-400" : "text-red-400"}>
              {result.defenderEffectivenessChange >= 0 ? "+" : ""}
              {result.defenderEffectivenessChange}%
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-gray-300 text-center italic">{result.summary}</p>

      {/* Dismiss Button */}
      {onDismiss && (
        <div className="mt-4 text-center">
          <button
            onClick={onDismiss}
            className="px-6 py-2 bg-lcars-amber text-black font-semibold rounded hover:bg-lcars-amber/80 transition-colors"
          >
            Dismiss Report
          </button>
        </div>
      )}
    </div>
  );
}
