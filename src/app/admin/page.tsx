"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, AlertTriangle, Radiation, Key } from "lucide-react";
import {
  cleanupOldGamesAction,
  getDatabaseStatsAction,
  deleteAllGamesAction,
  truncateAllTablesAction,
  pruneAllMemoriesAction,
  prunePerformanceLogsAction,
  checkDatabaseTablesAction,
} from "@/app/actions/admin-actions";

interface Stats {
  gameCount: number;
  empireCount: number;
  activeGames: number;
  completedGames: number;
  sectorCount: number;
  memoryCount: number;
  messageCount: number;
  attackCount: number;
  combatLogCount: number;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tables, setTables] = useState<string[] | null>(null);
  const [adminSecret, setAdminSecret] = useState("");

  const handleCheckTables = async () => {
    if (!adminSecret) {
      setResult("Error: Please enter the admin secret first");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await checkDatabaseTablesAction(adminSecret);
    setLoading(false);
    if (res.success && res.tables) {
      setTables(res.tables);
      setResult(`Found ${res.tables.length} tables in database`);
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handleGetStats = async () => {
    if (!adminSecret) {
      setResult("Error: Please enter the admin secret first");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await getDatabaseStatsAction(adminSecret);
    setLoading(false);
    if (res.success && res.stats) {
      setStats(res.stats);
      setResult("Stats loaded successfully");
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handleCleanup = async () => {
    if (!adminSecret) {
      setResult("Error: Please enter the admin secret first");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await cleanupOldGamesAction(adminSecret);
    setLoading(false);
    if (res.success) {
      setResult(`Cleanup complete! Deleted ${res.deletedCount} old games.`);
      handleGetStats();
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handlePruneMemories = async () => {
    if (!adminSecret) {
      setResult("Error: Please enter the admin secret first");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await pruneAllMemoriesAction(adminSecret);
    setLoading(false);
    if (res.success) {
      setResult(`Pruned ${res.deletedCount.toLocaleString()} bot memories.`);
      handleGetStats();
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handlePruneLogs = async () => {
    if (!adminSecret) {
      setResult("Error: Please enter the admin secret first");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await prunePerformanceLogsAction(adminSecret);
    setLoading(false);
    if (res.success) {
      setResult(`Pruned ${res.deletedCount.toLocaleString()} performance logs.`);
      handleGetStats();
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handleDeleteAll = async () => {
    if (!adminSecret) {
      setResult("Error: Please enter the admin secret first");
      return;
    }
    const confirmed = window.confirm(
      "WARNING: This will delete ALL games and data!\n\nAre you sure you want to proceed?"
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);
    const res = await deleteAllGamesAction(adminSecret);
    setLoading(false);
    if (res.success) {
      setResult(`Deleted ${res.deletedCount} games. Database cleared.`);
      setStats(null);
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const handleTruncateAll = async () => {
    if (!adminSecret) {
      setResult("Error: Please enter the admin secret first");
      return;
    }
    const confirmed = window.confirm(
      "!!! NUCLEAR OPTION !!!\n\nThis will TRUNCATE ALL TABLES individually!\nUse this only if CASCADE delete isn't working.\n\nAre you ABSOLUTELY sure?"
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "Last chance! This will erase EVERYTHING.\n\nType YES in the next prompt to continue."
    );
    if (!doubleConfirm) return;

    setLoading(true);
    setResult(null);
    const res = await truncateAllTablesAction(adminSecret);
    setLoading(false);
    if (res.success) {
      setResult(`Truncated ${res.tablesCleared.length} tables: ${res.tablesCleared.join(", ")}`);
      setStats(null);
    } else {
      setResult(`Error: ${res.error}`);
    }
  };

  const totalRecords = stats
    ? stats.empireCount +
      stats.sectorCount +
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
            Back to Home
          </Link>
        </div>

        <div className="lcars-panel mb-6">
          <h2 className="text-lg font-semibold text-lcars-orange mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" /> Authentication
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Enter the ADMIN_SECRET to authenticate. This is required for all admin actions.
          </p>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Enter ADMIN_SECRET"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-lcars-amber"
          />
        </div>

        <div className="lcars-panel mb-6">
          <h2 className="text-lg font-semibold text-lcars-orange mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" /> Diagnostics
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            First, check if your database tables exist. If they don&apos;t, you need to run migrations.
          </p>
          <button
            onClick={handleCheckTables}
            disabled={loading}
            className="mb-4 px-4 py-2 bg-lcars-orange text-gray-950 rounded hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check Database Tables"}
          </button>
          {tables && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded">
              <p className="text-lcars-mint font-semibold mb-2">
                Tables found: {tables.length}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 max-h-40 overflow-y-auto">
                {tables.map((table) => (
                  <div key={table} className="font-mono">
                    {table}
                  </div>
                ))}
              </div>
              {tables.length === 0 && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
                  <p className="text-red-400 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> No tables found!
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Run migrations: <code className="bg-gray-900 px-2 py-1 rounded">npm run db:push</code>
                  </p>
                </div>
              )}
            </div>
          )}
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
                  <span className="text-gray-500">Sectors:</span>
                  <span className="ml-2 font-mono text-lcars-mint">
                    {stats.sectorCount.toLocaleString()}
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
          <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">
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
            <div className="pt-4 border-t border-red-500/30">
              <p className="text-red-300 text-sm mb-2 font-semibold flex items-center gap-2">
                <Radiation className="w-4 h-4" /> NUCLEAR OPTION <Radiation className="w-4 h-4" />
              </p>
              <p className="text-gray-400 text-sm mb-2">
                Truncate ALL tables individually. Use this ONLY if CASCADE isn&apos;t working.
                This will clear: games, empires, sectors, research_progress, market_prices,
                and 18 other tables.
              </p>
              <button
                onClick={handleTruncateAll}
                disabled={loading}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500 transition-all disabled:opacity-50 border-2 border-orange-400 flex items-center gap-2"
              >
                <Radiation className="w-4 h-4" />
                {loading ? "Nuking..." : "TRUNCATE ALL TABLES"}
                <Radiation className="w-4 h-4" />
              </button>
            </div>
          </div>
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
