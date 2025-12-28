"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAvailableContractsAction,
  getActiveContractsAction,
  acceptContractAction,
  type ContractDisplay,
} from "@/app/actions/syndicate-actions";
import { CONTRACT_TYPE_LABELS } from "@/lib/game/constants/syndicate";

interface ContractBoardProps {
  refreshTrigger?: number;
  onContractAccepted?: () => void;
}

type TabType = "available" | "active";

const RISK_COLORS = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  very_high: "text-red-400",
};

export function ContractBoard({ refreshTrigger, onContractAccepted }: ContractBoardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const [availableContracts, setAvailableContracts] = useState<ContractDisplay[]>([]);
  const [activeContracts, setActiveContracts] = useState<ContractDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingContract, setAcceptingContract] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [available, active] = await Promise.all([
        getAvailableContractsAction(),
        getActiveContractsAction(),
      ]);
      setAvailableContracts(available ?? []);
      setActiveContracts(active ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts, refreshTrigger]);

  const handleAcceptContract = async (contract: ContractDisplay) => {
    if (!contract.isAvailable) return;

    setAcceptingContract(contract.type);
    setError(null);

    try {
      const result = await acceptContractAction(contract.type, contract.targetEmpireId);
      if (result.success) {
        await loadContracts();
        onContractAccepted?.();
      } else {
        setError(result.error ?? "Failed to accept contract");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept contract");
    } finally {
      setAcceptingContract(null);
    }
  };

  const formatReward = (reward: number | "varies" | "special"): string => {
    if (reward === "varies") return "Variable";
    if (reward === "special") return "Special Reward";
    return `${reward.toLocaleString()} Cr`;
  };

  if (isLoading) {
    return (
      <div className="bg-black/40 border border-gray-700/50 rounded p-4">
        <div className="text-gray-400 text-sm">Loading contracts...</div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-gray-700/50 rounded overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "available"
              ? "bg-lcars-purple/20 text-lcars-purple border-b-2 border-lcars-purple"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Available ({availableContracts.filter((c) => c.isAvailable).length})
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "active"
              ? "bg-lcars-amber/20 text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Active ({activeContracts.filter((c) => c.status === "in_progress").length})
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/30 border-b border-red-800/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === "available" ? (
          availableContracts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No contracts available at your current trust level.
            </p>
          ) : (
            <div className="space-y-3">
              {availableContracts.map((contract) => (
                <div
                  key={contract.id}
                  className={`border rounded p-3 ${
                    contract.isAvailable
                      ? "border-gray-700/50 bg-black/20"
                      : "border-gray-800/50 bg-black/10 opacity-60"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-white">
                        {CONTRACT_TYPE_LABELS[contract.type]}
                      </h4>
                      <span
                        className={`text-xs ${RISK_COLORS[contract.config.risk]}`}
                      >
                        {contract.config.risk.replace("_", " ").toUpperCase()} RISK
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lcars-amber font-mono">
                        {formatReward(contract.creditReward)}
                      </div>
                      <div className="text-cyan-400 text-xs">
                        +{contract.trustReward} TP
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs mb-2">
                    {contract.config.description}
                  </p>

                  {contract.targetEmpireName && (
                    <div className="text-xs text-gray-500 mb-2">
                      Target: <span className="text-orange-400">{contract.targetEmpireName}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {contract.config.turnsToComplete} turns to complete
                    </span>
                    {contract.isAvailable ? (
                      <button
                        onClick={() => handleAcceptContract(contract)}
                        disabled={acceptingContract === contract.type}
                        className="px-3 py-1 bg-lcars-purple/20 border border-lcars-purple/50
                                   text-lcars-purple text-xs rounded hover:bg-lcars-purple/30
                                   disabled:opacity-50 transition-colors"
                      >
                        {acceptingContract === contract.type ? "Accepting..." : "Accept"}
                      </button>
                    ) : (
                      <span className="text-xs text-red-400">
                        {contract.reasonIfUnavailable}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeContracts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No active contracts. Accept a contract to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {activeContracts.map((contract) => (
              <div
                key={contract.id}
                className={`border rounded p-3 ${
                  contract.status === "completed"
                    ? "border-green-700/50 bg-green-900/10"
                    : contract.status === "failed"
                    ? "border-red-700/50 bg-red-900/10"
                    : "border-gray-700/50 bg-black/20"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-white">
                      {CONTRACT_TYPE_LABELS[contract.type]}
                    </h4>
                    <span
                      className={`text-xs ${
                        contract.status === "completed"
                          ? "text-green-400"
                          : contract.status === "failed"
                          ? "text-red-400"
                          : "text-cyan-400"
                      }`}
                    >
                      {contract.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lcars-amber font-mono">
                      {formatReward(contract.creditReward)}
                    </div>
                    <div className="text-cyan-400 text-xs">
                      +{contract.trustReward} TP
                    </div>
                  </div>
                </div>

                {contract.targetEmpireName && (
                  <div className="text-xs text-gray-500 mb-2">
                    Target: <span className="text-orange-400">{contract.targetEmpireName}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Accepted: Turn {contract.acceptedAtTurn}</span>
                  {contract.deadlineTurn && contract.status === "in_progress" && (
                    <span className="text-red-400">
                      Deadline: Turn {contract.deadlineTurn}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
