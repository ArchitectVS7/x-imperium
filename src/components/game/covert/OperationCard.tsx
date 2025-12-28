"use client";

/**
 * Operation Card Component
 *
 * Displays a single covert operation with:
 * - Name and description
 * - Cost and risk level
 * - Success rate (when target selected)
 * - Execute button
 */

import { type OperationType } from "@/lib/covert/constants";

interface OperationCardProps {
  operation: {
    id: OperationType;
    name: string;
    description: string;
    cost: number;
    minAgents: number;
    risk: string;
    baseSuccessRate: number;
  };
  preview?: {
    successChance: number;
    catchChance: number;
    canExecute: boolean;
  };
  currentPoints: number;
  currentAgents: number;
  onExecute: (operationType: OperationType) => void;
  disabled?: boolean;
  executing?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  very_high: "text-red-400",
};

export function OperationCard({
  operation,
  preview,
  currentPoints,
  currentAgents,
  onExecute,
  disabled,
  executing,
}: OperationCardProps) {
  const canAfford = currentPoints >= operation.cost;
  const hasAgents = currentAgents >= operation.minAgents;
  const canExecute = preview?.canExecute ?? (canAfford && hasAgents);

  const riskColor = RISK_COLORS[operation.risk] || "text-gray-400";

  return (
    <div
      className={`lcars-panel p-4 ${
        !canExecute ? "opacity-60" : ""
      } transition-opacity`}
      data-testid={`operation-card-${operation.id}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-display text-lcars-amber">{operation.name}</h3>
        <span className={`text-sm ${riskColor} uppercase`}>
          {operation.risk.replace("_", " ")}
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-3">{operation.description}</p>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-500">Cost:</span>{" "}
          <span className={canAfford ? "text-lcars-blue" : "text-red-400"}>
            {operation.cost} CP
          </span>
        </div>
        <div>
          <span className="text-gray-500">Min Agents:</span>{" "}
          <span className={hasAgents ? "text-lcars-orange" : "text-red-400"}>
            {operation.minAgents}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Base Success:</span>{" "}
          <span className="text-gray-300">
            {Math.round(operation.baseSuccessRate * 100)}%
          </span>
        </div>
        {preview && (
          <div>
            <span className="text-gray-500">Actual:</span>{" "}
            <span
              className={
                preview.successChance >= 0.7
                  ? "text-green-400"
                  : preview.successChance >= 0.4
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {Math.round(preview.successChance * 100)}%
            </span>
          </div>
        )}
      </div>

      {preview && (
        <div className="text-xs text-gray-500 mb-3">
          Catch risk: {Math.round(preview.catchChance * 100)}%
        </div>
      )}

      <button
        onClick={() => onExecute(operation.id)}
        disabled={!canExecute || disabled || executing}
        className={`w-full py-2 px-4 rounded transition-colors ${
          canExecute && !disabled && !executing
            ? "bg-lcars-orange hover:bg-lcars-orange/80 text-black font-medium"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
        }`}
        data-testid={`execute-${operation.id}`}
      >
        {executing ? "Executing..." : canExecute ? "Execute" : "Cannot Execute"}
      </button>
    </div>
  );
}
