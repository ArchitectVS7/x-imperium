"use client";

/**
 * Turn Goal Indicator Component (M9.2)
 *
 * Shows suggested goals for early game turns.
 */

import { cn } from "@/lib/utils";
import {
  getCurrentTurnGoal,
  type TurnGoalState,
} from "@/lib/tutorial/types";

// =============================================================================
// PROPS
// =============================================================================

interface TurnGoalIndicatorProps {
  turn: number;
  goalState: TurnGoalState;
  className?: string;
  compact?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TurnGoalIndicator({
  turn,
  goalState,
  className,
  compact = false,
}: TurnGoalIndicatorProps) {
  const goal = getCurrentTurnGoal(turn);

  // No goal to show
  if (!goal) return null;

  const isComplete = goal.checkCondition(goalState);
  const turnsRemaining = goal.turn - turn;
  const isUrgent = turnsRemaining <= 2 && !isComplete;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-xs",
          isComplete && "text-green-400",
          !isComplete && !isUrgent && "text-gray-400",
          isUrgent && "text-yellow-400",
          className
        )}
        data-testid="turn-goal-compact"
      >
        <span>{isComplete ? "✓" : "○"}</span>
        <span className="truncate">{goal.title}</span>
        {!isComplete && turnsRemaining > 0 && (
          <span className="text-gray-500">({turnsRemaining}T)</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3 rounded border-l-4 transition-colors",
        isComplete && "border-green-500 bg-green-900/20",
        !isComplete && !isUrgent && "border-lcars-amber bg-lcars-amber/10",
        isUrgent && "border-yellow-500 bg-yellow-900/20",
        className
      )}
      data-testid="turn-goal-indicator"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg",
                isComplete && "text-green-400",
                !isComplete && "text-lcars-amber"
              )}
            >
              {isComplete ? "✓" : "●"}
            </span>
            <h4 className="font-medium text-white truncate">{goal.title}</h4>
          </div>
          <p className="text-sm text-gray-400 mt-1">{goal.description}</p>
        </div>

        {!isComplete && (
          <div className="flex-shrink-0 text-right">
            <div
              className={cn(
                "text-xs font-medium",
                isUrgent ? "text-yellow-400" : "text-gray-500"
              )}
            >
              Turn {goal.turn}
            </div>
            {turnsRemaining > 0 && (
              <div className="text-xs text-gray-600">
                {turnsRemaining} turn{turnsRemaining !== 1 ? "s" : ""} left
              </div>
            )}
          </div>
        )}

        {isComplete && (
          <div className="flex-shrink-0">
            <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-400">
              Complete!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TurnGoalIndicator;
