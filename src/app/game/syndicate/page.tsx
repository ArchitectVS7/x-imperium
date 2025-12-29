import { Suspense } from "react";
import { redirect } from "next/navigation";
import { hasActiveGameAction } from "@/app/actions/game-actions";
import { BlackMarketPanel } from "@/components/game/syndicate/BlackMarketPanel";

async function SyndicateContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  return <BlackMarketPanel />;
}

function SyndicateSkeleton() {
  return (
    <div className="lcars-panel animate-pulse" data-testid="syndicate-loading">
      <div className="h-64 bg-gray-800 rounded"></div>
    </div>
  );
}

export default function SyndicatePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-purple mb-8">
        The Galactic Syndicate
      </h1>
      <Suspense fallback={<SyndicateSkeleton />}>
        <SyndicateContent />
      </Suspense>
    </div>
  );
}
