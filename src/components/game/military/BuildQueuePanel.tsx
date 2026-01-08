"use client";

import { useState, useTransition, useEffect } from "react";
import {
  getBuildQueueStatusAction,
  cancelBuildOrderAction,
} from "@/app/actions/build-queue-actions";
import type { QueueStatus } from "@/lib/game/services/military/build-queue-service";
import { UNIT_LABELS, type UnitType } from "@/lib/game/unit-config";
import { fromDbUnitType, type DbUnitType } from "@/lib/game/build-config";

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  soldiers: "text-green-400",
  fighters: "text-blue-400",
  stations: "text-purple-400",
  lightCruisers: "text-cyan-400",
  heavyCruisers: "text-orange-400",
  carriers: "text-red-400",
  covertAgents: "text-gray-400",
};

interface BuildQueuePanelProps {
  onQueueChange?: () => void;
}

export function BuildQueuePanel({ onQueueChange }: BuildQueuePanelProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, startCancellation] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadQueueStatus = async () => {
    try {
      const status = await getBuildQueueStatusAction();
      setQueueStatus(status);
    } catch {
      setError("Failed to load build queue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueueStatus();
  }, []);

  const handleCancelBuild = async (queueId: string, unitType: UnitType) => {
    setError(null);
    setSuccess(null);

    startCancellation(async () => {
      const result = await cancelBuildOrderAction(queueId);
      if (result.success) {
        setSuccess(`Cancelled ${UNIT_LABELS[unitType]} build. Refunded: ${result.creditsRefunded?.toLocaleString()} credits`);
        await loadQueueStatus();
        onQueueChange?.();
      } else {
        setError(result.error || "Failed to cancel build");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="lcars-panel" data-testid="build-queue-panel">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Build Queue
        </h2>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!queueStatus) {
    return (
      <div className="lcars-panel" data-testid="build-queue-panel">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Build Queue
        </h2>
        <div className="text-gray-400 text-sm">Unable to load queue</div>
      </div>
    );
  }

  return (
    <div className="lcars-panel" data-testid="build-queue-panel">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-lcars-lavender">
          Build Queue
        </h2>
        <span className="text-sm text-gray-400">
          {queueStatus.totalItems}/10 slots
        </span>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-900/50 border border-red-500 text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-2 bg-green-900/50 border border-green-500 text-green-300 text-sm rounded">
          {success}
        </div>
      )}

      {queueStatus.entries.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-4">
          No units currently in build queue
        </div>
      ) : (
        <div className="space-y-2">
          {queueStatus.entries.map((entry) => {
            const unitType = fromDbUnitType(entry.unitType as DbUnitType);
            const color = UNIT_TYPE_COLORS[unitType];

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 bg-black/30 rounded border border-gray-700"
                data-testid={`build-queue-entry-${entry.id}`}
              >
                <div className="flex-1">
                  <div className={`font-semibold ${color}`}>
                    {UNIT_LABELS[unitType]}
                  </div>
                  <div className="text-xs text-gray-400">
                    Qty: {entry.quantity.toLocaleString()} | Cost: {entry.totalCost.toLocaleString()}
                  </div>
                </div>
                <div className="text-right mr-3">
                  <div className="font-mono text-lcars-amber">
                    {entry.turnsRemaining} turn{entry.turnsRemaining !== 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-gray-500">remaining</div>
                </div>
                <button
                  onClick={() => handleCancelBuild(entry.id, unitType)}
                  disabled={isCancelling}
                  className="px-2 py-1 bg-red-800 text-red-200 rounded text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                  title="Cancel build (50% refund)"
                >
                  {isCancelling ? "..." : "Cancel"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {queueStatus.entries.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Cancelling a build refunds 50% of the cost
        </div>
      )}
    </div>
  );
}
