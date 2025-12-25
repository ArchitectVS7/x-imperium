"use client";

/**
 * Victory Screen Component
 *
 * Displays when the player achieves victory:
 * - Victory type and message
 * - Final game statistics
 * - Play Again button
 */

interface VictoryStats {
  totalTurns: number;
  totalPlanets: number;
  winnerPlanets: number;
  winnerNetworth: number;
  empiresRemaining: number;
  empiresDefeated: number;
}

interface VictoryScreenProps {
  victoryType: "conquest" | "economic" | "survival";
  winnerName: string;
  message: string;
  stats: VictoryStats;
  onPlayAgain: () => void;
}

const VICTORY_TITLES: Record<string, string> = {
  conquest: "CONQUEST VICTORY",
  economic: "ECONOMIC DOMINANCE",
  survival: "SURVIVAL VICTORY",
};

const VICTORY_ICONS: Record<string, string> = {
  conquest: "\u2694\ufe0f", // Swords
  economic: "\ud83d\udcb0", // Money bag
  survival: "\ud83c\udfc6", // Trophy
};

export function VictoryScreen({
  victoryType,
  winnerName,
  message,
  stats,
  onPlayAgain,
}: VictoryScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-green-900/20 to-gray-900">
      <div className="max-w-2xl mx-auto text-center p-8">
        {/* Victory Icon */}
        <div className="text-8xl mb-6">{VICTORY_ICONS[victoryType]}</div>

        {/* Victory Title */}
        <h1 className="text-5xl font-display text-green-400 mb-4 animate-pulse">
          {VICTORY_TITLES[victoryType]}
        </h1>

        {/* Winner Name */}
        <h2 className="text-3xl font-display text-lcars-amber mb-6">
          {winnerName}
        </h2>

        {/* Victory Message */}
        <p className="text-xl text-gray-300 mb-8">{message}</p>

        {/* Stats Panel */}
        <div className="lcars-panel mb-8">
          <h3 className="text-xl font-display text-lcars-blue mb-4">
            Final Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
            <div>
              <span className="text-gray-500 text-sm">Turns Played</span>
              <p className="text-2xl text-gray-200">{stats.totalTurns}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Your Planets</span>
              <p className="text-2xl text-gray-200">
                {stats.winnerPlanets} / {stats.totalPlanets}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Final Networth</span>
              <p className="text-2xl text-gray-200">
                {stats.winnerNetworth.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Empires Remaining</span>
              <p className="text-2xl text-gray-200">{stats.empiresRemaining}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Empires Defeated</span>
              <p className="text-2xl text-gray-200">{stats.empiresDefeated}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Victory Type</span>
              <p className="text-2xl text-green-400 capitalize">{victoryType}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onPlayAgain}
            className="px-8 py-3 bg-lcars-orange hover:bg-lcars-orange/80 text-black font-medium rounded transition-colors text-lg"
          >
            Play Again
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
