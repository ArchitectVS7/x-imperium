/**
 * CombatPreview Component
 *
 * Shows win probability and force comparison before launching an attack.
 * Uses the D20 volley combat system for probability estimation.
 */

import { useMemo } from "react";
import type { Forces } from "@/lib/combat";
import {
  SOLDIERS_PER_CARRIER,
  estimateWinProbability,
} from "@/lib/combat";
import { UIIcons } from "@/lib/theme/icons";
import { Swords, Target, Percent } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CombatPreviewProps {
  /** Attacking forces */
  attackerForces: Forces;
  /** Defender forces (may be fog-of-war estimated) */
  defenderForces: Forces;
  /** Attacker name */
  attackerName: string;
  /** Defender name */
  defenderName: string;
  /** Whether we have full intelligence on defender */
  hasFullIntel?: boolean;
  /** Attacker army effectiveness (0-100) */
  attackerEffectiveness?: number;
  /** Defender army effectiveness (0-100, may be unknown) */
  defenderEffectiveness?: number;
  /** Callback when attack is confirmed */
  onConfirmAttack?: () => void;
  /** Callback when attack is cancelled */
  onCancel?: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function getOddsColor(winProb: number): string {
  if (winProb >= 0.7) return "text-green-400"; // Very favorable
  if (winProb >= 0.55) return "text-lime-400"; // Favorable
  if (winProb >= 0.45) return "text-yellow-400"; // Even
  if (winProb >= 0.3) return "text-orange-400"; // Unfavorable
  return "text-red-400"; // Very unfavorable
}

function getOddsLabel(winProb: number): string {
  if (winProb >= 0.7) return "Overwhelming Advantage";
  if (winProb >= 0.6) return "Strong Advantage";
  if (winProb >= 0.55) return "Slight Advantage";
  if (winProb >= 0.45) return "Even Odds";
  if (winProb >= 0.3) return "Unfavorable Odds";
  return "Suicide Mission";
}

function calculateCarrierCapacity(carriers: number): number {
  return carriers * SOLDIERS_PER_CARRIER;
}

function getTotalForces(forces: Forces): number {
  return (
    forces.soldiers +
    forces.fighters +
    forces.stations +
    forces.lightCruisers +
    forces.heavyCruisers +
    forces.carriers
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CombatPreview({
  attackerForces,
  defenderForces,
  attackerName,
  defenderName,
  hasFullIntel = false,
  attackerEffectiveness = 85,
  defenderEffectiveness,
  onConfirmAttack,
  onCancel,
}: CombatPreviewProps) {
  // Calculate win probability using Monte Carlo (50 iterations for preview)
  const winProbability = useMemo(() => {
    return estimateWinProbability(
      attackerForces,
      defenderForces,
      "balanced",
      "balanced",
      50
    );
  }, [attackerForces, defenderForces]);

  // Calculate carrier capacity warning
  const carrierCapacity = calculateCarrierCapacity(attackerForces.carriers);
  const soldiersOverCapacity = attackerForces.soldiers > carrierCapacity;

  // Calculate force totals
  const attackerTotal = getTotalForces(attackerForces);
  const defenderTotal = getTotalForces(defenderForces);
  const forceRatio = defenderTotal > 0 ? attackerTotal / defenderTotal : Infinity;

  return (
    <div className="lcars-panel max-w-lg mx-auto" data-testid="combat-preview">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-lcars-amber">Combat Preview</h2>
        <p className="text-gray-400 text-sm">
          {attackerName} vs {defenderName}
        </p>
      </div>

      {/* Intelligence Warning */}
      {!hasFullIntel && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm flex items-center gap-1">
            <UIIcons.warning className="w-4 h-4 flex-shrink-0" />
            <span>Limited intelligence. Defender strength is estimated. Send spies for accurate data.</span>
          </p>
        </div>
      )}

      {/* Carrier Capacity Warning */}
      {soldiersOverCapacity && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 mb-4">
          <p className="text-orange-400 text-sm flex items-center gap-1">
            <UIIcons.warning className="w-4 h-4 flex-shrink-0" />
            <span>Insufficient carriers! Only {formatNumber(carrierCapacity)} of {formatNumber(attackerForces.soldiers)} soldiers can be transported. You need {Math.ceil(attackerForces.soldiers / SOLDIERS_PER_CARRIER)} carriers.</span>
          </p>
        </div>
      )}

      {/* Overall Assessment */}
      <div className={`text-center p-4 rounded-lg mb-4 ${
        winProbability >= 0.5 ? "bg-green-900/30" : "bg-red-900/30"
      }`}>
        <p className={`text-lg font-semibold ${getOddsColor(winProbability)}`}>
          {getOddsLabel(winProbability)}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Estimated win probability: <span className={getOddsColor(winProbability)}>{formatPercent(winProbability)}</span>
        </p>
      </div>

      {/* Combat Stats */}
      <div className="space-y-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-400">Battle Analysis</h3>

        {/* Win Probability Bar */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-300">Win Probability</span>
            </span>
            <span className={`text-sm font-semibold ${getOddsColor(winProbability)}`}>
              {formatPercent(winProbability)}
            </span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
            <div
              className="bg-lcars-amber h-full transition-all"
              style={{ width: `${winProbability * 100}%` }}
            />
            <div
              className="bg-lcars-lavender h-full transition-all"
              style={{ width: `${(1 - winProbability) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-lcars-amber">{attackerName}</span>
            <span className="text-lcars-lavender">{defenderName}</span>
          </div>
        </div>

        {/* Force Comparison */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-300">Force Ratio</span>
            </span>
            <span className={`text-sm font-semibold ${forceRatio >= 1 ? "text-green-400" : "text-orange-400"}`}>
              {isFinite(forceRatio) ? `${forceRatio.toFixed(1)}:1` : "∞:1"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Your Forces: </span>
              <span className="text-lcars-amber font-mono">{formatNumber(attackerTotal)}</span>
            </div>
            <div>
              <span className="text-gray-400">Enemy Forces: </span>
              <span className="text-lcars-lavender font-mono">{formatNumber(defenderTotal)}</span>
            </div>
          </div>
        </div>

        {/* Combat Info */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-300">D20 Volley Combat</span>
          </div>
          <p className="text-xs text-gray-500">
            Best of 3 volleys. Each unit rolls D20 + TAR vs enemy DEF. Theater bonuses and stances affect rolls.
          </p>
        </div>
      </div>

      {/* Army Effectiveness */}
      <div className="border-t border-gray-700 pt-4 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Your Effectiveness: </span>
            <span className="text-lcars-amber font-mono">{attackerEffectiveness}%</span>
          </div>
          <div>
            <span className="text-gray-400">Enemy Effectiveness: </span>
            {defenderEffectiveness !== undefined ? (
              <span className="text-lcars-lavender font-mono">{defenderEffectiveness}%</span>
            ) : (
              <span className="text-gray-500">Unknown</span>
            )}
          </div>
        </div>
      </div>

      {/* Force Summary */}
      <div className="border-t border-gray-700 pt-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Your Forces</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-400 font-mono">{formatNumber(attackerForces.soldiers)}</div>
            <div className="text-gray-500">Soldiers</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-mono">{formatNumber(attackerForces.fighters)}</div>
            <div className="text-gray-500">Fighters</div>
          </div>
          <div className="text-center">
            <div className="text-cyan-400 font-mono">{formatNumber(attackerForces.lightCruisers)}</div>
            <div className="text-gray-500">L. Cruisers</div>
          </div>
          <div className="text-center">
            <div className="text-orange-400 font-mono">{formatNumber(attackerForces.heavyCruisers)}</div>
            <div className="text-gray-500">H. Cruisers</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-mono">{formatNumber(attackerForces.carriers)}</div>
            <div className="text-gray-500">Carriers</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-mono">{formatNumber(attackerForces.stations)}</div>
            <div className="text-gray-500">Stations</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(onConfirmAttack || onCancel) && (
        <div className="flex gap-3 justify-center">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 text-gray-200 font-semibold rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
          {onConfirmAttack && (
            <button
              onClick={onConfirmAttack}
              data-testid="launch-attack-button"
              className={`px-6 py-2 font-semibold rounded transition-colors ${
                winProbability >= 0.3
                  ? "bg-lcars-amber text-black hover:bg-lcars-amber/80"
                  : "bg-red-700 text-white hover:bg-red-600"
              }`}
            >
              {winProbability < 0.3 ? "Attack Anyway" : "Launch Attack"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
