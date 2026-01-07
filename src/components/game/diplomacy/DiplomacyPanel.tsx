"use client";

/**
 * Diplomacy Panel Component (M7)
 *
 * Displays diplomacy status, active treaties, and pending proposals.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getDiplomacyStatusAction,
  acceptTreatyAction,
  rejectTreatyAction,
  breakTreatyAction,
  endTreatyAction,
} from "@/app/actions/diplomacy-actions";
import { ConfirmationModal } from "../ConfirmationModal";

interface TreatyInfo {
  id: string;
  type: "nap" | "alliance";
  status: string;
  partnerId: string;
  partnerName: string;
  partnerNetworth: number;
  proposedAtTurn: number;
  activatedAtTurn: number | null;
  isProposer: boolean;
}

interface TreatyProposal {
  treatyId: string;
  type: "nap" | "alliance";
  proposerId: string;
  proposerName: string;
  proposerNetworth: number;
  proposedAtTurn: number;
}

interface DiplomacyStatus {
  reputation: number;
  reputationLevel: string;
  activeTreaties: TreatyInfo[];
  pendingProposals: TreatyProposal[];
}

interface DiplomacyPanelProps {
  gameId: string;
  empireId: string;
  onTreatyChange?: () => void;
}

export function DiplomacyPanel({ gameId, empireId, onTreatyChange }: DiplomacyPanelProps) {
  const [status, setStatus] = useState<DiplomacyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [breakTreatyConfirm, setBreakTreatyConfirm] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const result = await getDiplomacyStatusAction(gameId, empireId);
    if (result.success) {
      setStatus(result.data);
    } else {
      setError(result.error || "Failed to load diplomacy status");
    }
    setLoading(false);
  }, [gameId, empireId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleAccept = async (treatyId: string) => {
    setActionLoading(treatyId);
    setError(null);

    const result = await acceptTreatyAction(gameId, treatyId, empireId);
    if (result.success) {
      await fetchStatus();
      onTreatyChange?.();
    } else {
      setError(result.error || "Failed to accept treaty");
    }

    setActionLoading(null);
  };

  const handleReject = async (treatyId: string) => {
    setActionLoading(treatyId);
    setError(null);

    const result = await rejectTreatyAction(treatyId, empireId);
    if (result.success) {
      await fetchStatus();
      onTreatyChange?.();
    } else {
      setError(result.error || "Failed to reject treaty");
    }

    setActionLoading(null);
  };

  const handleBreakClick = (treatyId: string) => {
    setBreakTreatyConfirm(treatyId);
  };

  const handleBreakConfirm = async () => {
    if (!breakTreatyConfirm) return;

    const treatyId = breakTreatyConfirm;
    setBreakTreatyConfirm(null);
    setActionLoading(treatyId);
    setError(null);

    const result = await breakTreatyAction(gameId, treatyId, empireId);
    if (result.success) {
      await fetchStatus();
      onTreatyChange?.();
    } else {
      setError(result.error || "Failed to break treaty");
    }

    setActionLoading(null);
  };

  const handleEnd = async (treatyId: string) => {
    setActionLoading(treatyId);
    setError(null);

    const result = await endTreatyAction(gameId, treatyId, empireId);
    if (result.success) {
      await fetchStatus();
      onTreatyChange?.();
    } else {
      setError(result.error || "Failed to end treaty");
    }

    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="lcars-panel animate-pulse" data-testid="diplomacy-panel-loading">
        <div className="h-48 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="lcars-panel" data-testid="diplomacy-panel-error">
        <p className="text-red-400">{error || "Failed to load diplomacy status"}</p>
      </div>
    );
  }

  const getReputationColor = (level: string) => {
    switch (level) {
      case "Trustworthy":
        return "text-green-400";
      case "Neutral":
        return "text-gray-400";
      case "Suspicious":
        return "text-yellow-400";
      case "Treacherous":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getTreatyTypeColor = (type: string) => {
    return type === "alliance" ? "text-lcars-blue" : "text-lcars-lavender";
  };

  return (
    <div className="lcars-panel" data-testid="diplomacy-panel">
      <h2 className="text-xl font-display text-lcars-amber mb-4">Diplomacy</h2>

      {/* Reputation */}
      <div className="mb-6 p-3 bg-gray-800/50 rounded">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Your Reputation</span>
          <div className="text-right">
            <span className={`font-bold ${getReputationColor(status.reputationLevel)}`}>
              {status.reputationLevel}
            </span>
            <span className="text-sm text-gray-500 ml-2">({status.reputation}/100)</span>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              status.reputation >= 70
                ? "bg-green-500"
                : status.reputation >= 50
                ? "bg-gray-500"
                : status.reputation >= 30
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${status.reputation}%` }}
            data-testid="reputation-bar"
          ></div>
        </div>
      </div>

      {/* Pending Proposals */}
      {status.pendingProposals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm text-gray-400 mb-2">Pending Proposals</h3>
          <div className="space-y-2">
            {status.pendingProposals.map((proposal) => (
              <div
                key={proposal.treatyId}
                className="p-3 bg-lcars-amber/10 border border-lcars-amber/30 rounded"
                data-testid={`proposal-${proposal.treatyId}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{proposal.proposerName}</span>
                    <span className={`ml-2 text-sm ${getTreatyTypeColor(proposal.type)}`}>
                      {proposal.type === "nap" ? "NAP" : "Alliance"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Turn {proposal.proposedAtTurn}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Networth: {proposal.proposerNetworth.toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(proposal.treatyId)}
                    disabled={actionLoading === proposal.treatyId}
                    className="flex-1 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded disabled:opacity-50"
                    data-testid={`accept-${proposal.treatyId}`}
                  >
                    {actionLoading === proposal.treatyId ? "..." : "Accept"}
                  </button>
                  <button
                    onClick={() => handleReject(proposal.treatyId)}
                    disabled={actionLoading === proposal.treatyId}
                    className="flex-1 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded disabled:opacity-50"
                    data-testid={`reject-${proposal.treatyId}`}
                  >
                    {actionLoading === proposal.treatyId ? "..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Treaties */}
      <div>
        <h3 className="text-sm text-gray-400 mb-2">Active Treaties</h3>
        {status.activeTreaties.length === 0 ? (
          <p className="text-gray-500 text-sm" data-testid="no-treaties">
            No active treaties
          </p>
        ) : (
          <div className="space-y-2">
            {status.activeTreaties.map((treaty) => (
              <div
                key={treaty.id}
                className="p-3 bg-gray-800/50 rounded"
                data-testid={`treaty-${treaty.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{treaty.partnerName}</span>
                    <span className={`ml-2 text-sm ${getTreatyTypeColor(treaty.type)}`}>
                      {treaty.type === "nap" ? "NAP" : "Alliance"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Since Turn {treaty.activatedAtTurn}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Networth: {treaty.partnerNetworth.toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEnd(treaty.id)}
                    disabled={actionLoading === treaty.id}
                    className="flex-1 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded disabled:opacity-50"
                    data-testid={`end-${treaty.id}`}
                  >
                    {actionLoading === treaty.id ? "..." : "End Peacefully"}
                  </button>
                  <button
                    onClick={() => handleBreakClick(treaty.id)}
                    disabled={actionLoading === treaty.id}
                    className="flex-1 py-1 bg-red-800 hover:bg-red-700 text-white text-sm rounded disabled:opacity-50"
                    data-testid={`break-${treaty.id}`}
                  >
                    {actionLoading === treaty.id ? "..." : "Break Treaty"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <p className="mt-4 text-red-400 text-sm" data-testid="diplomacy-error">
          {error}
        </p>
      )}

      {/* Break Treaty Confirmation Modal */}
      <ConfirmationModal
        isOpen={breakTreatyConfirm !== null}
        onClose={() => setBreakTreatyConfirm(null)}
        onConfirm={handleBreakConfirm}
        title="Break Treaty"
        message="Breaking a treaty will severely damage your reputation."
        details="Your empire's reputation score will drop significantly, making future diplomatic negotiations more difficult. Other empires may view you as untrustworthy."
        variant="danger"
        confirmText="Break Treaty"
        cancelText="Cancel"
      />
    </div>
  );
}
