"use client";

/**
 * CombatNarrativeModal Component
 *
 * Main modal orchestrating the volley-by-volley combat experience.
 * Phases: Pre-Battle → Volley 1 → Volley 2 → Volley 3 → Outcome
 */

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { BattleResult, VolleyResult } from "@/lib/combat/volley-combat-v2";
import type { CombatStance } from "@/lib/combat/stances";
import { analyzeTheaterControl } from "@/lib/combat/theater-control";
import type { Forces } from "@/lib/combat/phases";
import { VolleySummaryCard } from "./VolleySummaryCard";
import { CombinedBonusDisplay } from "./BonusDisplay";
import {
  X,
  ChevronRight,
  Flag,
  Swords,
  Trophy,
  Skull,
  AlertTriangle,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CombatNarrativeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Full battle result with volley details */
  battleResult: BattleResult;
  /** Attacker empire name */
  attackerName: string;
  /** Defender empire name */
  defenderName: string;
  /** Attacker forces committed */
  attackerForces: Forces;
  /** Defender forces */
  defenderForces: Forces;
  /** Attacker combat stance */
  attackerStance?: CombatStance;
  /** Defender combat stance (AI-chosen) */
  defenderStance?: CombatStance;
  /** Optional retreat handler (available in volleys 1-2) */
  onRetreat?: (volleyNumber: 1 | 2) => void;
}

type NarrativePhase = "pre-battle" | "volley-1" | "volley-2" | "volley-3" | "outcome";

// =============================================================================
// HELPERS
// =============================================================================

function getPhaseIndex(phase: NarrativePhase): number {
  const phases: NarrativePhase[] = ["pre-battle", "volley-1", "volley-2", "volley-3", "outcome"];
  return phases.indexOf(phase);
}

function getNextPhase(current: NarrativePhase): NarrativePhase {
  const phases: NarrativePhase[] = ["pre-battle", "volley-1", "volley-2", "volley-3", "outcome"];
  const idx = phases.indexOf(current);
  return phases[Math.min(idx + 1, phases.length - 1)] as NarrativePhase;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CombatNarrativeModal({
  isOpen,
  onClose,
  battleResult,
  attackerName,
  defenderName,
  attackerForces,
  defenderForces,
  attackerStance,
  defenderStance,
  onRetreat,
}: CombatNarrativeModalProps) {
  // Current phase in the narrative
  const [currentPhase, setCurrentPhase] = useState<NarrativePhase>("pre-battle");

  // Theater analysis for bonus display
  const theaterAnalysis = analyzeTheaterControl(attackerForces, defenderForces);

  // Track volley scores
  const [attackerWins, setAttackerWins] = useState(0);
  const [defenderWins, setDefenderWins] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPhase("pre-battle");
      setAttackerWins(0);
      setDefenderWins(0);
    }
  }, [isOpen]);

  // Get current volley data
  const getCurrentVolley = useCallback((): VolleyResult | null => {
    const volleyIndex = getPhaseIndex(currentPhase) - 1; // pre-battle is 0, volley-1 is 1
    if (volleyIndex >= 0 && volleyIndex < battleResult.volleys.length) {
      return battleResult.volleys[volleyIndex] ?? null;
    }
    return null;
  }, [currentPhase, battleResult.volleys]);

  // Advance to next phase
  const handleContinue = useCallback(() => {
    const volley = getCurrentVolley();

    // Update scores when leaving a volley phase
    if (volley) {
      if (volley.volleyWinner === "attacker") {
        setAttackerWins((prev) => prev + 1);
      } else if (volley.volleyWinner === "defender") {
        setDefenderWins((prev) => prev + 1);
      }
    }

    setCurrentPhase(getNextPhase(currentPhase));
  }, [currentPhase, getCurrentVolley]);

  // Handle retreat
  const handleRetreat = useCallback(() => {
    if (onRetreat && (currentPhase === "volley-1" || currentPhase === "volley-2")) {
      const volleyNum = currentPhase === "volley-1" ? 1 : 2;
      onRetreat(volleyNum);
      onClose();
    }
  }, [currentPhase, onRetreat, onClose]);

  if (!isOpen) return null;

  const currentVolley = getCurrentVolley();
  const isOutcome = currentPhase === "outcome";
  // Determine winner from outcome
  const attackerWon = battleResult.outcome === "attacker_decisive" ||
    battleResult.outcome === "attacker_victory" ||
    battleResult.outcome === "defender_retreat";
  const sectorsCaptured = battleResult.sectorsCaptured;

  // Compute total damage from volleys
  const totalAttackerDamage = battleResult.volleys.reduce((sum, v) => sum + v.defenderDamage, 0);
  const totalDefenderDamage = battleResult.volleys.reduce((sum, v) => sum + v.attackerDamage, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto",
          "bg-gray-950 border-2 rounded-lg shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200",
          isOutcome
            ? attackerWon
              ? "border-amber-500"
              : "border-red-500"
            : "border-gray-700"
        )}
        data-testid="combat-narrative-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Swords className="h-6 w-6 text-amber-400" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isOutcome ? (attackerWon ? "VICTORY!" : "DEFEAT") : "BATTLE IN PROGRESS"}
                </h2>
                <p className="text-sm text-gray-400">
                  {attackerName} vs {defenderName}
                </p>
              </div>
            </div>

            {/* Volley Score */}
            {!isOutcome && currentPhase !== "pre-battle" && (
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase">Score</div>
                <div className="text-lg font-mono font-bold">
                  <span className="text-amber-400">{attackerWins}</span>
                  <span className="text-gray-600 mx-1">-</span>
                  <span className="text-blue-400">{defenderWins}</span>
                </div>
              </div>
            )}
          </div>

          {/* Phase Progress */}
          <div className="flex items-center gap-1 mt-3">
            {["pre-battle", "volley-1", "volley-2", "volley-3", "outcome"].map((phase, idx) => {
              const isCurrent = phase === currentPhase;
              const isPast = getPhaseIndex(currentPhase) > idx;
              return (
                <div
                  key={phase}
                  className={cn(
                    "flex-1 h-1.5 rounded-full transition-colors",
                    isCurrent
                      ? "bg-amber-500"
                      : isPast
                        ? "bg-amber-500/50"
                        : "bg-gray-800"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Pre-Battle Phase */}
          {currentPhase === "pre-battle" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold text-amber-400 mb-2">
                  Prepare for Battle
                </h3>
                <p className="text-gray-400">
                  Best of 3 volleys. Win 2 to claim victory.
                </p>
              </div>

              {/* Active Bonuses */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
                  Active Bonuses
                </h4>
                <CombinedBonusDisplay
                  attackerStance={attackerStance}
                  defenderStance={defenderStance}
                  attackerTheaterBonuses={theaterAnalysis.attackerBonuses}
                  defenderTheaterBonuses={theaterAnalysis.defenderBonuses}
                />
              </div>
            </div>
          )}

          {/* Volley Phases */}
          {(currentPhase === "volley-1" ||
            currentPhase === "volley-2" ||
            currentPhase === "volley-3") &&
            currentVolley && (
              <div className="space-y-4">
                {/* Volley Header */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white">
                    VOLLEY {currentPhase.split("-")[1]} of 3
                  </h3>
                </div>

                {/* Attacker's Roll */}
                <VolleySummaryCard
                  volley={currentVolley}
                  side="attacker"
                  stance={attackerStance}
                  isWinner={currentVolley.volleyWinner === "attacker"}
                  expanded
                />

                {/* Defender's Roll */}
                <VolleySummaryCard
                  volley={currentVolley}
                  side="defender"
                  stance={defenderStance}
                  isWinner={currentVolley.volleyWinner === "defender"}
                  expanded
                />

                {/* Volley Result */}
                <div
                  className={cn(
                    "text-center p-3 rounded-lg border-2",
                    currentVolley.volleyWinner === "attacker"
                      ? "bg-amber-950/40 border-amber-500 text-amber-400"
                      : currentVolley.volleyWinner === "defender"
                        ? "bg-blue-950/40 border-blue-500 text-blue-400"
                        : "bg-gray-800 border-gray-600 text-gray-400"
                  )}
                >
                  <span className="font-bold uppercase">
                    Volley Winner: {currentVolley.volleyWinner === "attacker" ? "You" : currentVolley.volleyWinner === "defender" ? defenderName : "Tie"}
                  </span>
                </div>

                {/* Compact Bonus Display */}
                <CombinedBonusDisplay
                  attackerStance={attackerStance}
                  defenderStance={defenderStance}
                  attackerTheaterBonuses={theaterAnalysis.attackerBonuses}
                  defenderTheaterBonuses={theaterAnalysis.defenderBonuses}
                  compact
                />
              </div>
            )}

          {/* Outcome Phase */}
          {isOutcome && (
            <div className="space-y-4">
              {/* Victory/Defeat Banner */}
              <div
                className={cn(
                  "text-center p-6 rounded-lg border-2",
                  attackerWon
                    ? "bg-amber-950/40 border-amber-500"
                    : "bg-red-950/40 border-red-500"
                )}
              >
                <div className="flex justify-center mb-3">
                  {attackerWon ? (
                    <Trophy className="h-12 w-12 text-amber-400 animate-bounce" />
                  ) : (
                    <Skull className="h-12 w-12 text-red-400" />
                  )}
                </div>
                <h3
                  className={cn(
                    "text-2xl font-bold mb-2",
                    attackerWon ? "text-amber-400" : "text-red-400"
                  )}
                >
                  {attackerWon ? "VICTORY!" : "DEFEAT"}
                </h3>
                <p className="text-gray-400">
                  Final Score:{" "}
                  <span className="font-mono font-bold text-amber-400">
                    {battleResult.volleyScore.attacker}
                  </span>
                  {" - "}
                  <span className="font-mono font-bold text-blue-400">
                    {battleResult.volleyScore.defender}
                  </span>
                </p>
              </div>

              {/* Sectors Captured */}
              {sectorsCaptured > 0 && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-950/40 border border-green-700 rounded-lg">
                  <Flag className="h-5 w-5 text-green-400" />
                  <span className="text-green-400 font-semibold">
                    {sectorsCaptured} Sector{sectorsCaptured > 1 ? "s" : ""} Captured!
                  </span>
                </div>
              )}

              {/* Ground Superiority Note */}
              {theaterAnalysis.attackerHasGroundSuperiority && !attackerWon && (
                <div className="flex items-center gap-2 p-3 bg-purple-950/40 border border-purple-700 rounded-lg text-sm text-purple-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Ground Superiority allowed sector capture despite losing volleys</span>
                </div>
              )}

              {/* Total Casualties Summary */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
                  Battle Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-amber-400 font-semibold mb-1">Your Losses</div>
                    <div className="text-gray-400">
                      Total damage taken: {totalDefenderDamage.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-semibold mb-1">Enemy Losses</div>
                    <div className="text-gray-400">
                      Total damage dealt: {totalAttackerDamage.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          {/* Retreat Button (volleys 1-2 only) */}
          {onRetreat &&
            (currentPhase === "volley-1" || currentPhase === "volley-2") && (
              <button
                onClick={handleRetreat}
                className="px-4 py-2 bg-red-900/50 text-red-400 border border-red-700 rounded-lg hover:bg-red-900/70 transition-colors flex items-center gap-2"
              >
                <Flag className="h-4 w-4" />
                Retreat (15% losses)
              </button>
            )}
          {!onRetreat ||
            (currentPhase !== "volley-1" && currentPhase !== "volley-2") ? (
              <div /> // Spacer
            ) : null}

          {/* Continue / Dismiss Button */}
          {isOutcome ? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-2"
            >
              Dismiss
            </button>
          ) : (
            <button
              onClick={handleContinue}
              className="px-6 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-2"
            >
              {currentPhase === "pre-battle" ? "Begin Battle" : "Continue"}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CombatNarrativeModal;
