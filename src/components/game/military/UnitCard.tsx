"use client";

import {
  UNIT_COSTS,
  UNIT_POPULATION,
  UNIT_MAINTENANCE,
  UNIT_LABELS,
  UNIT_DESCRIPTIONS,
  type UnitType,
} from "@/lib/game/unit-config";
import { UNIT_BUILD_TIMES } from "@/lib/game/build-config";
import { getRequiredResearchLevel } from "@/lib/game/services/military/unit-service";

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  soldiers: "border-green-500/50 bg-green-900/10",
  fighters: "border-blue-500/50 bg-blue-900/10",
  stations: "border-purple-500/50 bg-purple-900/10",
  lightCruisers: "border-cyan-500/50 bg-cyan-900/10",
  heavyCruisers: "border-orange-500/50 bg-orange-900/10",
  carriers: "border-red-500/50 bg-red-900/10",
  covertAgents: "border-gray-500/50 bg-gray-900/10",
};

const UNIT_TEXT_COLORS: Record<UnitType, string> = {
  soldiers: "text-green-400",
  fighters: "text-blue-400",
  stations: "text-purple-400",
  lightCruisers: "text-cyan-400",
  heavyCruisers: "text-orange-400",
  carriers: "text-red-400",
  covertAgents: "text-gray-400",
};

interface UnitCardProps {
  unitType: UnitType;
  count: number;
  isLocked?: boolean;
  researchLevel?: number;
  compact?: boolean;
}

export function UnitCard({
  unitType,
  count,
  isLocked = false,
  researchLevel = 0,
  compact = false,
}: UnitCardProps) {
  const requiredLevel = getRequiredResearchLevel(unitType);
  const cardColor = UNIT_TYPE_COLORS[unitType];
  const textColor = UNIT_TEXT_COLORS[unitType];

  if (compact) {
    return (
      <div
        className={`flex justify-between items-center p-2 rounded border ${
          isLocked ? "border-gray-700 bg-gray-900/50 opacity-50" : cardColor
        }`}
        data-testid={`unit-card-${unitType}`}
      >
        <span className={isLocked ? "text-gray-500" : textColor}>
          {UNIT_LABELS[unitType]}
          {isLocked && <span className="ml-2 text-xs text-red-400">LOCKED</span>}
        </span>
        <span className="font-mono text-white">{count.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded border ${
        isLocked ? "border-gray-700 bg-gray-900/50 opacity-60" : cardColor
      }`}
      data-testid={`unit-card-${unitType}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={`font-semibold ${isLocked ? "text-gray-500" : textColor}`}>
            {UNIT_LABELS[unitType]}
            {isLocked && (
              <span className="ml-2 text-xs text-red-400 font-normal">LOCKED</span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{UNIT_DESCRIPTIONS[unitType]}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-white">{count.toLocaleString()}</div>
          <div className="text-xs text-gray-500">owned</div>
        </div>
      </div>

      {isLocked && requiredLevel > researchLevel && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-800/50 rounded text-xs text-red-300">
          Requires Fundamental Research Level {requiredLevel}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-black/30 p-2 rounded">
          <div className="text-gray-500">Cost</div>
          <div className="font-mono text-lcars-amber">
            {UNIT_COSTS[unitType].toLocaleString()} cr
          </div>
        </div>
        <div className="bg-black/30 p-2 rounded">
          <div className="text-gray-500">Population</div>
          <div className="font-mono text-green-400">
            {UNIT_POPULATION[unitType]} pop
          </div>
        </div>
        <div className="bg-black/30 p-2 rounded">
          <div className="text-gray-500">Build Time</div>
          <div className="font-mono text-blue-400">
            {UNIT_BUILD_TIMES[unitType]} turn{UNIT_BUILD_TIMES[unitType] !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="bg-black/30 p-2 rounded">
          <div className="text-gray-500">Maintenance</div>
          <div className="font-mono text-purple-400">
            {UNIT_MAINTENANCE[unitType]} cr/turn
          </div>
        </div>
      </div>
    </div>
  );
}
