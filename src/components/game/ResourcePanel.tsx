"use client";

import { AnimatedCounter } from "@/components/ui";

interface ResourcePanelProps {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
}

export function ResourcePanel({
  credits,
  food,
  ore,
  petroleum,
  researchPoints,
}: ResourcePanelProps) {
  return (
    <div className="lcars-panel" data-testid="resource-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Resources
      </h2>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between" data-testid="credits">
          <span>Credits:</span>
          <AnimatedCounter
            value={credits}
            className="font-mono text-lcars-amber"
          />
        </div>
        <div className="flex justify-between" data-testid="food">
          <span>Food:</span>
          <AnimatedCounter
            value={food}
            className="font-mono text-green-400"
          />
        </div>
        <div className="flex justify-between" data-testid="ore">
          <span>Ore:</span>
          <AnimatedCounter
            value={ore}
            className="font-mono text-gray-400"
          />
        </div>
        <div className="flex justify-between" data-testid="petroleum">
          <span>Petroleum:</span>
          <AnimatedCounter
            value={petroleum}
            className="font-mono text-yellow-500"
          />
        </div>
        <div className="flex justify-between" data-testid="research-points">
          <span>Research:</span>
          <AnimatedCounter
            value={researchPoints}
            className="font-mono text-lcars-blue"
          />
        </div>
      </div>
    </div>
  );
}
