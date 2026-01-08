"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  type BorderOption,
  type WormholeOption,
  type WormholeInProgress,
  type ThreatLevelSimple,
  EXPANSION_CONSTANTS,
} from "@/lib/game/services/geography/expansion-service";
import { getExpansionOptionsAction } from "@/app/actions/expansion-actions";

// =============================================================================
// TYPES
// =============================================================================

interface ExpansionOptionsPanelProps {
  refreshTrigger?: number;
  compact?: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ThreatBadge({ level }: { level: ThreatLevelSimple }) {
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium",
        level === "high" && "bg-red-900/50 text-red-400",
        level === "medium" && "bg-yellow-900/50 text-yellow-400",
        level === "low" && "bg-green-900/50 text-green-400"
      )}
    >
      {level}
    </span>
  );
}

function StatusBadge({ status, unlockTurn }: { status: "locked" | "unlocked"; unlockTurn?: number }) {
  if (status === "unlocked") {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
        OPEN
      </span>
    );
  }

  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
      Turn {unlockTurn}
    </span>
  );
}

function BorderRow({ border }: { border: BorderOption }) {
  return (
    <div
      className={cn(
        "p-2 rounded border-l-4 transition-colors",
        border.status === "unlocked" && "border-green-500 bg-green-900/20",
        border.status === "locked" && "border-gray-600 bg-gray-900/20"
      )}
      data-testid={`border-option-${border.regionId}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🌐</span>
          <span className="font-medium truncate">{border.regionName}</span>
        </div>
        <StatusBadge status={border.status} unlockTurn={border.unlockTurn} />
      </div>

      <div className="text-xs text-gray-400 mt-1 flex justify-between">
        <div className="flex gap-2">
          <span>{border.empireCount} empires</span>
          <ThreatBadge level={border.threatLevel} />
        </div>
        <span className="font-mono text-yellow-400">
          {EXPANSION_CONSTANTS.BORDER_ATTACK_MULTIPLIER}× cost
        </span>
      </div>
    </div>
  );
}

function WormholeProgressRow({ wormhole }: { wormhole: WormholeInProgress }) {
  const progress = wormhole.turnsRemaining === 0 ? 100 :
    ((wormhole.completionTurn - wormhole.startTurn - wormhole.turnsRemaining) /
     (wormhole.completionTurn - wormhole.startTurn)) * 100;

  return (
    <div
      className="p-2 rounded border-l-4 border-blue-500 bg-blue-900/20"
      data-testid={`wormhole-progress-${wormhole.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🌀</span>
          <span className="font-medium truncate">{wormhole.toRegionName}</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400">
          {wormhole.turnsRemaining}T
        </span>
      </div>

      <div className="mt-1 bg-gray-800 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function WormholeOptionRow({ option, compact }: { option: WormholeOption; compact?: boolean }) {
  return (
    <div
      className={cn(
        "p-2 rounded border-l-4 transition-colors",
        option.canAfford && "border-purple-500 bg-purple-900/20",
        !option.canAfford && "border-gray-600 bg-gray-900/20 opacity-60"
      )}
      data-testid={`wormhole-option-${option.regionId}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🌀</span>
          <span className="font-medium truncate">{option.regionName}</span>
        </div>
        {option.canAfford ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400">
            AVAILABLE
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
            COSTLY
          </span>
        )}
      </div>

      {!compact && (
        <div className="text-xs text-gray-400 mt-1 flex justify-between">
          <div>
            <span className="text-yellow-400">{option.cost.credits.toLocaleString()} cr</span>
            {" + "}
            <span className="text-orange-400">{option.cost.petroleum} petro</span>
          </div>
          <span className="font-mono text-red-400">
            {EXPANSION_CONSTANTS.WORMHOLE_ATTACK_MULTIPLIER}× cost
          </span>
        </div>
      )}

      {!compact && (
        <div className="text-xs text-gray-500 mt-0.5">
          Build time: {option.buildTime} turns
        </div>
      )}
    </div>
  );
}

function WormholeSlotIndicator({ used, max }: { used: number; max: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs text-gray-400">Wormhole Slots:</span>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full border",
              i < used && "bg-purple-500 border-purple-400",
              i >= used && "bg-gray-800 border-gray-600"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">
        {used}/{max}
      </span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ExpansionOptionsPanel({
  refreshTrigger,
  compact = false,
}: ExpansionOptionsPanelProps) {
  const [playerRegionName, setPlayerRegionName] = useState<string>("");
  const [borders, setBorders] = useState<BorderOption[]>([]);
  const [wormholeSlots, setWormholeSlots] = useState({ used: 0, max: 0, available: 0 });
  const [wormholesInProgress, setWormholesInProgress] = useState<WormholeInProgress[]>([]);
  const [wormholeOptions, setWormholeOptions] = useState<WormholeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    try {
      const result = await getExpansionOptionsAction();
      if (result) {
        setPlayerRegionName(result.playerRegionName);
        setBorders(result.borders);
        setWormholeSlots(result.wormholeSlots);
        setWormholesInProgress(result.wormholesInProgress);
        setWormholeOptions(result.wormholeOptions);
        setError(null);
      } else {
        setError("Failed to load expansion options");
      }
    } catch (err) {
      setError("Failed to load expansion options");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions, refreshTrigger]);

  if (loading) {
    return (
      <div className="lcars-panel" data-testid="expansion-options-panel">
        <h2 className="text-lg font-semibold text-lcars-gold mb-4">
          Expansion Options
        </h2>
        <div className="text-gray-400 text-center py-4">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lcars-panel" data-testid="expansion-options-panel">
        <h2 className="text-lg font-semibold text-lcars-gold mb-4">
          Expansion Options
        </h2>
        <div className="text-red-400 text-center py-4">{error}</div>
      </div>
    );
  }

  const unlockedBorders = borders.filter((b) => b.status === "unlocked");
  const lockedBorders = borders.filter((b) => b.status === "locked");

  return (
    <div className="lcars-panel" data-testid="expansion-options-panel">
      <h2 className="text-lg font-semibold text-lcars-gold mb-2">
        Expansion Options
      </h2>

      <div className="text-xs text-gray-500 mb-3">
        From: <span className="text-lcars-gold">{playerRegionName}</span>
      </div>

      {/* Border Connections */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <span>🌐</span> Borders
          <span className="text-xs text-gray-500">
            ({unlockedBorders.length} open, {lockedBorders.length} locked)
          </span>
        </h3>

        {borders.length === 0 ? (
          <div className="text-gray-500 text-sm py-2">
            No border connections available
          </div>
        ) : (
          <div className="space-y-2">
            {(compact ? borders.slice(0, 2) : borders).map((border) => (
              <BorderRow key={border.connectionId} border={border} />
            ))}
            {compact && borders.length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{borders.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wormholes Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <span>🌀</span> Wormholes
        </h3>

        <WormholeSlotIndicator used={wormholeSlots.used} max={wormholeSlots.max} />

        {/* In Progress */}
        {wormholesInProgress.length > 0 && (
          <div className="space-y-2 mb-3">
            <div className="text-xs text-gray-500 uppercase">Building</div>
            {wormholesInProgress.map((wh) => (
              <WormholeProgressRow key={wh.id} wormhole={wh} />
            ))}
          </div>
        )}

        {/* Available Options */}
        {wormholeSlots.available > 0 && wormholeOptions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase">Available Destinations</div>
            {(compact ? wormholeOptions.slice(0, 2) : wormholeOptions).map((option) => (
              <WormholeOptionRow key={option.regionId} option={option} compact={compact} />
            ))}
            {compact && wormholeOptions.length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{wormholeOptions.length - 2} more
              </div>
            )}
          </div>
        )}

        {wormholeSlots.available === 0 && wormholesInProgress.length === 0 && (
          <div className="text-xs text-gray-500 py-2">
            All wormhole slots in use. Research to unlock more.
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpansionOptionsPanel;
