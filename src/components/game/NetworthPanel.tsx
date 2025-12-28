"use client";

import { AnimatedCounter } from "@/components/ui";

interface NetworthPanelProps {
  networth: number;
  rank?: number;
}

export function NetworthPanel({ networth, rank }: NetworthPanelProps) {
  return (
    <div className="lcars-panel" data-testid="networth-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Networth
      </h2>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between" data-testid="networth-value">
          <span>Total:</span>
          <AnimatedCounter
            value={networth}
            className="font-mono text-lcars-amber text-xl"
            formatFn={(val) => val.toFixed(2)}
          />
        </div>
        <div className="flex justify-between" data-testid="rank">
          <span>Rank:</span>
          {rank !== undefined ? (
            <AnimatedCounter
              value={rank}
              className="font-mono text-lcars-mint"
            />
          ) : (
            <span className="font-mono text-lcars-mint">--</span>
          )}
        </div>
      </div>
    </div>
  );
}
