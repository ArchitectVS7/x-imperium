"use client";

/**
 * Covert Operations Page (M6.5)
 *
 * Full covert operations interface with:
 * - Status panel (points, agents)
 * - Target selection
 * - Operation list with execution
 */

import { useEffect, useState, useCallback } from "react";
import { CovertStatusPanel, TargetSelector, OperationCard } from "@/components/game/covert";
import {
  getCovertStatusAction,
  getCovertTargetsAction,
  getCovertOperationsAction,
  executeCovertOpAction,
  previewCovertOpAction,
} from "@/app/actions/covert-actions";
import type { OperationType } from "@/lib/covert/constants";

interface Target {
  id: string;
  name: string;
  networth: number;
  planetCount: number;
}

interface Operation {
  id: OperationType;
  name: string;
  description: string;
  cost: number;
  minAgents: number;
  risk: string;
  baseSuccessRate: number;
}

interface OperationPreview {
  successChance: number;
  catchChance: number;
  canExecute: boolean;
}

interface CovertStatus {
  covertPoints: number;
  maxCovertPoints: number;
  agents: number;
  agentCapacity: number;
  governmentPlanets: number;
}

export default function CovertPage() {
  const [status, setStatus] = useState<CovertStatus | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [previews, setPreviews] = useState<Map<OperationType, OperationPreview>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<OperationType | null>(null);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    effects: string[];
  } | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const [statusResult, targetsResult, operationsResult] = await Promise.all([
        getCovertStatusAction(),
        getCovertTargetsAction(),
        getCovertOperationsAction(),
      ]);

      if (statusResult.success && statusResult.status) {
        setStatus(statusResult.status);
      }
      if (targetsResult.success && targetsResult.targets) {
        setTargets(targetsResult.targets);
      }
      if (operationsResult.success && operationsResult.operations) {
        setOperations(operationsResult.operations);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Load previews when target changes
  useEffect(() => {
    if (!selectedTarget) {
      setPreviews(new Map());
      return;
    }

    async function loadPreviews() {
      const newPreviews = new Map<OperationType, OperationPreview>();

      await Promise.all(
        operations.map(async (op) => {
          const result = await previewCovertOpAction(selectedTarget!.id, op.id);
          if (result.success && result.preview) {
            newPreviews.set(op.id, {
              successChance: result.preview.successChance,
              catchChance: result.preview.catchChance,
              canExecute: result.preview.canExecute,
            });
          }
        })
      );

      setPreviews(newPreviews);
    }

    loadPreviews();
  }, [selectedTarget, operations]);

  // Execute operation
  const handleExecute = useCallback(
    async (operationType: OperationType) => {
      if (!selectedTarget) return;

      setExecuting(operationType);
      setLastResult(null);

      const result = await executeCovertOpAction(selectedTarget.id, operationType);

      if (result.success && result.result) {
        setLastResult({
          success: result.result.success,
          message: result.result.message,
          effects: result.result.appliedEffects,
        });

        // Refresh status
        const statusResult = await getCovertStatusAction();
        if (statusResult.success && statusResult.status) {
          setStatus(statusResult.status);
        }
      } else {
        setLastResult({
          success: false,
          message: result.error || "Operation failed",
          effects: [],
        });
      }

      setExecuting(null);
    },
    [selectedTarget]
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display text-lcars-amber mb-8">
          Covert Operations
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lcars-panel animate-pulse h-32"></div>
          <div className="lcars-panel animate-pulse h-32 lg:col-span-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto" data-testid="covert-page">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        Covert Operations
      </h1>

      {/* Result Alert */}
      {lastResult && (
        <div
          className={`mb-6 p-4 rounded border ${
            lastResult.success
              ? "bg-green-900/30 border-green-500/50 text-green-300"
              : "bg-red-900/30 border-red-500/50 text-red-300"
          }`}
        >
          <p className="font-medium">{lastResult.message}</p>
          {lastResult.effects.length > 0 && (
            <ul className="mt-2 text-sm">
              {lastResult.effects.map((effect, i) => (
                <li key={i}>- {effect}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status Panel */}
        <div>
          <CovertStatusPanel />
        </div>

        {/* Target Selector */}
        <div className="lg:col-span-2">
          <TargetSelector
            targets={targets}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
          />
        </div>
      </div>

      {/* Operations Grid */}
      <h2 className="text-2xl font-display text-lcars-blue mb-4">
        Available Operations
      </h2>

      {!selectedTarget && (
        <div className="lcars-panel text-center py-8">
          <p className="text-gray-400">
            Select a target empire to view operation success rates
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {operations.map((operation) => (
          <OperationCard
            key={operation.id}
            operation={operation}
            preview={previews.get(operation.id)}
            currentPoints={status?.covertPoints ?? 0}
            currentAgents={status?.agents ?? 0}
            onExecute={handleExecute}
            disabled={!selectedTarget}
            executing={executing === operation.id}
          />
        ))}
      </div>
    </div>
  );
}
