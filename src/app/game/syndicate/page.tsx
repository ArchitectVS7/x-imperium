import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  hasActiveGameAction,
  fetchDashboardDataAction,
} from "@/app/actions/game-actions";
import { BlackMarketPanel } from "@/components/game/syndicate/BlackMarketPanel";
import { isFeatureUnlocked, getUnlockDefinition } from "@/lib/constants/unlocks";

async function SyndicateContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  // Fetch current turn for unlock check
  const dashboardData = await fetchDashboardDataAction();
  const currentTurn = dashboardData?.turn.currentTurn ?? 1;

  // Check if black market is unlocked
  const isBlackMarketUnlocked = isFeatureUnlocked("black_market", currentTurn);
  const unlockDef = getUnlockDefinition("black_market");

  if (!isBlackMarketUnlocked) {
    const turnsRemaining = unlockDef.unlockTurn - currentTurn;
    return (
      <div className="lcars-panel text-center py-12" data-testid="syndicate-locked">
        <div className="max-w-md mx-auto">
          {/* Mysterious shadowy icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-transparent rounded-full blur-xl" />
            <svg
              className="relative w-20 h-20 text-lcars-purple/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-display text-lcars-purple mb-3">
            The Shadows Are Watching...
          </h2>
          <p className="text-gray-500 italic mb-4">
            &ldquo;You have not yet proven yourself worthy of our attention.
            Build your empire. Demonstrate your... flexibility.
            We will find you when the time is right.&rdquo;
          </p>
          <p className="text-gray-600 text-sm mb-4">
            — Unknown Contact
          </p>
          <div className="border-t border-gray-800 pt-4 mt-4">
            <div className="text-sm text-gray-500 mb-2">
              The Black Market becomes accessible at{" "}
              <span className="text-lcars-lavender font-mono">Turn {unlockDef.unlockTurn}</span>
            </div>
            <div className="text-lcars-purple">
              {turnsRemaining} turn{turnsRemaining !== 1 ? "s" : ""} until contact
            </div>
          </div>
        </div>
      </div>
    );
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
    <div className="max-w-6xl mx-auto px-4 md:px-0" data-testid="syndicate-page">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 md:mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-display text-lcars-purple">
          The Galactic Syndicate
        </h1>
        <p className="text-xs md:text-sm text-gray-400 italic max-w-md">
          A shadowy network offering contracts, components, and forbidden weapons - for those willing to deal in the dark.
        </p>
      </div>
      <Suspense fallback={<SyndicateSkeleton />}>
        <SyndicateContent />
      </Suspense>
    </div>
  );
}
