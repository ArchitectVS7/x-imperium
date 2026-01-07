"use client";

/**
 * Phase Indicator Component
 *
 * Visual timeline showing the 6 turn phases and current phase status.
 * Helps players understand when things happen in the turn sequence.
 */

import { Check, Clock } from "lucide-react";

export type TurnPhase =
  | "income"
  | "population"
  | "civil_status"
  | "market"
  | "bots"
  | "actions";

interface PhaseIndicatorProps {
  currentPhase: TurnPhase | null; // null = player action phase
  isProcessing: boolean;
}

const PHASES = [
  { id: "income", label: "Income", description: "Collect credits from sectors" },
  { id: "population", label: "Population", description: "Population growth & food consumption" },
  { id: "civil_status", label: "Civil Status", description: "Update empire morale" },
  { id: "market", label: "Market", description: "Update prices & process orders" },
  { id: "bots", label: "Bot Turns", description: "AI empires take actions" },
  { id: "actions", label: "Your Turn", description: "Take actions & end turn" },
] as const;

export function PhaseIndicator({ currentPhase, isProcessing }: PhaseIndicatorProps) {
  // Determine which phase we're in
  const activePhaseIndex = currentPhase
    ? PHASES.findIndex(p => p.id === currentPhase)
    : PHASES.length - 1; // Player's turn

  return (
    <div className="bg-gray-900 border-b border-lcars-amber/30 px-4 py-3" data-testid="phase-indicator">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider">Turn Phase</h3>
          {isProcessing && (
            <div
              className="flex items-center gap-2 text-xs text-lcars-amber"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <Clock className="w-3 h-3 animate-spin" />
              <span>Processing turn...</span>
            </div>
          )}
        </div>

        {/* Phase Timeline */}
        <div className="flex items-center gap-2">
          {PHASES.map((phase, index) => {
            const isCompleted = index < activePhaseIndex;
            const isCurrent = index === activePhaseIndex;

            return (
              <div key={phase.id} className="flex items-center flex-1">
                {/* Phase Box */}
                <div
                  className={`relative flex-1 px-3 py-2 rounded transition-all ${
                    isCurrent
                      ? "bg-lcars-amber/20 border border-lcars-amber shadow-lg shadow-lcars-amber/20"
                      : isCompleted
                      ? "bg-green-900/20 border border-green-600/50"
                      : "bg-gray-800/50 border border-gray-700"
                  }`}
                  title={phase.description}
                >
                  <div className="flex items-center gap-2">
                    {/* Status Icon */}
                    {isCompleted && (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                    {isCurrent && (
                      <div className="w-2 h-2 bg-lcars-amber rounded-full animate-pulse flex-shrink-0" />
                    )}

                    {/* Phase Label */}
                    <span
                      className={`text-xs font-medium truncate ${
                        isCurrent
                          ? "text-lcars-amber font-display"
                          : isCompleted
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                </div>

                {/* Connector Arrow (except after last phase) */}
                {index < PHASES.length - 1 && (
                  <div
                    className={`w-4 h-0.5 mx-1 ${
                      isCompleted ? "bg-green-600" : "bg-gray-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current Phase Description with ARIA live region */}
        {!isProcessing && (
          <div
            className="mt-2 text-xs text-gray-400"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {PHASES[activePhaseIndex]?.description}
          </div>
        )}
      </div>
    </div>
  );
}
