"use client";

/**
 * Turn Counter Component
 *
 * Displays the current turn number and turn limit.
 * Highlights milestone turns (20, 100, 180, 200).
 * Shows protection status for first 20 turns.
 */

import { AnimatedCounter } from "@/components/ui";
import { Tooltip } from "./Tooltip";

// Inline tooltip content to avoid Next.js Server Components bundler issues
const ProtectionTooltipContent = (
  <div>
    <strong className="text-lcars-amber">Protection Period</strong>
    <p className="mt-1">
      For the first 20 turns, your empire is protected from attacks.
      Use this time to build up your economy and military!
    </p>
  </div>
);

interface TurnCounterProps {
  currentTurn: number;
  turnLimit: number;
}

const MILESTONE_TURNS = [20, 100, 180, 200];
const PROTECTION_TURNS = 20;

export function TurnCounter({ currentTurn, turnLimit }: TurnCounterProps) {
  const isMilestone = MILESTONE_TURNS.includes(currentTurn);
  const isEndgame = currentTurn >= 180;
  const isNearEnd = currentTurn >= turnLimit - 20;
  const isProtected = currentTurn <= PROTECTION_TURNS;

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
      {isProtected && (
        <Tooltip content={ProtectionTooltipContent} position="bottom">
          <span
            className="ml-2 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded cursor-help flex items-center gap-1"
            data-testid="protection-badge"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2A11.954 11.954 0 0110 1.944zM10 18c-4.418 0-8-4.03-8-9s3.582-9 8-9 8 4.03 8 9-3.582 9-8 9z" clipRule="evenodd" />
            </svg>
            PROTECTED ({PROTECTION_TURNS - currentTurn + 1})
          </span>
        </Tooltip>
      )}
      {isMilestone && !isProtected && (
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
