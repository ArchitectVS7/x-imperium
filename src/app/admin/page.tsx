"use client";

import { useState } from "react";
import Link from "next/link";
import {
  cleanupOldGamesAction,
  getDatabaseStatsAction,
  deleteAllGamesAction,
  pruneAllMemoriesAction,
  prunePerformanceLogsAction,
} from "@/app/actions/admin-actions";

interface Stats {
  gameCount: number;
  empireCount: number;
  activeGames: number;
  completedGames: number;
  planetCount: number;
  memoryCount: number;
  messageCount: number;
  attackCount: number;
  combatLogCount: number;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

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
      handleGetStats();
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handlePruneMemories = async () => {
    setLoading(true);
    setResult(null);
    const res = await pruneAllMemoriesAction();
    setLoading(false);
    if (res.success) {
      setResult(`Pruned ${res.deletedCount.toLocaleString()} bot memories.`);
      handleGetStats();
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handlePruneLogs = async () => {
    setLoading(true);
    setResult(null);
    const res = await prunePerformanceLogsAction();
    setLoading(false);
    if (res.success) {
      setResult(`Pruned ${res.deletedCount.toLocaleString()} performance logs.`);
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

  const totalRecords = stats
    ? stats.empireCount +
      stats.planetCount +
      stats.memoryCount +
      stats.messageCount +
      stats.attackCount +
      stats.combatLogCount
    : 0;

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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-gray-300">
                <div>
                  <span className="text-gray-500">Games:</span>
                  <span className="ml-2 font-mono text-lcars-amber">
                    {stats.gameCount}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">
                    ({stats.activeGames} active)
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Empires:</span>
                  <span className="ml-2 font-mono text-lcars-blue">
                    {stats.empireCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Planets:</span>
                  <span className="ml-2 font-mono text-lcars-mint">
                    {stats.planetCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Bot Memories:</span>
                  <span
                    className={`ml-2 font-mono ${stats.memoryCount > 10000 ? "text-red-400" : "text-lcars-orange"}`}
                  >
                    {stats.memoryCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Messages:</span>
                  <span className="ml-2 font-mono text-gray-400">
                    {stats.messageCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Combat Logs:</span>
                  <span className="ml-2 font-mono text-gray-400">
                    {stats.combatLogCount.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-700">
                <span className="text-gray-500">Total Records:</span>
                <span
                  className={`ml-2 font-mono text-lg ${totalRecords > 50000 ? "text-red-400" : "text-lcars-amber"}`}
                >
                  {totalRecords.toLocaleString()}
                </span>
                {totalRecords > 50000 && (
                  <span className="text-red-400 text-sm ml-2">
                    (High - consider cleanup)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">
              Click &quot;Load Stats&quot; to view database statistics
            </p>
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
            Cleanup Options
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">
                Delete completed, abandoned, and inactive games (&gt;7 days old)
              </p>
              <button
                onClick={handleCleanup}
                disabled={loading}
                className="px-4 py-2 bg-lcars-amber text-gray-950 rounded hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Working..." : "Cleanup Old Games"}
              </button>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">
                Delete all bot memories (keeps permanent scars)
              </p>
              <button
                onClick={handlePruneMemories}
                disabled={loading}
                className="px-4 py-2 bg-lcars-orange text-gray-950 rounded hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Working..." : "Prune Bot Memories"}
              </button>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">
                Delete performance logs older than 24 hours
              </p>
              <button
                onClick={handlePruneLogs}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Working..." : "Prune Performance Logs"}
              </button>
            </div>
          </div>
        </div>

        <div className="lcars-panel border-red-500/50">
          <h2 className="text-lg font-semibold text-red-400 mb-4">
            ⚠️ Danger Zone
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Delete ALL games using TRUNCATE CASCADE. This is instant and cannot
            be undone.
          </p>
          <button
            onClick={handleDeleteAll}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-all disabled:opacity-50"
          >
            {loading ? "Deleting..." : "TRUNCATE ALL DATA"}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 rounded bg-gray-800 border border-lcars-amber/30">
            <p
              className={
                result.startsWith("Error") ? "text-red-400" : "text-lcars-mint"
              }
            >
              {result}
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Neon Free Tier Limit: 512 MB</p>
          <p className="mt-1">
            Tip: Bot memories are often the biggest table. Each game with 25
            bots can generate thousands of memories.
          </p>
        </div>
      </div>
    </div>
  );
}
