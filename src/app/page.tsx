"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getResumableGamesAction,
  resumeGameAction,
  type ResumableGame,
} from "@/app/actions/game-actions";

export default function HomePage() {
  const router = useRouter();
  const [resumableGames, setResumableGames] = useState<ResumableGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState<string | null>(null);

  useEffect(() => {
    async function loadResumableGames() {
      const games = await getResumableGamesAction();
      setResumableGames(games);
      setLoading(false);
    }
    loadResumableGames();
  }, []);

  const handleResume = async (gameId: string) => {
    setResuming(gameId);
    const result = await resumeGameAction(gameId);
    if (result.success) {
      router.push("/game/dashboard");
    } else {
      alert(result.error || "Failed to resume game");
      setResuming(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-display text-lcars-amber mb-4 tracking-wider">
          X-IMPERIUM
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-12 font-body">
          Build your galactic empire
        </p>

        <div className="flex flex-col gap-4 items-center">
          <Link
            href="/game"
            className="inline-block px-8 py-4 bg-lcars-amber text-gray-950 font-semibold text-lg rounded-lcars-pill hover:brightness-110 transition-all duration-200 hover:scale-105"
          >
            NEW GAME
          </Link>

          {/* Resume Game Section */}
          {!loading && resumableGames.length > 0 && (
            <div className="mt-4 w-full max-w-md">
              <h2 className="text-lg font-display text-lcars-blue mb-3">
                Resume Game
              </h2>
              <div className="space-y-2">
                {resumableGames.slice(0, 3).map((game) => (
                  <button
                    key={game.gameId}
                    onClick={() => handleResume(game.gameId)}
                    disabled={resuming !== null}
                    className="w-full p-3 bg-gray-800 hover:bg-gray-700 border border-lcars-orange/30 rounded text-left transition-colors disabled:opacity-50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-lcars-amber font-medium">
                          {game.empireName}
                        </span>
                        <span className="text-gray-500 text-sm ml-2">
                          Turn {game.turn}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {resuming === game.gameId ? "Loading..." : "Resume"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-16 flex gap-8 justify-center text-sm text-gray-500">
          <span>v0.6.5</span>
          <span>Milestone 6.5: Victory & Covert Ops</span>
        </div>
      </div>
    </main>
  );
}
