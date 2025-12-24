/**
 * CombatPreview Component
 *
 * Shows power comparison before launching an attack.
 * Helps players understand the odds of success.
 */

import type { Forces } from "@/lib/combat";
import {
  calculateSpacePhasePower,
  calculateOrbitalPhasePower,
  calculateGroundPhasePower,
  SOLDIERS_PER_CARRIER,
} from "@/lib/combat";

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

function formatPower(power: number): string {
  if (power >= 1000000) {
    return `${(power / 1000000).toFixed(1)}M`;
  }
  if (power >= 1000) {
    return `${(power / 1000).toFixed(1)}K`;
  }
  return formatNumber(Math.round(power));
}

function getOddsColor(ratio: number): string {
  if (ratio >= 2.0) return "text-green-400"; // Very favorable
  if (ratio >= 1.2) return "text-lime-400"; // Favorable
  if (ratio >= 0.8) return "text-yellow-400"; // Even
  if (ratio >= 0.5) return "text-orange-400"; // Unfavorable
  return "text-red-400"; // Very unfavorable
}

function getOddsLabel(ratio: number): string {
  if (ratio >= 2.0) return "Overwhelming Advantage";
  if (ratio >= 1.5) return "Strong Advantage";
  if (ratio >= 1.2) return "Slight Advantage";
  if (ratio >= 0.8) return "Even Odds";
  if (ratio >= 0.5) return "Unfavorable Odds";
  return "Suicide Mission";
}

function calculateCarrierCapacity(carriers: number): number {
  return carriers * SOLDIERS_PER_CARRIER;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PhasePreviewProps {
  phase: "space" | "orbital" | "ground";
  attackerPower: number;
  defenderPower: number;
  icon: string;
  label: string;
}

function PhasePreview({ attackerPower, defenderPower, icon, label }: PhasePreviewProps) {
  const ratio = defenderPower > 0 ? attackerPower / defenderPower : Infinity;
  const percentage = Math.min(100, Math.round((ratio / (ratio + 1)) * 100));

  return (
    <div className="bg-gray-900/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm text-gray-300">{label}</span>
        </span>
        <span className={`text-sm font-semibold ${getOddsColor(ratio)}`}>
          {isFinite(ratio) ? `${ratio.toFixed(1)}:1` : "∞:1"}
        </span>
      </div>

      {/* Power Bar */}
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
        <div
          className="bg-lcars-amber h-full transition-all"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="bg-lcars-lavender h-full transition-all"
          style={{ width: `${100 - percentage}%` }}
        />
      </div>

      {/* Power Numbers */}
      <div className="flex justify-between text-xs mt-1">
        <span className="text-lcars-amber">{formatPower(attackerPower)}</span>
        <span className="text-lcars-lavender">{formatPower(defenderPower)}</span>
      </div>
    </div>
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
  // Calculate phase powers
  const spacePowerAttacker = calculateSpacePhasePower(attackerForces, false);
  const spacePowerDefender = calculateSpacePhasePower(defenderForces, true);

  const orbitalPowerAttacker = calculateOrbitalPhasePower(attackerForces, false);
  const orbitalPowerDefender = calculateOrbitalPhasePower(defenderForces, true);

  const groundPowerAttacker = calculateGroundPhasePower(attackerForces, false);
  const groundPowerDefender = calculateGroundPhasePower(defenderForces, true);

  // Calculate overall odds (product of phase ratios)
  const spaceRatio = spacePowerDefender > 0 ? spacePowerAttacker / spacePowerDefender : Infinity;
  const orbitalRatio = orbitalPowerDefender > 0 ? orbitalPowerAttacker / orbitalPowerDefender : Infinity;
  const groundRatio = groundPowerDefender > 0 ? groundPowerAttacker / groundPowerDefender : Infinity;

  // Must win all phases
  const worstRatio = Math.min(spaceRatio, orbitalRatio, groundRatio);

  // Calculate carrier capacity warning
  const carrierCapacity = calculateCarrierCapacity(attackerForces.carriers);
  const soldiersOverCapacity = attackerForces.soldiers > carrierCapacity;

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
          <p className="text-yellow-400 text-sm">
            ⚠️ Limited intelligence. Defender strength is estimated.
            Send spies for accurate data.
          </p>
        </div>
      )}

      {/* Carrier Capacity Warning */}
      {soldiersOverCapacity && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 mb-4">
          <p className="text-orange-400 text-sm">
            ⚠️ Insufficient carriers! Only {formatNumber(carrierCapacity)} of {formatNumber(attackerForces.soldiers)} soldiers can be transported.
            You need {Math.ceil(attackerForces.soldiers / SOLDIERS_PER_CARRIER)} carriers.
          </p>
        </div>
      )}

      {/* Overall Assessment */}
      <div className={`text-center p-4 rounded-lg mb-4 ${
        worstRatio >= 1.0 ? "bg-green-900/30" : "bg-red-900/30"
      }`}>
        <p className={`text-lg font-semibold ${getOddsColor(worstRatio)}`}>
          {getOddsLabel(worstRatio)}
        </p>
        <p className="text-gray-400 text-sm">
          Weakest phase ratio: {isFinite(worstRatio) ? worstRatio.toFixed(2) : "∞"}:1
        </p>
      </div>

      {/* Phase Breakdowns */}
      <div className="space-y-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-400">Combat Phases</h3>

        <PhasePreview
          phase="space"
          attackerPower={spacePowerAttacker}
          defenderPower={spacePowerDefender}
          icon="🚀"
          label="Phase 1: Space Combat"
        />

        <PhasePreview
          phase="orbital"
          attackerPower={orbitalPowerAttacker}
          defenderPower={orbitalPowerDefender}
          icon="🛸"
          label="Phase 2: Orbital Combat"
        />

        <PhasePreview
          phase="ground"
          attackerPower={groundPowerAttacker}
          defenderPower={groundPowerDefender}
          icon="⚔️"
          label="Phase 3: Ground Combat"
        />
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
              className={`px-6 py-2 font-semibold rounded transition-colors ${
                worstRatio >= 0.5
                  ? "bg-lcars-amber text-black hover:bg-lcars-amber/80"
                  : "bg-red-700 text-white hover:bg-red-600"
              }`}
            >
              {worstRatio < 0.5 ? "Attack Anyway" : "Launch Attack"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
