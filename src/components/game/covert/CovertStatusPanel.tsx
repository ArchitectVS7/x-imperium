"use client";

/**
 * Covert Status Panel Component
 *
 * Displays the player's covert status:
 * - Current covert points (5/turn, max 50)
 * - Current agents vs capacity
 * - Government planets count
 */

import { useEffect, useState } from "react";
import { getCovertStatusAction } from "@/app/actions/covert-actions";

interface CovertStatus {
  covertPoints: number;
  maxCovertPoints: number;
  agents: number;
  agentCapacity: number;
  governmentPlanets: number;
}

export function CovertStatusPanel() {
  const [status, setStatus] = useState<CovertStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const result = await getCovertStatusAction();
      if (result.success && result.status) {
        setStatus(result.status);
      }
      setLoading(false);
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="lcars-panel animate-pulse">
        <div className="h-24 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="lcars-panel">
        <p className="text-gray-400">Unable to load covert status</p>
      </div>
    );
  }

  const pointsPercent = (status.covertPoints / status.maxCovertPoints) * 100;
  const agentsPercent =
    status.agentCapacity > 0
      ? (status.agents / status.agentCapacity) * 100
      : 0;

  return (
    <div className="lcars-panel" data-testid="covert-status-panel">
      <h2 className="text-xl font-display text-lcars-amber mb-4">
        Covert Status
      </h2>

      <div className="space-y-4">
        {/* Covert Points */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Covert Points</span>
            <span className="text-lcars-blue">
              {status.covertPoints} / {status.maxCovertPoints}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-lcars-blue h-3 rounded-full transition-all duration-500"
              style={{ width: `${pointsPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">+5 points per turn</p>
        </div>

        {/* Agents */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Covert Agents</span>
            <span className="text-lcars-orange">
              {status.agents.toLocaleString()} / {status.agentCapacity.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-lcars-orange h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, agentsPercent)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Capacity: {status.governmentPlanets} Government planets x 300
          </p>
        </div>
      </div>
    </div>
  );
}
