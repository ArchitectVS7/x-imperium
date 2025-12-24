import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  ResourcePanel,
  NetworthPanel,
  PopulationPanel,
  MilitaryPanel,
  PlanetList,
  TurnCounter,
  CivilStatusDisplay,
  EndTurnButton,
} from "@/components/game";
import {
  fetchDashboardDataAction,
  startGameAction,
  hasActiveGameAction,
} from "@/app/actions/game-actions";

async function DashboardContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    return <NewGamePrompt />;
  }

  const data = await fetchDashboardDataAction();

  if (!data) {
    return <NewGamePrompt error="Failed to load game data. Start a new game?" />;
  }

  return (
    <div data-testid="dashboard">
      {/* Turn and Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <TurnCounter
          currentTurn={data.turn.currentTurn}
          turnLimit={data.turn.turnLimit}
        />
        <CivilStatusDisplay status={data.stats.civilStatus} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ResourcePanel
          credits={data.resources.credits}
          food={data.resources.food}
          ore={data.resources.ore}
          petroleum={data.resources.petroleum}
          researchPoints={data.resources.researchPoints}
        />
        <PopulationPanel
          population={data.stats.population}
          civilStatus={data.stats.civilStatus}
        />
        <MilitaryPanel
          soldiers={data.military.soldiers}
          fighters={data.military.fighters}
          stations={data.military.stations}
          lightCruisers={data.military.lightCruisers}
          heavyCruisers={data.military.heavyCruisers}
          carriers={data.military.carriers}
          covertAgents={data.military.covertAgents}
        />
        <PlanetList planets={data.planets} />
        <ResearchPanel researchPoints={data.resources.researchPoints} />
        <NetworthPanel networth={data.stats.networth} />
      </div>

      {/* End Turn Section */}
      <div className="mt-8 text-center">
        <EndTurnButton />
      </div>
    </div>
  );
}

function ResearchPanel({ researchPoints }: { researchPoints: number }) {
  return (
    <div className="lcars-panel" data-testid="research-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Research
      </h2>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between">
          <span>Fundamental Level:</span>
          <span className="font-mono text-lcars-amber">0</span>
        </div>
        <div className="flex justify-between">
          <span>Points/Turn:</span>
          <span className="font-mono text-lcars-blue">
            {researchPoints.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function NewGamePrompt({ error }: { error?: string }) {
  async function handleStartGame(formData: FormData) {
    "use server";
    const result = await startGameAction(formData);
    if (result.success) {
      redirect("/game");
    }
  }

  return (
    <div className="lcars-panel max-w-md mx-auto text-center" data-testid="new-game-prompt">
      <h2 className="text-xl font-display text-lcars-amber mb-4">
        Welcome, Commander
      </h2>
      {error && (
        <p className="text-red-400 mb-4">{error}</p>
      )}
      <p className="text-gray-300 mb-6">
        Begin your galactic conquest. Name your empire and prepare for domination.
      </p>
      <form action={handleStartGame}>
        <input
          type="text"
          name="empireName"
          placeholder="Empire Name"
          className="w-full px-4 py-2 mb-4 bg-gray-800 border border-lcars-amber/30 rounded text-white placeholder-gray-500 focus:border-lcars-amber focus:outline-none"
          required
          maxLength={100}
          data-testid="empire-name-input"
        />
        <button
          type="submit"
          className="lcars-button w-full"
          data-testid="start-game-button"
        >
          BEGIN CONQUEST
        </button>
      </form>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="lcars-panel h-40 bg-gray-800/50" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        Empire Dashboard
      </h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
