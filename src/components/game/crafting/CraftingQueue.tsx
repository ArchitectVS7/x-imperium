"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getCraftingQueueAction,
  cancelCraftingOrderAction,
  type QueueItemDisplay,
} from "@/app/actions/crafting-actions";

interface CraftingQueueProps {
  refreshTrigger?: number;
  onQueueUpdated?: () => void;
}

const TIER_COLORS = {
  1: "text-green-400",
  2: "text-cyan-400",
  3: "text-purple-400",
} as const;

const STATUS_COLORS = {
  queued: "bg-gray-600",
  in_progress: "bg-lcars-amber",
  completed: "bg-green-600",
  cancelled: "bg-red-600",
} as const;

const STATUS_LABELS = {
  queued: "Queued",
  in_progress: "Building",
  completed: "Complete",
  cancelled: "Cancelled",
} as const;

export function CraftingQueue({ refreshTrigger, onQueueUpdated }: CraftingQueueProps) {
  const [queue, setQueue] = useState<{
    items: QueueItemDisplay[];
    currentlyBuilding: QueueItemDisplay | null;
    totalTurnsRemaining: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadQueue = async () => {
      setIsLoading(true);
      try {
        const data = await getCraftingQueueAction();
        if (!cancelled) {
          setQueue(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadQueue();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleCancel = (itemId: string) => {
    setError(null);

    // Handle async separately from startTransition
    const doCancel = async () => {
      const result = await cancelCraftingOrderAction(itemId);
      if (result.success) {
        // Refresh queue
        const data = await getCraftingQueueAction();
        startTransition(() => {
          setQueue(data);
          onQueueUpdated?.();
        });
      } else {
        startTransition(() => {
          setError(result.error || "Failed to cancel order");
        });
      }
    };

    doCancel();
  };

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading queue...</div>;
  }

  if (!queue || queue.items.length === 0) {
    return (
      <div className="text-gray-500 text-sm p-3 bg-black/30 rounded border border-gray-700/50">
        No items in crafting queue
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-900/50 border border-red-500 text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="flex justify-between items-center text-sm p-2 bg-black/30 rounded">
        <span className="text-gray-400">
          {queue.items.length} item{queue.items.length !== 1 ? "s" : ""} in queue
        </span>
        <span className="text-lcars-amber font-mono">
          {queue.totalTurnsRemaining} turn{queue.totalTurnsRemaining !== 1 ? "s" : ""} total
        </span>
      </div>

      {/* Currently building */}
      {queue.currentlyBuilding && (
        <div className="p-3 bg-lcars-amber/10 border border-lcars-amber/30 rounded">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lcars-amber font-semibold text-sm">Currently Building</span>
            <span className="text-xs px-2 py-0.5 rounded bg-lcars-amber text-black">
              {queue.currentlyBuilding.turnsRemaining} turn{queue.currentlyBuilding.turnsRemaining !== 1 ? "s" : ""} left
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`${TIER_COLORS[queue.currentlyBuilding.tier]} font-semibold`}>
              {queue.currentlyBuilding.quantity}x {queue.currentlyBuilding.label}
            </span>
            <span className="text-xs text-gray-400">
              T{queue.currentlyBuilding.tier}
            </span>
          </div>
          {/* Progress indicator */}
          <div className="mt-2">
            <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-lcars-amber transition-all duration-300"
                style={{
                  width: `${Math.max(0, 100 - (queue.currentlyBuilding.turnsRemaining / (queue.currentlyBuilding.completionTurn - queue.currentlyBuilding.startTurn)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Queued items */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {queue.items
          .filter((item) => item.status === "queued")
          .map((item, index) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-2 bg-black/30 rounded border border-gray-700/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-5">#{index + 2}</span>
                <div>
                  <div className={`${TIER_COLORS[item.tier]} text-sm font-medium`}>
                    {item.quantity}x {item.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.turnsRemaining} turn{item.turnsRemaining !== 1 ? "s" : ""} • Complete turn {item.completionTurn}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCancel(item.id)}
                disabled={isPending}
                className="text-xs text-red-400 hover:text-red-300 hover:underline disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
