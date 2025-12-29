import { Suspense } from "react";
import { redirect } from "next/navigation";
import { hasActiveGameAction } from "@/app/actions/game-actions";
import { CraftingPanel } from "@/components/game/crafting/CraftingPanel";

async function CraftingContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  return <CraftingPanel />;
}

function CraftingSkeleton() {
  return (
    <div className="lcars-panel animate-pulse" data-testid="crafting-loading">
      <div className="h-64 bg-gray-800 rounded"></div>
    </div>
  );
}

export default function CraftingPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        Manufacturing
      </h1>
      <Suspense fallback={<CraftingSkeleton />}>
        <CraftingContent />
      </Suspense>
    </div>
  );
}
