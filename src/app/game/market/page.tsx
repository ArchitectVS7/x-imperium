import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  hasActiveGameAction,
  getCurrentGameAction,
} from "@/app/actions/game-actions";
import { MarketPanel } from "@/components/game/market/MarketPanel";

async function MarketContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  const { gameId, empireId } = await getCurrentGameAction();

  if (!gameId || !empireId) {
    redirect("/game");
  }

  return <MarketPanel gameId={gameId} empireId={empireId} />;
}

function MarketSkeleton() {
  return (
    <div className="lcars-panel animate-pulse" data-testid="market-loading">
      <div className="h-64 bg-gray-800 rounded"></div>
    </div>
  );
}

export default function MarketPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Market</h1>
      <Suspense fallback={<MarketSkeleton />}>
        <MarketContent />
      </Suspense>
    </div>
  );
}
