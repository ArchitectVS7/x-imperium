"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchDashboardDataAction } from "@/app/actions/game-actions";
import { BuildUnitsPanel } from "@/components/game/military/BuildUnitsPanel";
import { BuildQueuePanel } from "@/components/game/military/BuildQueuePanel";
import { MaintenanceSummary } from "@/components/game/military/MaintenanceSummary";
import { UnitUpgradePanel } from "@/components/game/military/UnitUpgradePanel";
import type { DashboardData } from "@/lib/game/repositories/game-repository";

export default function MilitaryPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadData = useCallback(async () => {
    const dashboardData = await fetchDashboardDataAction();
    setData(dashboardData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display text-lcars-amber mb-8">Military</h1>
        <div className="lcars-panel">
          <p className="text-gray-400">Loading military data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display text-lcars-amber mb-8">Military</h1>
        <div className="lcars-panel">
          <p className="text-gray-400">No active game session. Please start a new game.</p>
        </div>
      </div>
    );
  }

  const { empire, military, turn } = data;

  return (
    <div className="max-w-6xl mx-auto" data-testid="military-page">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Military</h1>

      {/* Current Forces Summary */}
      <div className="lcars-panel mb-6">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Current Forces
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-black/30 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Soldiers</div>
            <div className="font-mono text-green-400 text-lg">
              {military.soldiers.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Fighters</div>
            <div className="font-mono text-blue-400 text-lg">
              {military.fighters.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Stations</div>
            <div className="font-mono text-purple-400 text-lg">
              {military.stations.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Light Cruisers</div>
            <div className="font-mono text-cyan-400 text-lg">
              {military.lightCruisers.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Heavy Cruisers</div>
            <div className="font-mono text-orange-400 text-lg">
              {military.heavyCruisers.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Carriers</div>
            <div className="font-mono text-red-400 text-lg">
              {military.carriers.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Covert Agents</div>
            <div className="font-mono text-gray-400 text-lg">
              {military.covertAgents.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Build Units */}
          <BuildUnitsPanel
            credits={empire.credits}
            population={empire.population}
            researchLevel={empire.fundamentalResearchLevel}
            currentTurn={turn.currentTurn}
            onBuildQueued={handleRefresh}
          />

          {/* Maintenance Summary */}
          <MaintenanceSummary />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Build Queue */}
          <BuildQueuePanel onQueueChange={handleRefresh} />

          {/* Unit Upgrades */}
          <UnitUpgradePanel onUpgrade={handleRefresh} />
        </div>
      </div>
    </div>
  );
}
