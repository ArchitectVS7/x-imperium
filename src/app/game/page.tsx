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
  FoodWarning,
  UpcomingUnlocks,
} from "@/components/game";
import { PLANET_PRODUCTION } from "@/lib/game/constants";
import {
  fetchDashboardDataAction,
  startGameAction,
  hasActiveGameAction,
  endGameAction,
  getResumableCampaignsAction,
  resumeCampaignAction,
  type ResumableCampaign,
} from "@/app/actions/game-actions";
import { DifficultySelector } from "@/components/start-game/DifficultySelector";
import { BotCountSelector } from "@/components/start-game/BotCountSelector";
import { GameModeSelector } from "@/components/start-game/GameModeSelector";
import { ReturnModeSelector } from "@/components/start-game/ReturnModeSelector";
import { ClearDataButton } from "@/components/game/ClearDataButton";

async function DashboardContent({ errorFromUrl, showNewGame }: { errorFromUrl?: string; showNewGame?: boolean }) {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    // Check for resumable campaigns
    const campaigns = await getResumableCampaignsAction();

    // If showNewGame flag is set or no campaigns exist, show new game form
    if (showNewGame || campaigns.length === 0) {
      return <NewGamePrompt error={errorFromUrl} />;
    }

    // Show return mode selector with campaign options
    return <ReturnPrompt campaigns={campaigns} error={errorFromUrl} />;
  }

  const data = await fetchDashboardDataAction();

  if (!data) {
    return <NewGamePrompt error="Failed to load game data. Start a new game?" />;
  }

  // Calculate food production from planets
  const foodProduction = data.planets
    .filter((p) => p.type === "food")
    .reduce((sum, p) => sum + (Number(p.productionRate) || PLANET_PRODUCTION.food), 0);

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

      {/* Food Warning */}
      <FoodWarning
        food={data.resources.food}
        population={data.stats.population}
        foodProduction={foodProduction}
      />

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
        <ResearchPanel
          researchLevel={data.empire.fundamentalResearchLevel}
          researchPoints={data.resources.researchPoints}
        />
        <NetworthPanel networth={data.stats.networth} />
        <UpcomingUnlocks currentTurn={data.turn.currentTurn} limit={3} />
      </div>

      {/* End Turn Section */}
      <div className="mt-8 text-center space-y-4">
        <EndTurnButton />
        <div>
          <form action={endGameAction}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-red-400 transition-colors"
            >
              End Game &amp; Start New
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ResearchPanel({
  researchLevel,
  researchPoints,
}: {
  researchLevel: number;
  researchPoints: number;
}) {
  return (
    <div className="lcars-panel" data-testid="research-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Research
      </h2>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between">
          <span>Fundamental Level:</span>
          <span className="font-mono text-lcars-amber">{researchLevel}</span>
        </div>
        <div className="flex justify-between">
          <span>Research Points:</span>
          <span className="font-mono text-lcars-blue">
            {researchPoints.toLocaleString()}
          </span>
        </div>
        {researchLevel < 2 && (
          <div className="text-xs text-gray-500 mt-2">
            Level 2 unlocks Light Cruisers
          </div>
        )}
      </div>
    </div>
  );
}

function ReturnPrompt({
  campaigns,
  error,
}: {
  campaigns: ResumableCampaign[];
  error?: string;
}) {
  async function handleResumeCampaign(gameId: string) {
    "use server";
    const result = await resumeCampaignAction(gameId);
    if (result.success) {
      redirect("/game/starmap");
    }
    const errorMessage = encodeURIComponent(result.error || "Failed to resume campaign");
    redirect(`/game?error=${errorMessage}`);
  }

  async function handleStartNewGame() {
    "use server";
    redirect("/game?newGame=true");
  }

  return (
    <div className="lcars-panel max-w-lg mx-auto" data-testid="return-mode-prompt">
      <h2 className="text-xl font-display text-lcars-amber mb-4 text-center">
        Welcome Back, Commander
      </h2>
      {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
      <ReturnModeSelector
        campaigns={campaigns}
        resumeAction={handleResumeCampaign}
        newGameAction={handleStartNewGame}
      />
    </div>
  );
}

function NewGamePrompt({ error }: { error?: string }) {
  async function handleStartGame(formData: FormData) {
    "use server";
    const result = await startGameAction(formData);
    if (result.success) {
      // Redirect to starmap as default view for new games
      redirect("/game/starmap");
    }
    // If failed, redirect with error in query param
    const errorMessage = encodeURIComponent(result.error || "Failed to start game");
    redirect(`/game?error=${errorMessage}`);
  }

  return (
    <div className="lcars-panel max-w-lg mx-auto text-center" data-testid="new-game-prompt">
      <h2 className="text-xl font-display text-lcars-amber mb-4">
        Welcome, Commander
      </h2>
      {error && (
        <div className="p-3 mb-4 bg-red-900/30 border border-red-500/50 rounded">
          <p className="text-red-400">{error}</p>
          <p className="text-red-300 text-sm mt-2">
            Fill in the form below to start a new game.
          </p>
          {error.includes("Failed to load") && (
            <div className="mt-3 pt-3 border-t border-red-500/30">
              <p className="text-red-200 text-xs mb-2">
                If you&apos;re stuck with corrupted data:
              </p>
              <ClearDataButton />
            </div>
          )}
        </div>
      )}
      <p className="text-gray-300 mb-6">
        Begin your galactic conquest. Name your empire and configure your galaxy.
      </p>
      <form action={handleStartGame} className="space-y-4">
        <div>
          <label htmlFor="empireName" className="block text-sm font-medium text-gray-400 mb-2 text-left">
            Empire Name <span className="text-red-400">*</span>
          </label>
          <input
            id="empireName"
            type="text"
            name="empireName"
            placeholder="e.g., Terran Federation"
            className="w-full px-4 py-2 bg-gray-800 border border-lcars-amber/30 rounded text-white placeholder-gray-500 focus:border-lcars-amber focus:outline-none"
            required
            minLength={2}
            maxLength={100}
            autoFocus
            data-testid="empire-name-input"
          />
        </div>
        <GameModeSelector defaultValue="oneshot" />
        <BotCountSelector defaultValue={25} />
        <DifficultySelector defaultValue="normal" />
        <button
          type="submit"
          className="lcars-button w-full text-lg py-3"
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; newGame?: string }>;
}) {
  const params = await searchParams;
  const errorFromUrl = params.error ? decodeURIComponent(params.error) : undefined;
  const showNewGame = params.newGame === "true";

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        Empire Dashboard
      </h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent errorFromUrl={errorFromUrl} showNewGame={showNewGame} />
      </Suspense>
    </div>
  );
}
