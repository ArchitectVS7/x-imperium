"use client";

/**
 * Diplomacy Panel Content
 *
 * Panel version of the diplomacy page for starmap-centric UI.
 * Includes unlock check for early game.
 */

import { useState, useEffect } from "react";
import { getCurrentGameAction, fetchDashboardDataAction } from "@/app/actions/game-actions";
import { DiplomacyPanel } from "@/components/game/diplomacy/DiplomacyPanel";
import { ProposeTreatyPanel } from "@/components/game/diplomacy/ProposeTreatyPanel";
import { isFeatureUnlocked, getUnlockDefinition } from "@/lib/constants/unlocks";
import { Lock } from "lucide-react";

interface DiplomacyPanelContentProps {
  onClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DiplomacyPanelContent({ onClose }: DiplomacyPanelContentProps) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [empireId, setEmpireId] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"treaties" | "propose">("treaties");

  useEffect(() => {
    async function loadSession() {
      const { gameId, empireId } = await getCurrentGameAction();
      const dashboardData = await fetchDashboardDataAction();

      setGameId(gameId ?? null);
      setEmpireId(empireId ?? null);
      setCurrentTurn(dashboardData?.turn.currentTurn ?? 1);
      setIsLoading(false);
    }
    loadSession();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="h-32 bg-gray-800 rounded" />
      </div>
    );
  }

  // Check if diplomacy is unlocked
  const isDiplomacyUnlocked = isFeatureUnlocked("diplomacy_basics", currentTurn);
  const unlockDef = getUnlockDefinition("diplomacy_basics");

  if (!isDiplomacyUnlocked) {
    const turnsRemaining = unlockDef.unlockTurn - currentTurn;
    return (
      <div className="text-center py-8">
        <Lock className="w-12 h-12 mx-auto text-lcars-amber/50 mb-4" />
        <h3 className="text-lg font-display text-lcars-amber mb-2">
          Diplomatic Channels Closed
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          The Galactic Council has not yet established diplomatic protocols.
        </p>
        <div className="text-sm text-gray-500">
          Opens at <span className="text-lcars-lavender font-mono">Turn {unlockDef.unlockTurn}</span>
        </div>
        <div className="text-lcars-blue mt-1">
          {turnsRemaining} turn{turnsRemaining !== 1 ? "s" : ""} remaining
        </div>
      </div>
    );
  }

  if (!gameId || !empireId) {
    return (
      <div className="text-gray-400">
        No active game session. Please start a new game.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setActiveTab("treaties")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "treaties"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Treaties
        </button>
        <button
          onClick={() => setActiveTab("propose")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "propose"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Propose
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "treaties" && (
        <DiplomacyPanel gameId={gameId} empireId={empireId} />
      )}
      {activeTab === "propose" && (
        <ProposeTreatyPanel gameId={gameId} empireId={empireId} />
      )}
    </div>
  );
}

export default DiplomacyPanelContent;
