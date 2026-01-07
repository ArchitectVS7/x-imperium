"use client";

import { Crown } from "lucide-react";
import type { EmpireMapData } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface BossDetailPanelProps {
  empire: EmpireMapData;
  currentTurn: number;
  onClose?: () => void;
}

// =============================================================================
// BOSS DETAIL PANEL
// =============================================================================

/**
 * BossDetailPanel Component
 *
 * Displays detailed information about a boss (dominant empire).
 * Shows battle wins, networth ratio, time as boss, and containment bonus info.
 */
export function BossDetailPanel({
  empire,
  currentTurn,
  onClose,
}: BossDetailPanelProps) {
  if (!empire.isBoss) {
    return null;
  }

  const turnsSinceBoss = empire.bossEmergenceTurn
    ? currentTurn - empire.bossEmergenceTurn
    : 0;

  const networthPercentage = empire.networthRatio
    ? (empire.networthRatio * 100).toFixed(0)
    : "200+";

  return (
    <div
      className="bg-gray-900/95 border-2 border-red-500/50 rounded-lg p-4 shadow-lg shadow-red-500/20"
      data-testid="boss-detail-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span className="text-red-400 font-bold text-sm uppercase tracking-wide">
            Dominant Empire
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Empire Name */}
      <div className="text-lg font-bold text-white mb-3">{empire.name}</div>

      {/* Stats */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Battles Won:</span>
          <span className="text-red-400 font-mono">
            {empire.battleWins ?? "5+"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Networth:</span>
          <span className="text-red-400 font-mono">
            {networthPercentage}% of avg
          </span>
        </div>
        {empire.bossEmergenceTurn && (
          <div className="flex justify-between">
            <span className="text-gray-400">Boss Since:</span>
            <span className="text-gray-300 font-mono">
              Turn {empire.bossEmergenceTurn} ({turnsSinceBoss} turns ago)
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Planets:</span>
          <span className="text-gray-300 font-mono">{empire.sectorCount}</span>
        </div>
      </div>

      {/* Containment Bonus Info */}
      <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-xs">
        <div className="text-red-300 font-medium mb-1">⚡ Coalition Bonus Active</div>
        <div className="text-gray-400">
          Empires from adjacent sectors receive <span className="text-green-400">+15% attack power</span>{" "}
          when attacking this dominant empire.
        </div>
      </div>

      {/* Threat Warning */}
      <div className="mt-3 text-xs text-gray-500 italic">
        This empire poses a significant threat to all rivals. Consider forming
        coalitions to contain their expansion.
      </div>
    </div>
  );
}

export default BossDetailPanel;
