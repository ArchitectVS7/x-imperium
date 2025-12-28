"use client";

import { useState, useEffect } from "react";
import { getSyndicateTrustAction, type TrustStatusDisplay } from "@/app/actions/syndicate-actions";
import { TRUST_LEVEL_LABELS, TRUST_LEVELS, type SyndicateTrustLevel } from "@/lib/game/constants/syndicate";

interface TrustMeterProps {
  refreshTrigger?: number;
  onStatusChange?: (status: TrustStatusDisplay | null) => void;
}

const TRUST_LEVEL_COLORS: Record<SyndicateTrustLevel, string> = {
  unknown: "bg-gray-500",
  associate: "bg-green-600",
  runner: "bg-emerald-500",
  soldier: "bg-teal-500",
  captain: "bg-cyan-500",
  lieutenant: "bg-blue-500",
  underboss: "bg-purple-500",
  consigliere: "bg-pink-500",
  syndicate_lord: "bg-amber-500",
};

export function TrustMeter({ refreshTrigger, onStatusChange }: TrustMeterProps) {
  const [status, setStatus] = useState<TrustStatusDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      setIsLoading(true);
      try {
        const data = await getSyndicateTrustAction();
        if (!cancelled) {
          setStatus(data);
          onStatusChange?.(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, onStatusChange]);

  if (isLoading) {
    return (
      <div className="bg-black/40 border border-gray-700/50 rounded p-4">
        <div className="text-gray-400 text-sm">Loading Syndicate status...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-black/40 border border-gray-700/50 rounded p-4">
        <div className="text-gray-500 text-sm">
          The Galactic Syndicate operates in shadows. You have not been contacted.
        </div>
      </div>
    );
  }

  const levelConfig = TRUST_LEVELS[status.trustLevel];
  const colorClass = TRUST_LEVEL_COLORS[status.trustLevel];

  return (
    <div className="bg-black/40 border border-gray-700/50 rounded overflow-hidden">
      {/* Header */}
      <div className={`${colorClass} px-4 py-2`}>
        <div className="flex justify-between items-center">
          <span className="text-black font-bold text-lg">
            {status.isHostile ? "HOSTILE" : TRUST_LEVEL_LABELS[status.trustLevel]}
          </span>
          <span className="text-black/80 text-sm">
            {status.trustPoints.toLocaleString()} TP
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className="p-4 border-b border-gray-700/50">
        <p className={`text-sm ${status.isHostile ? "text-red-400" : "text-gray-300"}`}>
          {status.statusMessage}
        </p>
      </div>

      {/* Progress Bar (if not at max or hostile) */}
      {!status.isHostile && status.pointsToNextLevel !== null && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress to {status.nextLevelTitle}</span>
            <span>{status.progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded overflow-hidden">
            <div
              className={`h-full ${colorClass} transition-all duration-300`}
              style={{ width: `${status.progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {status.pointsToNextLevel?.toLocaleString()} TP to next level
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-black/30 p-2 rounded">
          <div className="text-gray-500 text-xs">Contracts Completed</div>
          <div className="font-mono text-green-400">{status.contractsCompleted}</div>
        </div>
        <div className="bg-black/30 p-2 rounded">
          <div className="text-gray-500 text-xs">Contracts Failed</div>
          <div className="font-mono text-red-400">{status.contractsFailed}</div>
        </div>
        <div className="bg-black/30 p-2 rounded col-span-2">
          <div className="text-gray-500 text-xs">Price Multiplier</div>
          <div className="font-mono text-lcars-amber">
            {status.priceMultiplier === 0 ? "No Access" : `${status.priceMultiplier}x`}
          </div>
        </div>
      </div>

      {/* Unlocks Preview */}
      {status.hasAccess && levelConfig.unlocks.length > 0 && (
        <div className="p-4 border-t border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">Current Unlocks:</div>
          <div className="flex flex-wrap gap-1">
            {levelConfig.unlocks.map((unlock, i) => (
              <span
                key={i}
                className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded"
              >
                {unlock}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
