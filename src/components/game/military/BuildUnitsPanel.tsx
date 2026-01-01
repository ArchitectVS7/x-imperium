"use client";

import { useState, useTransition } from "react";
import { addToBuildQueueAction } from "@/app/actions/build-queue-actions";
import {
  UNIT_TYPES,
  UNIT_COSTS,
  UNIT_POPULATION,
  UNIT_LABELS,
  UNIT_DESCRIPTIONS,
  type UnitType,
} from "@/lib/game/unit-config";
import { UNIT_BUILD_TIMES } from "@/lib/game/build-config";
import { isFeatureUnlocked, getUnlockTurn } from "@/lib/constants/unlocks";

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  soldiers: "text-green-400",
  fighters: "text-blue-400",
  stations: "text-purple-400",
  lightCruisers: "text-cyan-400",
  heavyCruisers: "text-orange-400",
  carriers: "text-red-400",
  covertAgents: "text-gray-400",
};

interface BuildUnitsPanelProps {
  credits: number;
  population: number;
  researchLevel: number;
  currentTurn?: number;
  onBuildQueued?: () => void;
}

export function BuildUnitsPanel({
  credits,
  population,
  researchLevel,
  currentTurn = 1,
  onBuildQueued,
}: BuildUnitsPanelProps) {
  const [selectedUnit, setSelectedUnit] = useState<UnitType | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBuild = async () => {
    if (!selectedUnit || quantity <= 0) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await addToBuildQueueAction(selectedUnit, quantity);
      if (result.success) {
        setSuccess(
          `Queued ${quantity.toLocaleString()} ${UNIT_LABELS[selectedUnit]}. ` +
          `Cost: ${result.creditsDeducted?.toLocaleString()} credits. ` +
          `Build time: ${UNIT_BUILD_TIMES[selectedUnit]} turn(s).`
        );
        setQuantity(1);
        onBuildQueued?.();
      } else {
        setError(result.error || "Failed to queue build");
      }
    });
  };

  const isUnitLocked = (unitType: UnitType): boolean => {
    // Research level lock for light cruisers
    if (unitType === "lightCruisers" && researchLevel < 2) {
      return true;
    }
    // Turn-based lock for heavy cruisers (advanced_ships unlock at Turn 50)
    if (unitType === "heavyCruisers" && !isFeatureUnlocked("advanced_ships", currentTurn)) {
      return true;
    }
    return false;
  };

  const getUnitLockReason = (unitType: UnitType): string | null => {
    if (unitType === "lightCruisers" && researchLevel < 2) {
      return "Requires Research Level 2";
    }
    // Turn-based lock for heavy cruisers
    if (unitType === "heavyCruisers" && !isFeatureUnlocked("advanced_ships", currentTurn)) {
      const unlockTurn = getUnlockTurn("advanced_ships");
      const turnsRemaining = unlockTurn - currentTurn;
      return `Requires Turn ${unlockTurn} (${turnsRemaining} turn${turnsRemaining !== 1 ? "s" : ""})`;
    }
    return null;
  };

  const calculateTotalCost = (unitType: UnitType, qty: number) => {
    return UNIT_COSTS[unitType] * qty;
  };

  const calculatePopulationCost = (unitType: UnitType, qty: number) => {
    return UNIT_POPULATION[unitType] * qty;
  };

  const canAfford = (unitType: UnitType, qty: number): boolean => {
    const creditCost = calculateTotalCost(unitType, qty);
    const popCost = calculatePopulationCost(unitType, qty);
    return credits >= creditCost && population >= popCost && !isUnitLocked(unitType);
  };

  const getMaxAffordable = (unitType: UnitType): number => {
    if (isUnitLocked(unitType)) return 0;
    const byCredits = Math.floor(credits / UNIT_COSTS[unitType]);
    const byPopulation = Math.floor(population / UNIT_POPULATION[unitType]);
    return Math.min(byCredits, byPopulation);
  };

  return (
    <div className="lcars-panel" data-testid="build-units-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Build Units
      </h2>

      {error && (
        <div className="mb-4 p-2 bg-red-900/50 border border-red-500 text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-2 bg-green-900/50 border border-green-500 text-green-300 text-sm rounded">
          {success}
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
        {UNIT_TYPES.map((unitType) => {
          const isLocked = isUnitLocked(unitType);
          const lockReason = getUnitLockReason(unitType);
          const maxAffordable = getMaxAffordable(unitType);
          const color = UNIT_TYPE_COLORS[unitType];
          const isSelected = selectedUnit === unitType;

          return (
            <div key={unitType} className="relative group">
              <button
                onClick={() => {
                  if (!isLocked) {
                    setSelectedUnit(unitType);
                    setQuantity(1);
                    setError(null);
                    setSuccess(null);
                  }
                }}
                disabled={isLocked}
                className={`w-full text-left p-3 rounded border transition-all ${
                  isSelected
                    ? "border-lcars-amber bg-lcars-amber/10 scale-[1.02]"
                    : isLocked
                    ? "border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed"
                    : "border-gray-700 bg-black/30 hover:border-gray-500 hover:scale-[1.01]"
                }`}
                data-testid={`unit-select-${unitType}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`font-semibold ${isLocked ? "text-gray-500" : color}`}>
                      {UNIT_LABELS[unitType]}
                      {isLocked && <span className="ml-2 text-xs text-red-400">LOCKED</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {UNIT_DESCRIPTIONS[unitType]}
                    </div>
                    {lockReason && (
                      <div className="text-xs text-red-400 mt-1">
                        {lockReason}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-gray-400">
                      {UNIT_COSTS[unitType].toLocaleString()} cr | {UNIT_POPULATION[unitType]} pop
                    </div>
                    <div className="text-gray-500">
                      {UNIT_BUILD_TIMES[unitType]} turn{UNIT_BUILD_TIMES[unitType] !== 1 ? "s" : ""}
                    </div>
                    {!isLocked && (
                      <div className="text-lcars-amber mt-1">
                        Max: {maxAffordable.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Hover Preview Tooltip - only show if not locked */}
              {!isLocked && (
                <div className="absolute left-full ml-3 top-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-gray-900 border-2 border-gray-700 group-hover:border-lcars-amber/50 p-4 rounded-lg shadow-2xl w-72">
                  <div className="space-y-2">
                    <div className="font-display text-lcars-amber border-b border-gray-700 pb-2">
                      {UNIT_LABELS[unitType]} Details
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Cost per unit</div>
                        <div className="text-lcars-amber font-mono">{UNIT_COSTS[unitType].toLocaleString()} cr</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Population</div>
                        <div className="text-blue-400 font-mono">{UNIT_POPULATION[unitType]} pop</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Build time</div>
                        <div className="text-gray-300 font-mono">{UNIT_BUILD_TIMES[unitType]} turn{UNIT_BUILD_TIMES[unitType] !== 1 ? "s" : ""}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Max affordable</div>
                        <div className="text-green-400 font-mono">{maxAffordable.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-400 leading-relaxed">
                        {UNIT_DESCRIPTIONS[unitType]}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedUnit && (
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-gray-400 text-sm">Quantity:</label>
            <input
              type="number"
              min={1}
              max={getMaxAffordable(selectedUnit)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-2 py-1 bg-black border border-gray-600 rounded text-white font-mono text-center focus:border-lcars-amber focus:outline-none"
            />
            <button
              onClick={() => setQuantity(getMaxAffordable(selectedUnit))}
              className="text-xs text-lcars-amber hover:underline"
            >
              Max
            </button>
          </div>

          <div className="text-sm text-gray-400 mb-4 space-y-1">
            <div className="flex justify-between">
              <span>Credit Cost:</span>
              <span className={calculateTotalCost(selectedUnit, quantity) > credits ? "text-red-400" : "text-lcars-amber"}>
                {calculateTotalCost(selectedUnit, quantity).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Population Cost:</span>
              <span className={calculatePopulationCost(selectedUnit, quantity) > population ? "text-red-400" : "text-lcars-amber"}>
                {calculatePopulationCost(selectedUnit, quantity).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Build Time:</span>
              <span className="text-gray-300">
                {UNIT_BUILD_TIMES[selectedUnit]} turn{UNIT_BUILD_TIMES[selectedUnit] !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <button
            onClick={handleBuild}
            disabled={isPending || !canAfford(selectedUnit, quantity) || quantity <= 0}
            className={`w-full py-2 rounded font-semibold transition-colors ${
              canAfford(selectedUnit, quantity) && quantity > 0
                ? "bg-lcars-amber text-black hover:bg-lcars-amber/80"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isPending ? "Queueing..." : `Queue ${quantity.toLocaleString()} ${UNIT_LABELS[selectedUnit]}`}
          </button>
        </div>
      )}
    </div>
  );
}
