"use client";

import { useState, useCallback } from "react";
import { TrustMeter } from "./TrustMeter";
import { ContractBoard } from "./ContractBoard";
import { SyndicateCatalog } from "./SyndicateCatalog";
import {
  checkRecruitmentAction,
  acceptSyndicateInvitationAction,
  reportToCoordinatorAction,
  type TrustStatusDisplay,
} from "@/app/actions/syndicate-actions";
import { Drama } from "lucide-react";
import { ConfirmationModal } from "../ConfirmationModal";

type TabType = "overview" | "contracts" | "catalog";

interface BlackMarketPanelProps {
  refreshTrigger?: number;
}

export function BlackMarketPanel({ refreshTrigger: externalTrigger }: BlackMarketPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [status, setStatus] = useState<TrustStatusDisplay | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recruitmentStatus, setRecruitmentStatus] = useState<{
    eligible: boolean;
    bonuses?: { startupFunds: number; trustBonusPercent: number };
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const combinedTrigger = (externalTrigger ?? 0) + refreshTrigger;

  const handleStatusChange = useCallback(async (newStatus: TrustStatusDisplay | null) => {
    setStatus(newStatus);

    // Check recruitment eligibility if not yet connected
    if (!newStatus?.hasAccess && !newStatus?.hasReceivedInvitation && !newStatus?.isHostile) {
      try {
        const result = await checkRecruitmentAction();
        setRecruitmentStatus(result);
      } catch {
        setRecruitmentStatus(null);
      }
    }
  }, []);

  const handleAcceptInvitation = async () => {
    setIsLoading(true);
    setActionMessage(null);

    try {
      const result = await acceptSyndicateInvitationAction();
      if (result.success) {
        setActionMessage({
          type: "success",
          text: `Welcome to the Syndicate! You received ${result.startupFunds?.toLocaleString()} credits as startup funds.`,
        });
        triggerRefresh();
      } else {
        setActionMessage({
          type: "error",
          text: result.error ?? "Failed to accept invitation",
        });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to accept invitation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportClick = () => {
    setShowReportConfirm(true);
  };

  const handleReportConfirm = async () => {
    setShowReportConfirm(false);
    setIsLoading(true);
    setActionMessage(null);

    try {
      const result = await reportToCoordinatorAction();
      if (result.success) {
        setActionMessage({
          type: "success",
          text: `Reported to Coordinator! You received ${result.fundingIncrease?.toLocaleString()} credits. ${result.warning}`,
        });
        triggerRefresh();
      } else {
        setActionMessage({
          type: "error",
          text: result.error ?? "Failed to report",
        });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to report",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccess = status?.hasAccess ?? false;

  return (
    <div className="lcars-panel" data-testid="black-market-panel">
      <h2 className="text-base md:text-lg font-semibold text-lcars-purple mb-4">
        The Galactic Syndicate
      </h2>

      {/* Help text - visible on first visit */}
      {!status?.hasAccess && !status?.hasReceivedInvitation && !status?.isHostile && (
        <div className="bg-gray-800/50 border border-gray-700 rounded p-3 md:p-4 mb-4 text-xs md:text-sm text-gray-400">
          <p className="mb-2 flex items-start gap-2"><Drama className="w-5 h-5 text-lcars-purple flex-shrink-0" /> The Syndicate rewards those who prove their worth.</p>
          <p>Complete contracts to earn trust, unlock rare components, and access forbidden weapons. Betray them... and face the consequences.</p>
        </div>
      )}

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-3 md:p-4 rounded mb-4 ${
            actionMessage.type === "success"
              ? "bg-green-900/30 border border-green-800/50 text-green-400"
              : "bg-red-900/30 border border-red-800/50 text-red-400"
          }`}
        >
          <p className="text-xs md:text-sm">{actionMessage.text}</p>
        </div>
      )}

      {/* Trust Meter */}
      <TrustMeter
        refreshTrigger={combinedTrigger}
        onStatusChange={handleStatusChange}
      />

      {/* Recruitment Invitation */}
      {recruitmentStatus?.eligible && !status?.hasReceivedInvitation && (
        <div className="mt-4 p-3 md:p-4 bg-purple-900/30 border border-purple-800/50 rounded">
          <h3 className="font-semibold text-purple-300 mb-2 text-sm md:text-base">
            You Have Been Contacted
          </h3>
          <p className="text-gray-300 text-xs md:text-sm mb-3">
            The Syndicate sees potential in you. Accept their invitation to gain access
            to the Black Market and lucrative contracts.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
            <div className="text-xs md:text-sm">
              <span className="text-gray-400">Startup Funds:</span>{" "}
              <span className="text-lcars-amber font-mono">
                {recruitmentStatus.bonuses?.startupFunds.toLocaleString()} Cr
              </span>
            </div>
            <div className="text-xs md:text-sm">
              <span className="text-gray-400">Trust Bonus:</span>{" "}
              <span className="text-cyan-400 font-mono">
                +{recruitmentStatus.bonuses?.trustBonusPercent}%
              </span>
            </div>
          </div>
          <button
            onClick={handleAcceptInvitation}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 md:py-3 bg-purple-600 text-white text-sm md:text-base rounded hover:bg-purple-500
                     disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Accepting..." : "Accept Invitation"}
          </button>
        </div>
      )}

      {/* Tabs (only if has access) */}
      {hasAccess && (
        <>
          <div className="flex border-b border-gray-700/50 mt-4 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === "overview"
                  ? "text-lcars-lavender border-b-2 border-lcars-lavender"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("contracts")}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === "contracts"
                  ? "text-lcars-lavender border-b-2 border-lcars-lavender"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Contracts
            </button>
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === "catalog"
                  ? "text-lcars-lavender border-b-2 border-lcars-lavender"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Black Market
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="p-4 bg-black/30 rounded border border-gray-700/50">
                <h3 className="font-semibold text-white mb-2">How It Works</h3>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                  <li>Complete contracts to earn credits and trust points</li>
                  <li>Higher trust unlocks better items and contracts</li>
                  <li>Trust decays over time without activity</li>
                  <li>Failing contracts loses trust and may drop your level</li>
                </ul>
              </div>

              {/* Report to Coordinator Option */}
              {!status?.isHostile && (
                <div className="p-4 bg-red-900/20 rounded border border-red-800/50">
                  <h3 className="font-semibold text-red-300 mb-2">
                    Report to Coordinator
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Betray the Syndicate to the Coordinator for a one-time funding bonus.
                    Warning: The Syndicate will become hostile and send assassins.
                  </p>
                  <button
                    onClick={handleReportClick}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-700
                             disabled:opacity-50 transition-colors text-sm"
                  >
                    {isLoading ? "Reporting..." : "Report (DANGEROUS)"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "contracts" && (
            <ContractBoard
              refreshTrigger={combinedTrigger}
              onContractAccepted={triggerRefresh}
            />
          )}

          {activeTab === "catalog" && (
            <SyndicateCatalog
              refreshTrigger={combinedTrigger}
              onPurchase={triggerRefresh}
            />
          )}
        </>
      )}

      {/* Hostile Message */}
      {status?.isHostile && (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-800/50 rounded">
          <h3 className="font-semibold text-red-300 mb-2">Marked for Death</h3>
          <p className="text-gray-300 text-sm">
            You betrayed the Syndicate. Their assassins now hunt your generals and agents.
            There is no redemption.
          </p>
        </div>
      )}

      {/* Report to Coordinator Confirmation Modal */}
      <ConfirmationModal
        isOpen={showReportConfirm}
        onClose={() => setShowReportConfirm(false)}
        onConfirm={handleReportConfirm}
        title="Betray the Syndicate"
        message="This will make the Syndicate permanently hostile to your empire."
        details="Assassins will be dispatched to target your generals and agents. This action cannot be undone - there is no path to redemption with the Syndicate."
        variant="danger"
        confirmText="Report to Coordinator"
        cancelText="Cancel"
      />
    </div>
  );
}
