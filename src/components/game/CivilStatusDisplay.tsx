/**
 * Civil Status Display Component
 *
 * Shows current civil status with income multiplier.
 * Color-coded by status level.
 */

import { CIVIL_STATUS_INCOME_MULTIPLIERS, type CivilStatusLevel } from "@/lib/game/constants";
import { Tooltip } from "./Tooltip";

// Inline tooltip content to avoid Next.js Server Components bundler issues
const CivilStatusTooltipContent = (
  <div>
    <strong className="text-lcars-amber">Civil Status</strong>
    <p className="mt-1">
      Your population&apos;s happiness affects your income. Happy citizens (Ecstatic)
      give 4x income, while unhappy ones (Revolting) give only 0.25x.
    </p>
    <p className="mt-1 text-gray-400 text-xs">
      Keep your people fed and avoid overpopulation!
    </p>
  </div>
);

interface CivilStatusDisplayProps {
  status: string;
  showMultiplier?: boolean;
}

const STATUS_COLORS: Record<CivilStatusLevel, string> = {
  ecstatic: "text-green-400 bg-green-400/10 border-green-400/30",
  happy: "text-green-300 bg-green-300/10 border-green-300/30",
  content: "text-blue-300 bg-blue-300/10 border-blue-300/30",
  neutral: "text-gray-300 bg-gray-300/10 border-gray-300/30",
  unhappy: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  angry: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  rioting: "text-red-400 bg-red-400/10 border-red-400/30",
  revolting: "text-red-600 bg-red-600/10 border-red-600/30",
};

const STATUS_LABELS: Record<CivilStatusLevel, string> = {
  ecstatic: "Ecstatic",
  happy: "Happy",
  content: "Content",
  neutral: "Neutral",
  unhappy: "Unhappy",
  angry: "Angry",
  rioting: "Rioting",
  revolting: "REVOLTING",
};

export function CivilStatusDisplay({
  status,
  showMultiplier = true,
}: CivilStatusDisplayProps) {
  const civilStatus = status as CivilStatusLevel;
  const colorClass = STATUS_COLORS[civilStatus] ?? STATUS_COLORS.neutral;
  const label = STATUS_LABELS[civilStatus] ?? status;
  const multiplier = CIVIL_STATUS_INCOME_MULTIPLIERS[civilStatus] ?? 1.0;

  // Format multiplier for display
  const formatMultiplier = (mult: number): string => {
    if (mult >= 0) {
      return `${mult.toFixed(1)}x`;
    }
    return `${mult.toFixed(1)}x`;
  };

  return (
    <Tooltip content={CivilStatusTooltipContent} position="bottom">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-lcars cursor-help ${colorClass}`}
        data-testid="civil-status-display"
      >
        <span className="font-semibold" data-testid="civil-status-label">
          {label}
        </span>
        {showMultiplier && (
          <>
            <span className="text-gray-500">|</span>
            <span
              className="font-mono text-sm"
              data-testid="civil-status-multiplier"
              title={`Income multiplier: ${formatMultiplier(multiplier)}`}
            >
              {formatMultiplier(multiplier)}
            </span>
          </>
        )}
      </div>
    </Tooltip>
  );
}
