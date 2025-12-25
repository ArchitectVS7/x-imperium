"use client";

import { useState, useEffect } from "react";
import { BattleReport } from "@/components/game/combat/BattleReport";
import {
  getAvailableTargetsAction,
  getMyForcesAction,
  getAttackHistoryAction,
  launchAttackAction,
} from "@/app/actions/combat-actions";
import type { Forces, AttackType, CombatResult } from "@/lib/combat/phases";
import type { Attack } from "@/lib/db/schema";

interface Target {
  id: string;
  name: string;
  networth: number;
  planetCount: number;
}

export default function CombatPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [myForces, setMyForces] = useState<Forces | null>(null);
  const [attackHistory, setAttackHistory] = useState<Attack[]>([]);
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
  const [isAttacking, setIsAttacking] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [targetsResult, forcesResult, historyResult] = await Promise.all([
          getAvailableTargetsAction(),
          getMyForcesAction(),
          getAttackHistoryAction(10),
        ]);

        if (targetsResult.success && targetsResult.targets) {
          setTargets(targetsResult.targets);
        }
        if (forcesResult.success && forcesResult.forces) {
          setMyForces(forcesResult.forces);
        }
        if (historyResult.success && historyResult.attacks) {
          setAttackHistory(historyResult.attacks);
        }
      } catch (err) {
        console.error("Failed to load combat data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle attack
  const handleAttack = async () => {
    if (!selectedTarget) return;

    setIsAttacking(true);
    try {
      const result = await launchAttackAction(
        selectedTarget.id,
        attackType,
        selectedForces
      );

      if (result.success && result.result) {
        setLastResult(result.result);
        // Refresh forces and history
        const [forcesResult, historyResult] = await Promise.all([
          getMyForcesAction(),
          getAttackHistoryAction(10),
        ]);
        if (forcesResult.success && forcesResult.forces) {
          setMyForces(forcesResult.forces);
        }
        if (historyResult.success && historyResult.attacks) {
          setAttackHistory(historyResult.attacks);
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
    } finally {
      setIsAttacking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="combat-page">
        <h1 className="text-2xl font-display text-lcars-amber mb-6">Combat</h1>
        <div className="text-gray-400">Loading combat data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="combat-page">
        <h1 className="text-2xl font-display text-lcars-amber mb-6">Combat</h1>
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="combat-page">
      <h1 className="text-2xl font-display text-lcars-amber mb-6">Combat</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Attack Interface */}
        <div className="space-y-6">
          {/* Target Selection */}
          <div className="lcars-panel">
            <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
              Select Target
            </h2>
            {targets.length === 0 ? (
              <div className="text-gray-400 text-sm">
                No targets available. Start a game with bots to have enemies to attack.
              </div>
            ) : (
              <div className="space-y-2">
                {targets.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTarget(target)}
                    className={`w-full p-3 rounded text-left transition-colors ${
                      selectedTarget?.id === target.id
                        ? "bg-lcars-amber/20 border border-lcars-amber"
                        : "bg-gray-800 hover:bg-gray-700 border border-transparent"
                    }`}
                    data-testid={`target-${target.id}`}
                  >
                    <div className="font-semibold">{target.name}</div>
                    <div className="text-sm text-gray-400">
                      Networth: {target.networth.toLocaleString()} | Planets: {target.planetCount}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attack Type */}
          <div className="lcars-panel">
            <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
              Attack Type
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => setAttackType("invasion")}
                className={`flex-1 p-3 rounded transition-colors ${
                  attackType === "invasion"
                    ? "bg-red-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
                data-testid="attack-type-invasion"
              >
                <div className="font-semibold">Invasion</div>
                <div className="text-xs opacity-75">Full 3-phase assault</div>
              </button>
              <button
                onClick={() => setAttackType("guerilla")}
                className={`flex-1 p-3 rounded transition-colors ${
                  attackType === "guerilla"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
                data-testid="attack-type-guerilla"
              >
                <div className="font-semibold">Guerilla</div>
                <div className="text-xs opacity-75">Soldiers only, hit & run</div>
              </button>
            </div>
          </div>

          {/* Force Selection */}
          {myForces && (
            <div className="lcars-panel">
              <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
                Select Forces
              </h2>
              <div className="space-y-3">
                {(Object.keys(myForces) as Array<keyof Forces>).map((unit) => (
                  <div key={unit} className="flex items-center justify-between">
                    <label className="text-sm capitalize">{unit}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">
                        Available: {myForces[unit]}
                      </span>
                      <input
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
                        className="w-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-right"
                        disabled={attackType === "guerilla" && unit !== "soldiers"}
                        data-testid={`force-${unit}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attack Button */}
          <button
            onClick={handleAttack}
            disabled={!selectedTarget || isAttacking}
            className={`w-full p-4 rounded font-semibold transition-colors ${
              selectedTarget && !isAttacking
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
            data-testid="launch-attack-button"
          >
            {isAttacking ? "ATTACKING..." : "LAUNCH ATTACK"}
          </button>
        </div>

        {/* Right Column: Results & History */}
        <div className="space-y-6">
          {/* Last Battle Report */}
          {lastResult && (
            <div className="lcars-panel">
              <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
                Battle Report
              </h2>
              <BattleReport
                result={lastResult}
                attackerName="Your Empire"
                defenderName={selectedTarget?.name ?? "Enemy"}
              />
            </div>
          )}

          {/* Attack History */}
          <div className="lcars-panel">
            <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
              Recent Battles
            </h2>
            {attackHistory.length === 0 ? (
              <div className="text-gray-400 text-sm">No battles yet.</div>
            ) : (
              <div className="space-y-2">
                {attackHistory.map((attack) => (
                  <div
                    key={attack.id}
                    className="p-3 bg-gray-800 rounded text-sm"
                    data-testid={`history-${attack.id}`}
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        Turn {attack.turn}
                      </span>
                      <span
                        className={
                          attack.outcome === "attacker_victory"
                            ? "text-green-400"
                            : attack.outcome === "defender_victory"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }
                      >
                        {attack.outcome.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {attack.attackType} | Captured: {attack.planetCaptured ? "Yes" : "No"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Combat Info */}
          <div className="lcars-panel bg-gray-800/50">
            <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
              Combat System
            </h2>
            <div className="space-y-2 text-sm text-gray-300">
              <div>
                <span className="text-lcars-amber">Invasion:</span> 3-phase combat
                (Space → Orbital → Ground). Win all phases to capture planets.
              </div>
              <div>
                <span className="text-lcars-amber">Guerilla:</span> Hit-and-run
                with soldiers only. Damages enemy forces but no planet capture.
              </div>
              <div>
                <span className="text-lcars-amber">Carriers:</span> Required to
                transport soldiers. Each carrier holds 100 soldiers.
              </div>
              <div>
                <span className="text-lcars-amber">Effectiveness:</span> Wins
                boost army effectiveness (+5-10%). Losses reduce it (-5%).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
