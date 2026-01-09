import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  hasActiveGameAction,
  getCurrentGameAction,
  fetchDashboardDataAction,
} from "@/app/actions/game-actions";
import { DiplomacyPanel } from "@/components/game/diplomacy/DiplomacyPanel";
import { ProposeTreatyPanel } from "@/components/game/diplomacy/ProposeTreatyPanel";
import { isFeatureUnlocked, getUnlockDefinition } from "@/lib/constants/unlocks";

async function DiplomacyContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  const { gameId, empireId } = await getCurrentGameAction();

  if (!gameId || !empireId) {
    redirect("/game");
  }

  // Fetch current turn for unlock check
  const dashboardData = await fetchDashboardDataAction();
  const currentTurn = dashboardData?.turn.currentTurn ?? 1;

  // Check if diplomacy is unlocked
  const isDiplomacyUnlocked = isFeatureUnlocked("diplomacy_basics", currentTurn);
  const unlockDef = getUnlockDefinition("diplomacy_basics");

  if (!isDiplomacyUnlocked) {
    const turnsRemaining = unlockDef.unlockTurn - currentTurn;
    return (
      <div className="lcars-panel text-center py-12" data-testid="diplomacy-locked">
        <div className="max-w-md mx-auto">
          <svg
            className="w-16 h-16 mx-auto text-lcars-amber mb-4 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-xl font-display text-lcars-amber mb-3">
            Diplomatic Channels Closed
          </h2>
          <p className="text-gray-400 mb-4">
            The Galactic Council has not yet established diplomatic protocols for
            your empire. Focus on building your power base.
          </p>
          <div className="text-sm text-gray-500 mb-2">
            Diplomacy opens at <span className="text-lcars-lavender font-mono">Turn {unlockDef.unlockTurn}</span>
          </div>
          <div className="text-lcars-blue">
            {turnsRemaining} turn{turnsRemaining !== 1 ? "s" : ""} remaining
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DiplomacyPanel gameId={gameId} empireId={empireId} />
      <ProposeTreatyPanel gameId={gameId} empireId={empireId} />
    </div>
  );
}

function DiplomacySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lcars-panel animate-pulse" data-testid="diplomacy-loading">
        <div className="h-48 bg-gray-800 rounded"></div>
      </div>
      <div className="lcars-panel animate-pulse">
        <div className="h-48 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
}

export default function DiplomacyPage() {
  return (
    <div className="max-w-6xl mx-auto" data-testid="diplomacy-page">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Diplomacy</h1>
      <Suspense fallback={<DiplomacySkeleton />}>
        <DiplomacyContent />
      </Suspense>
    </div>
  );
}
