"use client";

interface WormholeConnectionProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status: "undiscovered" | "discovered" | "stabilized" | "collapsed";
}

/**
 * WormholeConnection Component
 *
 * Renders a visual connection between two sectors representing a wormhole.
 * Style varies based on wormhole stability status.
 */
export function WormholeConnection({
  id,
  x1,
  y1,
  x2,
  y2,
  status,
}: WormholeConnectionProps) {
  // Collapsed wormholes are not rendered
  if (status === "collapsed") {
    return null;
  }

  const isStabilized = status === "stabilized";
  const isDiscovered = status === "discovered";

  // Calculate midpoint for curved path or label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Calculate perpendicular offset for curve
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const curveOffset = length * 0.15;
  const perpX = -dy / length * curveOffset;
  const perpY = dx / length * curveOffset;

  // Control point for quadratic curve
  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;

  // Path for curved line
  const pathD = `M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`;

  // Colors based on status
  const strokeColor = isStabilized ? "#66FFCC" : "#FFCC66"; // mint or amber
  const glowColor = isStabilized ? "#34d399" : "#fbbf24";

  return (
    <g data-testid={`wormhole-${id}`}>
      {/* Glow effect */}
      <path
        d={pathD}
        fill="none"
        stroke={glowColor}
        strokeWidth={isStabilized ? 6 : 4}
        strokeOpacity={0.2}
        strokeLinecap="round"
      />

      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isStabilized ? 2 : 1.5}
        strokeOpacity={isStabilized ? 0.8 : 0.5}
        strokeDasharray={isStabilized ? "none" : "8,4"}
        strokeLinecap="round"
        className={isDiscovered ? "animate-pulse" : ""}
      />

      {/* Wormhole node indicator at midpoint */}
      <circle
        cx={midX + perpX * 0.5}
        cy={midY + perpY * 0.5}
        r={isStabilized ? 6 : 4}
        fill={isStabilized ? "#66FFCC" : "#FFCC66"}
        fillOpacity={0.8}
        stroke={isStabilized ? "#34d399" : "#fbbf24"}
        strokeWidth={1}
      />

      {/* Inner bright core */}
      <circle
        cx={midX + perpX * 0.5}
        cy={midY + perpY * 0.5}
        r={isStabilized ? 3 : 2}
        fill="white"
        fillOpacity={0.6}
      />

      {/* Status label for unstable wormholes */}
      {isDiscovered && (
        <text
          x={midX + perpX * 0.5}
          y={midY + perpY * 0.5 + 14}
          textAnchor="middle"
          fill="#FFCC66"
          fontSize="8"
          opacity={0.7}
          className="pointer-events-none select-none"
        >
          UNSTABLE
        </text>
      )}
    </g>
  );
}

export default WormholeConnection;
