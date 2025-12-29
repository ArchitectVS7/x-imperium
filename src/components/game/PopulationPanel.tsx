"use client";

import { AnimatedCounter } from "@/components/ui";

interface PopulationPanelProps {
  population: number;
  populationCap?: number;
  civilStatus: string;
}

const CIVIL_STATUS_COLORS: Record<string, string> = {
  ecstatic: "text-green-400",
  happy: "text-green-300",
  content: "text-blue-300",
  neutral: "text-gray-300",
  unhappy: "text-yellow-400",
  angry: "text-orange-400",
  rioting: "text-red-400",
  revolting: "text-red-600",
};

const CIVIL_STATUS_LABELS: Record<string, string> = {
  ecstatic: "Ecstatic",
  happy: "Happy",
  content: "Content",
  neutral: "Neutral",
  unhappy: "Unhappy",
  angry: "Angry",
  rioting: "Rioting",
  revolting: "Revolting",
};

export function PopulationPanel({
  population,
  populationCap,
  civilStatus,
}: PopulationPanelProps) {
  const statusColor = CIVIL_STATUS_COLORS[civilStatus] ?? "text-gray-300";
  const statusLabel = CIVIL_STATUS_LABELS[civilStatus] ?? civilStatus;

  return (
    <div className="lcars-panel" data-testid="population-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Population
      </h2>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between" data-testid="population-count">
          <span>Citizens:</span>
          <AnimatedCounter
            value={population}
            className="font-mono text-lcars-amber"
          />
        </div>
        {populationCap && (
          <div className="flex justify-between" data-testid="population-cap">
            <span>Capacity:</span>
            <AnimatedCounter
              value={populationCap}
              className="font-mono text-gray-400"
            />
          </div>
        )}
        <div className="flex justify-between" data-testid="civil-status">
          <span>Morale:</span>
          <span className={`font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
