/**
 * TellIndicator Component
 *
 * Visual indicator for bot behavioral tells on the starmap.
 * Renders animated effects based on tell type and confidence.
 *
 * @see docs/PRD.md Section 7.10 (Player Readability / Tell System)
 */

import { useMemo } from "react";
import {
  Swords,
  MoveRight,
  Target,
  Handshake,
  DollarSign,
  MoreHorizontal,
  AlertTriangle,
  Mail,
  HelpCircle,
  AlertCircle,
  Star,
} from "lucide-react";
import type { EmpireTellData, TellType } from "./types";

// Icon size for tell indicators
const ICON_SIZE = 10;

interface TellIndicatorProps {
  /** Tell data to display */
  tell: EmpireTellData;
  /** Center X position */
  cx: number;
  /** Center Y position */
  cy: number;
  /** Base size of the empire indicator */
  size: number;
  /** Intel level determines detail shown */
  intelLevel: "unknown" | "basic" | "moderate" | "full";
}

/**
 * Icon component type for tells
 */
type IconComponent = typeof Swords;

/**
 * Get visual style based on tell type
 */
function getTellVisualStyle(tellType: TellType): {
  color: string;
  secondaryColor: string;
  Icon: IconComponent;
  animationClass: string;
} {
  switch (tellType) {
    case "military_buildup":
      return {
        color: "#ef4444", // red
        secondaryColor: "#fca5a5",
        Icon: Swords,
        animationClass: "animate-pulse",
      };
    case "fleet_movement":
      return {
        color: "#f97316", // orange
        secondaryColor: "#fdba74",
        Icon: MoveRight,
        animationClass: "",
      };
    case "target_fixation":
      return {
        color: "#dc2626", // dark red
        secondaryColor: "#f87171",
        Icon: Target,
        animationClass: "animate-pulse",
      };
    case "diplomatic_overture":
      return {
        color: "#22c55e", // green
        secondaryColor: "#86efac",
        Icon: Handshake,
        animationClass: "",
      };
    case "economic_preparation":
      return {
        color: "#eab308", // yellow
        secondaryColor: "#fde047",
        Icon: DollarSign,
        animationClass: "",
      };
    case "silence":
      return {
        color: "#6b7280", // gray
        secondaryColor: "#9ca3af",
        Icon: MoreHorizontal,
        animationClass: "",
      };
    case "aggression_spike":
      return {
        color: "#dc2626", // dark red
        secondaryColor: "#f87171",
        Icon: AlertTriangle,
        animationClass: "animate-ping",
      };
    case "treaty_interest":
      return {
        color: "#3b82f6", // blue
        secondaryColor: "#93c5fd",
        Icon: Mail,
        animationClass: "",
      };
    default:
      return {
        color: "#6b7280",
        secondaryColor: "#9ca3af",
        Icon: HelpCircle,
        animationClass: "",
      };
  }
}

/**
 * Check if a tell type is threatening
 */
function isThreatTell(tellType: TellType): boolean {
  return ["military_buildup", "target_fixation", "aggression_spike", "fleet_movement"].includes(
    tellType
  );
}

/**
 * TellIndicator Component
 *
 * Renders visual indicators for behavioral tells.
 * - Basic intel: Generic "something happening" indicator
 * - Moderate/Full intel: Specific icon and color based on tell type
 */
export function TellIndicator({
  tell,
  cx,
  cy,
  size,
  intelLevel,
}: TellIndicatorProps) {
  const style = useMemo(() => getTellVisualStyle(tell.displayType), [tell.displayType]);
  const isThreat = isThreatTell(tell.displayType);

  // Don't show if signal not detected (unknown intel)
  if (!tell.signalDetected) {
    return null;
  }

  // Calculate positions around the empire circle
  const indicatorOffset = size / 2 + 4;
  const indicatorSize = 8;

  // At basic intel, show generic indicator only
  const showSpecificTell = intelLevel === "moderate" || intelLevel === "full";

  // Calculate glow intensity based on confidence
  const glowIntensity = Math.min(1, tell.displayConfidence * 1.2);

  return (
    <g data-testid="tell-indicator">
      {/* Outer glow ring for tells */}
      <circle
        cx={cx}
        cy={cy}
        r={size / 2 + 3}
        fill="none"
        stroke={showSpecificTell ? style.color : (isThreat ? "#ef4444" : "#3b82f6")}
        strokeWidth={1.5}
        strokeOpacity={glowIntensity * 0.6}
        className={style.animationClass}
      />

      {/* Tell indicator positioned above empire */}
      <g transform={`translate(${cx}, ${cy - indicatorOffset - indicatorSize / 2})`}>
        {/* Background circle */}
        <circle
          cx={0}
          cy={0}
          r={indicatorSize / 2 + 2}
          fill={showSpecificTell ? style.color : "#4b5563"}
          fillOpacity={0.9}
        />

        {/* Icon using foreignObject for Lucide components */}
        <foreignObject
          x={-ICON_SIZE / 2}
          y={-ICON_SIZE / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center w-full h-full">
            {showSpecificTell ? (
              <style.Icon size={ICON_SIZE - 2} color="white" strokeWidth={2.5} />
            ) : isThreat ? (
              <AlertCircle size={ICON_SIZE - 2} color="white" strokeWidth={2.5} />
            ) : (
              <HelpCircle size={ICON_SIZE - 2} color="white" strokeWidth={2.5} />
            )}
          </div>
        </foreignObject>
      </g>

      {/* Truth revealed indicator (when player saw through bluff) */}
      {tell.perceivedTruth && showSpecificTell && (
        <g transform={`translate(${cx + indicatorOffset}, ${cy - indicatorOffset})`}>
          <circle
            cx={0}
            cy={0}
            r={4}
            fill="#fbbf24"
            fillOpacity={0.9}
          />
          <foreignObject
            x={-4}
            y={-4}
            width={8}
            height={8}
            className="pointer-events-none"
          >
            <div className="flex items-center justify-center w-full h-full">
              <Star size={6} color="#000" fill="#000" strokeWidth={2} />
            </div>
          </foreignObject>
        </g>
      )}

      {/* Confidence indicator (small dots) */}
      {showSpecificTell && (
        <g transform={`translate(${cx}, ${cy + indicatorOffset + 4})`}>
          {[0, 1, 2].map((i) => {
            const dotActive = tell.displayConfidence >= (i + 1) / 3;
            return (
              <circle
                key={i}
                cx={(i - 1) * 4}
                cy={0}
                r={1.5}
                fill={dotActive ? style.color : "#374151"}
                fillOpacity={dotActive ? 0.8 : 0.3}
              />
            );
          })}
        </g>
      )}
    </g>
  );
}

export default TellIndicator;
