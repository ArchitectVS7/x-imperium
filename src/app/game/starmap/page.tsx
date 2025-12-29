import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Starmap } from "@/components/game/starmap";
import { getStarmapDataAction } from "@/app/actions/starmap-actions";
import { hasActiveGameAction } from "@/app/actions/game-actions";

async function StarmapContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  const data = await getStarmapDataAction();

  if (!data) {
    return (
      <div className="lcars-panel text-center py-8">
        <p className="text-gray-400">Failed to load starmap data.</p>
      </div>
    );
  }

  return (
    <div data-testid="starmap-page">
      <div className="mb-6">
        <h2 className="text-xl text-gray-300">
          Turn {data.currentTurn} of 200
        </h2>
        <p className="text-sm text-gray-500">
          {data.empires.filter((e) => !e.isEliminated).length} empires remain active
        </p>
      </div>
      <Starmap
        empires={data.empires}
        playerEmpireId={data.playerEmpireId}
        currentTurn={data.currentTurn}
        protectionTurns={data.protectionTurns}
        treaties={data.treaties}
        width={900}
        height={600}
      />
    </div>
  );
}

function StarmapSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800/50 rounded w-48 mb-6" />
      <div className="h-[600px] bg-gray-800/50 rounded-lg" />
    </div>
  );
}

export default function StarmapPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        Galactic Starmap
      </h1>
      <Suspense fallback={<StarmapSkeleton />}>
        <StarmapContent />
      </Suspense>
    </div>
  );
}
