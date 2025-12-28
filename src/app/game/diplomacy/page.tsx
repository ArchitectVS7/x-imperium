import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  hasActiveGameAction,
  getCurrentGameAction,
} from "@/app/actions/game-actions";
import { DiplomacyPanel } from "@/components/game/diplomacy/DiplomacyPanel";
import { ProposeTreatyPanel } from "@/components/game/diplomacy/ProposeTreatyPanel";

async function DiplomacyContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  const { gameId, empireId } = await getCurrentGameAction();

  if (!gameId || !empireId) {
    redirect("/game");
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
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Diplomacy</h1>
      <Suspense fallback={<DiplomacySkeleton />}>
        <DiplomacyContent />
      </Suspense>
    </div>
  );
}
