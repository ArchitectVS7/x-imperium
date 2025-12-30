"use client";

import { useState } from "react";
import Link from "next/link";
import {
  cleanupOldGamesAction,
  getDatabaseStatsAction,
  deleteAllGamesAction,
} from "@/app/actions/admin-actions";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    gameCount: number;
    empireCount: number;
    activeGames: number;
    completedGames: number;
  } | null>(null);

  const handleGetStats = async () => {
    setLoading(true);
    setResult(null);
    const res = await getDatabaseStatsAction();
    setLoading(false);
    if (res.success && res.stats) {
      setStats(res.stats);
      setResult("Stats loaded successfully");
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    setResult(null);
    const res = await cleanupOldGamesAction();
    setLoading(false);
    if (res.success) {
      setResult(`Cleanup complete! Deleted ${res.deletedCount} old games.`);
      // Refresh stats
      handleGetStats();
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will delete ALL games and data!\n\nAre you sure you want to proceed?"
    );
    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "This action cannot be undone. Type 'DELETE' to confirm.\n\n(Click OK to proceed)"
    );
    if (!doubleConfirmed) return;

    setLoading(true);
    setResult(null);
    const res = await deleteAllGamesAction();
    setLoading(false);
    if (res.success) {
      setResult(`Deleted ${res.deletedCount} games. Database cleared.`);
      setStats(null);
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display text-lcars-amber">
            Database Admin
          </h1>
          <Link
            href="/"
            className="text-lcars-lavender hover:text-lcars-amber transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="lcars-panel mb-6">
          <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
            Database Statistics
          </h2>
          {stats ? (
            <div className="grid grid-cols-2 gap-4 text-gray-300">
              <div>
                <span className="text-gray-500">Total Games:</span>
                <span className="ml-2 font-mono text-lcars-amber">
                  {stats.gameCount}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total Empires:</span>
                <span className="ml-2 font-mono text-lcars-blue">
                  {stats.empireCount}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Active Games:</span>
                <span className="ml-2 font-mono text-lcars-mint">
                  {stats.activeGames}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Completed Games:</span>
                <span className="ml-2 font-mono text-gray-400">
                  {stats.completedGames}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Click &quot;Load Stats&quot; to view database statistics</p>
          )}
          <button
            onClick={handleGetStats}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-lcars-blue text-gray-950 rounded hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Stats"}
          </button>
        </div>

        <div className="lcars-panel mb-6">
          <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
            Cleanup Old Games
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Deletes completed, abandoned, and inactive games older than 7 days.
            This frees up database storage space.
          </p>
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="px-4 py-2 bg-lcars-amber text-gray-950 rounded hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Cleaning..." : "Cleanup Old Games"}
          </button>
        </div>

        <div className="lcars-panel border-red-500/50">
          <h2 className="text-lg font-semibold text-red-400 mb-4">
            ⚠️ Danger Zone
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Delete ALL games and associated data. This cannot be undone.
            Use this to completely reset the database.
          </p>
          <button
            onClick={handleDeleteAll}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-all disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete All Games"}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 rounded bg-gray-800 border border-lcars-amber/30">
            <p className={result.startsWith("Error") ? "text-red-400" : "text-lcars-mint"}>
              {result}
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Neon Free Tier Limit: 512 MB
          </p>
          <p className="mt-1">
            If cleanup doesn&apos;t work, you may need to upgrade your Neon plan
            or delete data directly via &quot;npm run db:studio&quot;.
          </p>
        </div>
      </div>
    </div>
  );
}
