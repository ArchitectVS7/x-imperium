"use client";

/**
 * Covert Operations Panel Content
 *
 * Panel version of the covert ops page for starmap-centric UI.
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

interface CovertPanelContentProps {
  /** Pre-selected target empire ID from starmap */
  targetEmpireId?: string;
  onClose?: () => void;
}

export function CovertPanelContent({ targetEmpireId }: CovertPanelContentProps) {
  const [status, setStatus] = useState<CovertStatus | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [previews, setPreviews] = useState<Map<OperationType, OperationPreview>>(new Map());
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
        // Pre-select target if provided
        if (targetEmpireId) {
          const target = targetsResult.targets.find(t => t.id === targetEmpireId);
          if (target) {
            setSelectedTarget(target);
          }
        }
      }
      if (operationsResult.success && operationsResult.operations) {
        setOperations(operationsResult.operations);
      }

      setLoading(false);
    }
    loadData();
  }, [targetEmpireId]);

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
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-gray-800 rounded" />
        <div className="h-24 bg-gray-800 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Result Alert */}
      {lastResult && (
        <div
          className={`p-3 rounded border text-sm ${
            lastResult.success
              ? "bg-green-900/30 border-green-500/50 text-green-300"
              : "bg-red-900/30 border-red-500/50 text-red-300"
          }`}
        >
          <p className="font-medium">{lastResult.message}</p>
          {lastResult.effects.length > 0 && (
            <ul className="mt-1 text-xs">
              {lastResult.effects.map((effect, i) => (
                <li key={i}>- {effect}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Status */}
      <CovertStatusPanel />

      {/* Target Selector */}
      <TargetSelector
        targets={targets}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
      />

      {/* Operations */}
      {!selectedTarget && (
        <div className="text-center py-4 text-gray-400 text-sm">
          Select a target to view operations
        </div>
      )}

      {selectedTarget && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-lcars-lavender">Operations</h3>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {operations.slice(0, 4).map((operation) => (
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
      )}
    </div>
  );
}

export default CovertPanelContent;
