"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3-force";
import type {
  EmpireMapData,
  StarmapProps,
  TooltipData,
  TreatyConnection,
  IntelLevel,
} from "./types";
import { EmpireTooltip } from "./EmpireTooltip";

// Calculate node size based on sector count and intel level
function getNodeSize(empire: EmpireMapData, isPlayer: boolean): number {
  // Player always shows actual size
  if (isPlayer) {
    return Math.max(25, Math.min(55, 18 + empire.sectorCount * 2.5));
  }

  // For others, size visibility depends on intel
  switch (empire.intelLevel) {
    case "unknown":
      // Unknown empires appear as uniform medium size
      return 30;
    case "basic":
      // Basic intel shows approximate size categories
      if (empire.sectorCount <= 3) return 25;
      if (empire.sectorCount <= 6) return 35;
      if (empire.sectorCount <= 10) return 45;
      return 55;
    case "moderate":
    case "full":
      // Moderate+ shows proportional size
      return Math.max(25, Math.min(55, 18 + empire.sectorCount * 2.5));
    default:
      return 30;
  }
}

// Get nebula color based on empire state and intel
function getNebulaColor(
  empire: EmpireMapData,
  isPlayer: boolean
): { primary: string; secondary: string; glow: string } {
  if (empire.isEliminated) {
    return {
      primary: "#374151",
      secondary: "#1f2937",
      glow: "#4b5563",
    };
  }

  if (isPlayer) {
    return {
      primary: "#3b82f6",
      secondary: "#1d4ed8",
      glow: "#60a5fa",
    };
  }

  // Unknown intel - mysterious dark nebula
  if (empire.intelLevel === "unknown") {
    return {
      primary: "#374151",
      secondary: "#1f2937",
      glow: "#4b5563",
    };
  }

  // Treaty partner - friendly green tint
  if (empire.hasTreaty) {
    return {
      primary: "#059669",
      secondary: "#047857",
      glow: "#34d399",
    };
  }

  // Recent aggressor - angry red
  if (empire.recentAggressor) {
    return {
      primary: "#dc2626",
      secondary: "#991b1b",
      glow: "#f87171",
    };
  }

  // Threat level based colors
  switch (empire.threatLevel) {
    case "at_war":
      return {
        primary: "#dc2626",
        secondary: "#991b1b",
        glow: "#f87171",
      };
    case "hostile":
      return {
        primary: "#ea580c",
        secondary: "#c2410c",
        glow: "#fb923c",
      };
    case "peaceful":
      return {
        primary: "#059669",
        secondary: "#047857",
        glow: "#34d399",
      };
    default:
      // Neutral - standard red for rivals
      return {
        primary: "#ef4444",
        secondary: "#b91c1c",
        glow: "#f87171",
      };
  }
}

// Get opacity based on intel level
function getNebulaOpacity(intelLevel: IntelLevel, isPlayer: boolean): number {
  if (isPlayer) return 0.85;

  switch (intelLevel) {
    case "unknown":
      return 0.25; // Very faded, mysterious
    case "basic":
      return 0.45; // Somewhat visible
    case "moderate":
      return 0.65; // Clearer
    case "full":
      return 0.85; // Fully visible
    default:
      return 0.35;
  }
}

// Generate nebula cloud particles
function generateNebulaParticles(
  count: number,
  baseSize: number,
  seed: number
): Array<{ angle: number; distance: number; size: number; delay: number }> {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const particleSeed = seed + i * 73;
    particles.push({
      angle: ((particleSeed * 31) % 360) * (Math.PI / 180),
      distance: baseSize * 0.3 + ((particleSeed * 37) % (baseSize * 0.5)),
      size: baseSize * 0.15 + ((particleSeed * 41) % (baseSize * 0.25)),
      delay: ((particleSeed * 43) % 30) / 10,
    });
  }
  return particles;
}

// Generate deterministic star positions using a seed
function generateStars(
  count: number,
  width: number,
  height: number
): Array<{ x: number; y: number; r: number; delay: number; duration: number }> {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 127;
    const x = (seed * 31) % width;
    const y = (seed * 37) % height;
    const r = 0.5 + ((seed * 41) % 15) / 10;
    const delay = ((seed * 43) % 50) / 10;
    const duration = 2 + ((seed * 47) % 30) / 10;
    stars.push({ x, y, r, delay, duration });
  }
  return stars;
}

// Get treaty connection line color
function getTreatyLineColor(type: TreatyConnection["type"]): string {
  return type === "alliance" ? "#99FFCC" : "#FFCC99";
}

// Nebula Cloud Node Component
function NebulaNode({
  empire,
  isPlayer,
  size,
  colors,
  opacity,
  particles,
}: {
  empire: EmpireMapData;
  isPlayer: boolean;
  size: number;
  colors: { primary: string; secondary: string; glow: string };
  opacity: number;
  particles: Array<{ angle: number; distance: number; size: number; delay: number }>;
}) {
  const filterId = `nebula-filter-${empire.id}`;
  const gradientId = `nebula-gradient-${empire.id}`;
  const isUnknown = empire.intelLevel === "unknown" && !isPlayer;

  return (
    <g className={isUnknown ? "nebula-unknown" : ""}>
      {/* SVG Filters for nebula effect */}
      <defs>
        <filter id={filterId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={isUnknown ? "8" : "4"} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity={opacity} />
          <stop offset="50%" stopColor={colors.secondary} stopOpacity={opacity * 0.7} />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer glow for player or known empires */}
      {(isPlayer || empire.intelLevel !== "unknown") && !empire.isEliminated && (
        <circle
          r={size + 20}
          fill={`url(#${gradientId})`}
          className={isPlayer ? "empire-pulse" : ""}
          style={isPlayer ? ({ "--pulse-radius": `${size + 20}px` } as React.CSSProperties) : {}}
        />
      )}

      {/* Nebula cloud particles */}
      <g filter={`url(#${filterId})`}>
        {particles.map((particle, i) => {
          const px = Math.cos(particle.angle) * particle.distance;
          const py = Math.sin(particle.angle) * particle.distance;
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={particle.size}
              fill={colors.primary}
              opacity={opacity * 0.6}
              className={!isUnknown ? "nebula-particle" : ""}
              style={
                !isUnknown
                  ? ({
                      "--particle-delay": `${particle.delay}s`,
                    } as React.CSSProperties)
                  : {}
              }
            />
          );
        })}

        {/* Core nebula */}
        <ellipse
          rx={size * 0.9}
          ry={size * 0.75}
          fill={colors.primary}
          opacity={opacity}
          transform={`rotate(${(empire.id.charCodeAt(0) * 15) % 45})`}
        />

        {/* Secondary cloud layer */}
        <ellipse
          rx={size * 0.7}
          ry={size * 0.85}
          fill={colors.secondary}
          opacity={opacity * 0.8}
          transform={`rotate(${((empire.id.charCodeAt(1) || 0) * 20) % 60 - 30})`}
        />
      </g>

      {/* Central bright core */}
      <circle r={size * 0.25} fill={colors.glow} opacity={opacity * 0.9} />
      <circle r={size * 0.15} fill="white" opacity={opacity * 0.6} />

      {/* Threat indicator ring for aggressors */}
      {empire.recentAggressor && !isPlayer && (
        <circle
          r={size + 8}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="4,4"
          className="lcars-pulse-alert"
          opacity={0.8}
        />
      )}

      {/* Treaty indicator ring */}
      {empire.hasTreaty && !isPlayer && !empire.recentAggressor && (
        <circle
          r={size + 6}
          fill="none"
          stroke="#99FFCC"
          strokeWidth={1.5}
          strokeDasharray="6,3"
          opacity={0.6}
        />
      )}

      {/* Unknown empire question mark */}
      {isUnknown && (
        <text
          textAnchor="middle"
          dy="0.35em"
          fill="#6b7280"
          fontSize={size * 0.5}
          fontWeight="bold"
          className="pointer-events-none select-none"
        >
          ?
        </text>
      )}

      {/* Empire label (short name) - hidden for unknown */}
      {!isUnknown && (
        <text
          textAnchor="middle"
          dy="0.35em"
          fill="white"
          fontSize={Math.max(10, size / 3)}
          fontWeight="bold"
          className="pointer-events-none select-none"
          style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
        >
          {empire.name.split(" ")[1]?.slice(0, 2) ?? empire.name.slice(0, 2)}
        </text>
      )}

      {/* Player indicator crown/star */}
      {isPlayer && (
        <text
          textAnchor="middle"
          y={-size - 5}
          fill="#fbbf24"
          fontSize="14"
          className="pointer-events-none select-none"
        >
          ★
        </text>
      )}
    </g>
  );
}

export function Starmap({
  empires,
  playerEmpireId,
  currentTurn,
  protectionTurns,
  treaties = [],
  width = 900,
  height = 600,
}: StarmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [nodes, setNodes] = useState<EmpireMapData[]>([]);
  const simulationRef = useRef<d3.Simulation<EmpireMapData, undefined> | null>(null);

  const isProtected = currentTurn <= protectionTurns;

  // Generate stars once based on dimensions
  const stars = useMemo(() => generateStars(100, width, height), [width, height]);

  // Initialize nodes with positions
  useEffect(() => {
    const centerX = width / 2;
    const centerY = height / 2;

    const initializedNodes = empires.map((empire, index) => {
      const isPlayer = empire.id === playerEmpireId;
      const angle = (index / empires.length) * 2 * Math.PI;
      const radius = isPlayer ? 0 : 150 + Math.random() * 100;

      return {
        ...empire,
        x: centerX + (isPlayer ? 0 : Math.cos(angle) * radius),
        y: centerY + (isPlayer ? 0 : Math.sin(angle) * radius),
        fx: isPlayer ? centerX : null,
        fy: isPlayer ? centerY : null,
      };
    });

    setNodes(initializedNodes);
  }, [empires, playerEmpireId, width, height]);

  // Setup force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const centerX = width / 2;
    const centerY = height / 2;

    const simulation = d3
      .forceSimulation<EmpireMapData>(nodes)
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(centerX, centerY))
      .force(
        "collision",
        d3.forceCollide<EmpireMapData>().radius((d) => {
          const isPlayer = d.id === playerEmpireId;
          return getNodeSize(d, isPlayer) + 15;
        })
      )
      .force("x", d3.forceX(centerX).strength(0.04))
      .force("y", d3.forceY(centerY).strength(0.04))
      .alphaDecay(0.02);

    simulation.on("tick", () => {
      setNodes([...simulation.nodes()]);
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, width, height]);

  // Handle node hover
  const handleMouseEnter = useCallback(
    (empire: EmpireMapData, event: React.MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          empire,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Handle drag
  const handleDragStart = useCallback(
    (empire: EmpireMapData) => {
      if (!simulationRef.current) return;
      simulationRef.current.alphaTarget(0.3).restart();
      const node = nodes.find((n) => n.id === empire.id);
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
      }
    },
    [nodes]
  );

  const handleDrag = useCallback(
    (empire: EmpireMapData, event: React.MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const node = nodes.find((n) => n.id === empire.id);
      if (node) {
        node.fx = event.clientX - rect.left;
        node.fy = event.clientY - rect.top;
        setNodes([...nodes]);
      }
    },
    [nodes]
  );

  const handleDragEnd = useCallback(
    (empire: EmpireMapData) => {
      if (!simulationRef.current) return;
      simulationRef.current.alphaTarget(0);
      const node = nodes.find((n) => n.id === empire.id);
      if (node && node.id !== playerEmpireId) {
        node.fx = null;
        node.fy = null;
      }
    },
    [nodes, playerEmpireId]
  );

  // Count empires by intel level
  const intelCounts = useMemo(() => {
    const counts = { unknown: 0, basic: 0, moderate: 0, full: 0, player: 0 };
    nodes.forEach((n) => {
      if (n.id === playerEmpireId) {
        counts.player++;
      } else if (!n.isEliminated) {
        counts[n.intelLevel]++;
      }
    });
    return counts;
  }, [nodes, playerEmpireId]);

  return (
    <div className="relative" data-testid="starmap">
      {/* Legend */}
      <div className="absolute top-2 left-2 bg-gray-900/90 p-3 rounded-lg text-sm space-y-2 z-10 backdrop-blur-sm">
        <div className="text-xs text-gray-400 font-semibold mb-2">LEGEND</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
          <span className="text-gray-300">Your Empire</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500/80" />
          <span className="text-gray-300">Rival (Known)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-600/50 border border-gray-500" />
          <span className="text-gray-300">Rival (Unknown)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-600/80" />
          <span className="text-gray-300">Treaty Partner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-500/50" />
          <span className="text-gray-300">Eliminated</span>
        </div>

        {/* Treaty line indicators */}
        <div className="pt-2 border-t border-gray-700 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ borderTop: "2px dashed #99FFCC" }} />
            <span className="text-gray-300">Alliance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ borderTop: "2px dashed #FFCC99" }} />
            <span className="text-gray-300">NAP</span>
          </div>
        </div>

        {/* Protection timer */}
        {isProtected && (
          <div className="text-yellow-400 text-xs pt-2 border-t border-gray-700">
            Protection: {protectionTurns - currentTurn + 1} turns
          </div>
        )}
      </div>

      {/* Intel status panel */}
      <div className="absolute top-2 right-2 bg-gray-900/90 p-3 rounded-lg text-sm z-10 backdrop-blur-sm">
        <div className="text-xs text-gray-400 font-semibold mb-2">INTEL STATUS</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Full Intel:</span>
            <span className="text-lcars-mint font-mono">{intelCounts.full}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Partial:</span>
            <span className="text-lcars-amber font-mono">
              {intelCounts.moderate + intelCounts.basic}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Unknown:</span>
            <span className="text-gray-500 font-mono">{intelCounts.unknown}</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="text-gray-400">Active Empires</div>
          <div className="text-2xl font-bold text-lcars-amber">
            {empires.filter((e) => !e.isEliminated).length}/{empires.length}
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-gray-950/80 rounded-lg border border-gray-800"
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="space-bg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="50%" stopColor="#0f0f1a" />
            <stop offset="100%" stopColor="#050510" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="url(#space-bg)" />

        {/* Twinkling stars background */}
        <g className="stars-layer">
          {stars.map((star, i) => (
            <circle
              key={`star-${i}`}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="white"
              className="star-twinkle"
              style={{
                "--twinkle-delay": `${star.delay}s`,
                "--twinkle-duration": `${star.duration}s`,
              } as React.CSSProperties}
            />
          ))}
        </g>

        {/* Treaty connection lines */}
        <g className="treaty-lines-layer">
          {treaties.map((treaty, i) => {
            const empire1 = nodes.find((n) => n.id === treaty.empire1Id);
            const empire2 = nodes.find((n) => n.id === treaty.empire2Id);
            if (!empire1?.x || !empire2?.x || !empire1?.y || !empire2?.y) return null;

            const color = getTreatyLineColor(treaty.type);
            const isAlliance = treaty.type === "alliance";

            return (
              <line
                key={`treaty-${i}`}
                x1={empire1.x}
                y1={empire1.y}
                x2={empire2.x}
                y2={empire2.y}
                stroke={color}
                strokeWidth={isAlliance ? 2.5 : 1.5}
                strokeDasharray={isAlliance ? "10,5" : "5,5"}
                strokeOpacity={0.5}
                className="alliance-line"
              />
            );
          })}
        </g>

        {/* Empire nebula nodes */}
        {nodes.map((empire) => {
          const isPlayer = empire.id === playerEmpireId;
          const size = getNodeSize(empire, isPlayer);
          const colors = getNebulaColor(empire, isPlayer);
          const opacity = getNebulaOpacity(empire.intelLevel, isPlayer);
          const particles = generateNebulaParticles(
            isPlayer ? 10 : 6,
            size,
            empire.id.charCodeAt(0) + (empire.id.charCodeAt(1) || 0)
          );

          return (
            <g
              key={empire.id}
              transform={`translate(${empire.x ?? 0}, ${empire.y ?? 0})`}
              className="cursor-pointer transition-transform hover:scale-105"
              onMouseEnter={(e) => handleMouseEnter(empire, e)}
              onMouseLeave={handleMouseLeave}
              onMouseDown={() => handleDragStart(empire)}
              onMouseMove={(e) => e.buttons === 1 && handleDrag(empire, e)}
              onMouseUp={() => handleDragEnd(empire)}
            >
              <NebulaNode
                empire={empire}
                isPlayer={isPlayer}
                size={size}
                colors={colors}
                opacity={opacity}
                particles={particles}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <EmpireTooltip
          empire={tooltip.empire}
          isProtected={isProtected}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}

      {/* Help hint */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">
        Drag empires to reposition • Hover for details • Run Intel Ops for more info
      </div>
    </div>
  );
}

export default Starmap;
