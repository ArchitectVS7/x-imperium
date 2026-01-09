"use client";

/**
 * Combat Panel Content
 *
 * Panel version of the combat page for starmap-centric UI.
 * Supports pre-selecting a target from starmap context.
 */

import { useState, useEffect, useTransition } from "react";
import { BattleReport } from "@/components/game/combat/BattleReport";
import { CombatPreview } from "@/components/game/combat/CombatPreview";
import {
  getAvailableTargetsAction,
  getMyForcesAction,
  launchAttackAction,
} from "@/app/actions/combat-actions";
import type { Forces, AttackType, CombatResult } from "@/lib/combat/phases";

interface Target {
  id: string;
  name: string;
  networth: number;
  sectorCount: number;
}

interface CombatPanelContentProps {
  /** Pre-selected target empire ID from starmap */
  targetEmpireId?: string;
  onClose?: () => void;
  onBattleComplete?: (result: CombatResult) => void;
}

export function CombatPanelContent({
  targetEmpireId,
  onBattleComplete,
}: CombatPanelContentProps) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [myForces, setMyForces] = useState<Forces | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attack state
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [attackType, setAttackType] = useState<AttackType>("invasion");
  const [selectedForces, setSelectedForces] = useState<Forces>({
    soldiers: 0,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
  });

  // Combat result
  const [lastResult, setLastResult] = useState<CombatResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [targetsResult, forcesResult] = await Promise.all([
          getAvailableTargetsAction(),
          getMyForcesAction(),
        ]);

        if (targetsResult.success && targetsResult.targets) {
          setTargets(targetsResult.targets);
          // Pre-select target if provided
          if (targetEmpireId) {
            const target = targetsResult.targets.find(t => t.id === targetEmpireId);
            if (target) {
              setSelectedTarget(target);
            }
          }
        }
        if (forcesResult.success && forcesResult.forces) {
          setMyForces(forcesResult.forces);
        }
      } catch (err) {
        console.error("Failed to load combat data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [targetEmpireId]);

  // Handle attack
  const handleAttack = () => {
    if (!selectedTarget) return;

    startTransition(async () => {
      try {
        const result = await launchAttackAction(
          selectedTarget.id,
          attackType,
          selectedForces
        );

        if (result.success && result.result) {
          setLastResult(result.result);
          onBattleComplete?.(result.result);
          // Refresh forces
          const forcesResult = await getMyForcesAction();
          if (forcesResult.success && forcesResult.forces) {
            setMyForces(forcesResult.forces);
          }
          // Reset selection
          setSelectedForces({
            soldiers: 0,
            fighters: 0,
            stations: 0,
            lightCruisers: 0,
            heavyCruisers: 0,
            carriers: 0,
          });
        } else {
          setError(result.error ?? "Attack failed");
        }
      } catch (err) {
        console.error("Attack failed:", err);
        setError(err instanceof Error ? err.message : "Attack failed");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="h-32 bg-gray-800 rounded" />
        <div className="h-24 bg-gray-800 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Show battle report if we have a result
  if (lastResult) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-lcars-lavender">Battle Report</h3>
        <BattleReport
          result={lastResult}
          attackerName="Your Empire"
          defenderName={selectedTarget?.name ?? "Enemy"}
        />
        <button
          onClick={() => setLastResult(null)}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
        >
          Plan Another Attack
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Target Selection */}
      <div>
        <h3 className="text-sm font-semibold text-lcars-lavender mb-2">Select Target</h3>
        {targets.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No targets available.
          </div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {targets.map((target) => (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target)}
                className={`w-full p-2 rounded text-left text-sm transition-colors ${
                  selectedTarget?.id === target.id
                    ? "bg-lcars-amber/20 border border-lcars-amber"
                    : "bg-gray-800 hover:bg-gray-700 border border-transparent"
                }`}
              >
                <div className="font-medium">{target.name}</div>
                <div className="text-xs text-gray-400">
                  NW: {target.networth.toLocaleString()} | Sectors: {target.sectorCount}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attack Type */}
      <div>
        <h3 className="text-sm font-semibold text-lcars-lavender mb-2">Attack Type</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setAttackType("invasion")}
            className={`flex-1 p-2 rounded text-sm transition-colors ${
              attackType === "invasion"
                ? "bg-red-600 text-white"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <div className="font-medium">Invasion</div>
            <div className="text-xs opacity-75">Full 3-phase</div>
          </button>
          <button
            onClick={() => setAttackType("guerilla")}
            className={`flex-1 p-2 rounded text-sm transition-colors ${
              attackType === "guerilla"
                ? "bg-orange-600 text-white"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <div className="font-medium">Guerilla</div>
            <div className="text-xs opacity-75">Hit & run</div>
          </button>
        </div>
      </div>

      {/* Force Selection */}
      {myForces && (
        <div>
          <h3 className="text-sm font-semibold text-lcars-lavender mb-2">Forces to Send</h3>
          <div className="space-y-2">
            {(Object.keys(myForces) as Array<keyof Forces>).map((unit) => {
              const inputId = `combat-panel-force-${unit}`;
              return (
                <div key={unit} className="flex items-center justify-between text-sm">
                  <label htmlFor={inputId} className="capitalize text-gray-300">{unit}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">
                      /{myForces[unit]}
                    </span>
                    <input
                      id={inputId}
                      type="number"
                      min={0}
                      max={myForces[unit]}
                      value={selectedForces[unit]}
                      onChange={(e) =>
                        setSelectedForces((prev) => ({
                          ...prev,
                          [unit]: Math.min(
                            Math.max(0, parseInt(e.target.value) || 0),
                            myForces[unit]
                          ),
                        }))
                      }
                      className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-right text-sm"
                      disabled={attackType === "guerilla" && unit !== "soldiers"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Combat Preview / Attack Button */}
      {selectedTarget && myForces && (
        <div className={isPending ? "opacity-50 pointer-events-none" : ""}>
          {isPending && (
            <div className="text-center text-lcars-amber mb-2 animate-pulse font-semibold text-sm">
              ATTACKING...
            </div>
          )}
          <CombatPreview
            attackerForces={selectedForces}
            defenderForces={{
              soldiers: Math.floor(selectedTarget.networth * 0.001),
              fighters: Math.floor(selectedTarget.networth * 0.0002),
              stations: selectedTarget.sectorCount * 50,
              lightCruisers: Math.floor(selectedTarget.networth * 0.00001),
              heavyCruisers: Math.floor(selectedTarget.networth * 0.000002),
              carriers: Math.floor(selectedTarget.networth * 0.000005),
            }}
            attackerName="Your Empire"
            defenderName={selectedTarget.name}
            hasFullIntel={false}
            onConfirmAttack={handleAttack}
            onCancel={() => setSelectedTarget(null)}
          />
        </div>
      )}

      {!selectedTarget && (
        <div className="text-center text-gray-400 py-4 text-sm">
          Select a target to plan your attack
        </div>
      )}
    </div>
  );
}

export default CombatPanelContent;
