"use client";

/**
 * Military Panel Content
 *
 * Panel version of the military page for starmap-centric UI.
 * Shows current forces, build options, and queue in a compact layout.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchDashboardDataAction } from "@/app/actions/game-actions";
import { BuildUnitsPanel } from "@/components/game/military/BuildUnitsPanel";
import { BuildQueuePanel } from "@/components/game/military/BuildQueuePanel";
import type { DashboardData } from "@/lib/game/repositories/game-repository";

interface MilitaryPanelContentProps {
  onClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MilitaryPanelContent({ onClose }: MilitaryPanelContentProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"forces" | "build" | "queue">("forces");

  const loadData = useCallback(async () => {
    const dashboardData = await fetchDashboardDataAction();
    setData(dashboardData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-gray-400">
        No active game session. Please start a new game.
      </div>
    );
  }

  const { empire, military, turn } = data;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setActiveTab("forces")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "forces"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Forces
        </button>
        <button
          onClick={() => setActiveTab("build")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "build"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Build
        </button>
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "queue"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Queue
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "forces" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-lcars-lavender">Current Forces</h3>
          <div className="grid grid-cols-2 gap-2">
            <ForceItem label="Soldiers" count={military.soldiers} color="text-green-400" />
            <ForceItem label="Fighters" count={military.fighters} color="text-blue-400" />
            <ForceItem label="Stations" count={military.stations} color="text-purple-400" />
            <ForceItem label="Light Cruisers" count={military.lightCruisers} color="text-cyan-400" />
            <ForceItem label="Heavy Cruisers" count={military.heavyCruisers} color="text-orange-400" />
            <ForceItem label="Carriers" count={military.carriers} color="text-red-400" />
            <ForceItem label="Covert Agents" count={military.covertAgents} color="text-gray-400" />
          </div>
        </div>
      )}

      {activeTab === "build" && (
        <BuildUnitsPanel
          credits={empire.credits}
          population={empire.population}
          researchLevel={empire.fundamentalResearchLevel}
          currentTurn={turn.currentTurn}
          onBuildQueued={handleRefresh}
        />
      )}

      {activeTab === "queue" && (
        <BuildQueuePanel onQueueChange={handleRefresh} />
      )}
    </div>
  );
}

function ForceItem({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-black/30 p-2 rounded text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-mono text-lg ${color}`}>
        {count.toLocaleString()}
      </div>
    </div>
  );
}

export default MilitaryPanelContent;
