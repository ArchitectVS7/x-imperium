"use client";

/**
 * Game Result Page
 *
 * Displays victory or defeat screen based on game outcome.
 * Shows final statistics and options to play again or return home.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VictoryScreen, DefeatScreen } from "@/components/game/victory";
import {
  getGameResultAction,
  endGameAction,
} from "@/app/actions/game-actions";
import { fetchDashboardDataAction } from "@/app/actions/game-actions";

interface GameResult {
  status: string;
  winnerId: string | null;
  winnerName: string | null;
  victoryType: string | null;
  turn: number;
  playerEmpireName: string;
  playerDefeated: boolean;
  defeatType: string | null;
}

interface VictoryStats {
  totalTurns: number;
  totalPlanets: number;
  winnerPlanets: number;
  winnerNetworth: number;
  empiresRemaining: number;
  empiresDefeated: number;
}

export default function GameResultPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GameResult | null>(null);
  const [stats, setStats] = useState<VictoryStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResult() {
      const resultData = await getGameResultAction();

      if (!resultData.success || !resultData.result) {
        setError(resultData.error || "Failed to load game result");
        setLoading(false);
        return;
      }

      setResult(resultData.result);

      // Get dashboard data for stats
      const dashboardData = await fetchDashboardDataAction();
      if (dashboardData) {
        setStats({
          totalTurns: resultData.result.turn,
          totalPlanets: dashboardData.stats.planetCount * 26, // Estimate total planets
          winnerPlanets: dashboardData.stats.planetCount,
          winnerNetworth: dashboardData.stats.networth,
          empiresRemaining: 26, // Will be updated when we have game-wide stats
          empiresDefeated: 0,
        });
      }

      setLoading(false);
    }

    loadResult();
  }, []);

  const handlePlayAgain = async () => {
    // Clear the current game and go to home to start a new one
    await endGameAction();
  };

  const handleTryAgain = async () => {
    // Same as play again for now
    await endGameAction();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">Loading...</div>
          <p className="text-gray-400">Calculating final results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-3xl text-red-500 mb-4">Error</h1>
          <p className="text-gray-400 mb-8">{error || "Failed to load game result"}</p>
          <a
            href="/"
            className="px-6 py-3 bg-lcars-orange hover:bg-lcars-orange/80 text-black rounded"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  // Check if game is still in progress
  if (result.status === "in_progress") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-3xl text-lcars-amber mb-4">Game In Progress</h1>
          <p className="text-gray-400 mb-8">
            The game is still ongoing. Return to continue playing.
          </p>
          <button
            onClick={() => router.push("/game/dashboard")}
            className="px-6 py-3 bg-lcars-orange hover:bg-lcars-orange/80 text-black rounded"
          >
            Continue Playing
          </button>
        </div>
      </div>
    );
  }

  // Player won
  if (result.winnerId && !result.playerDefeated && result.winnerName === result.playerEmpireName) {
    const victoryType = (result.victoryType as "conquest" | "economic" | "survival") || "conquest";
    const message = getVictoryMessage(victoryType, result.playerEmpireName);

    return (
      <VictoryScreen
        victoryType={victoryType}
        winnerName={result.playerEmpireName}
        message={message}
        stats={stats || getDefaultStats(result.turn)}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // Player was defeated
  if (result.playerDefeated) {
    const defeatType = (result.defeatType as "bankruptcy" | "elimination" | "civil_collapse") || "elimination";
    const message = getDefeatMessage(defeatType, result.playerEmpireName);

    return (
      <DefeatScreen
        defeatType={defeatType}
        empireName={result.playerEmpireName}
        message={message}
        turn={result.turn}
        onTryAgain={handleTryAgain}
      />
    );
  }

  // Another empire won (player lost but wasn't explicitly defeated)
  if (result.winnerId && result.winnerName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-blue-900/20 to-gray-900">
        <div className="max-w-2xl mx-auto text-center p-8">
          <div className="text-8xl mb-6">Game Over</div>

          <h1 className="text-5xl font-display text-blue-400 mb-4">
            {result.winnerName} Wins!
          </h1>

          <p className="text-xl text-gray-300 mb-4">
            {result.winnerName} has achieved{" "}
            {result.victoryType === "conquest"
              ? "conquest"
              : result.victoryType === "economic"
              ? "economic dominance"
              : "survival"}{" "}
            victory!
          </p>

          <p className="text-gray-400 mb-8">
            Your empire, {result.playerEmpireName}, was not victorious this time.
          </p>

          <div className="lcars-panel mb-8">
            <div className="text-center">
              <span className="text-gray-500 text-sm">Game Ended On</span>
              <p className="text-3xl text-gray-200">Turn {result.turn}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleTryAgain}
              className="px-8 py-3 bg-lcars-orange hover:bg-lcars-orange/80 text-black font-medium rounded transition-colors text-lg"
            >
              Try Again
            </button>
            <a
              href="/"
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors text-lg"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fallback - shouldn't happen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl text-lcars-amber mb-4">Game Over</h1>
        <p className="text-gray-400 mb-8">The game has ended.</p>
        <a
          href="/"
          className="px-6 py-3 bg-lcars-orange hover:bg-lcars-orange/80 text-black rounded"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

function getVictoryMessage(victoryType: string, empireName: string): string {
  switch (victoryType) {
    case "conquest":
      return `${empireName} has conquered 60% of the galaxy through military might!`;
    case "economic":
      return `${empireName} has achieved total economic dominance with 1.5x the networth of the second place empire!`;
    case "survival":
      return `${empireName} has survived 200 turns and emerged as the most powerful empire in the galaxy!`;
    default:
      return `${empireName} has achieved victory!`;
  }
}

function getDefeatMessage(defeatType: string, empireName: string): string {
  switch (defeatType) {
    case "bankruptcy":
      return `${empireName} has gone bankrupt and collapsed.`;
    case "elimination":
      return `${empireName} has lost all its planets and been eliminated.`;
    case "civil_collapse":
      return `${empireName} has fallen into civil war after prolonged unrest.`;
    default:
      return `${empireName} has been defeated.`;
  }
}

function getDefaultStats(turn: number): VictoryStats {
  return {
    totalTurns: turn,
    totalPlanets: 0,
    winnerPlanets: 0,
    winnerNetworth: 0,
    empiresRemaining: 0,
    empiresDefeated: 0,
  };
}
