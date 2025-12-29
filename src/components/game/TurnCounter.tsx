"use client";

/**
 * Turn Counter Component
 *
 * Displays the current turn number and turn limit.
 * Highlights milestone turns (20, 100, 180, 200).
 */

import { AnimatedCounter } from "@/components/ui";

interface TurnCounterProps {
  currentTurn: number;
  turnLimit: number;
}

const MILESTONE_TURNS = [20, 100, 180, 200];

export function TurnCounter({ currentTurn, turnLimit }: TurnCounterProps) {
  const isMilestone = MILESTONE_TURNS.includes(currentTurn);
  const isEndgame = currentTurn >= 180;
  const isNearEnd = currentTurn >= turnLimit - 20;

  // Determine color based on game phase
  const getColorClass = () => {
    if (isNearEnd) return "text-red-400";
    if (isEndgame) return "text-lcars-salmon";
    if (isMilestone) return "text-lcars-mint";
    return "text-lcars-amber";
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-lcars-lavender/30 rounded-lcars"
      data-testid="turn-counter"
    >
      <span className="text-gray-400 text-sm">TURN</span>
      <AnimatedCounter
        value={currentTurn}
        className={`font-mono text-xl font-bold ${getColorClass()}`}
        duration={0.5}
      />
      <span className="text-gray-500">/</span>
      <span
        className="font-mono text-lg text-gray-400"
        data-testid="turn-limit"
      >
        {turnLimit}
      </span>
      {isMilestone && (
        <span className="ml-2 px-2 py-0.5 text-xs bg-lcars-mint/20 text-lcars-mint rounded">
          MILESTONE
        </span>
      )}
      {currentTurn === turnLimit && (
        <span className="ml-2 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
          FINAL TURN
        </span>
      )}
    </div>
  );
}
