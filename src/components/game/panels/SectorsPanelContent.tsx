"use client";

/**
 * Sectors Panel Content
 *
 * Panel version of the sectors page for starmap-centric UI.
 * Shows holdings summary and colonize options in a compact layout.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchDashboardDataAction } from "@/app/actions/game-actions";
import { ColonizeSectorPanel } from "@/components/game/sectors/ColonizeSectorPanel";
import { getSectorTypeLabel } from "@/lib/game/constants";
import { SectorIcons } from "@/lib/theme/icons";
import type { Planet } from "@/lib/db/schema";

interface SectorsPanelContentProps {
  onClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SectorsPanelContent({ onClose }: SectorsPanelContentProps) {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"holdings" | "colonize">("holdings");

  const loadData = useCallback(async () => {
    const data = await fetchDashboardDataAction();
    if (data) {
      setPlanets(data.planets);
      setCredits(data.resources.credits);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Group planets by type
  const planetsByType = planets.reduce<Record<string, Planet[]>>(
    (acc, planet) => {
      const existing = acc[planet.type];
      if (existing) {
        existing.push(planet);
      } else {
        acc[planet.type] = [planet];
      }
      return acc;
    },
    {}
  );

  // Sort types by count (descending)
  const sortedTypes = Object.entries(planetsByType).sort(
    (a, b) => b[1].length - a[1].length
  );

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setActiveTab("holdings")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "holdings"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Holdings ({planets.length})
        </button>
        <button
          onClick={() => setActiveTab("colonize")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "colonize"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Colonize
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "holdings" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-lcars-lavender">Empire Holdings</h3>
          <div className="grid grid-cols-2 gap-2">
            {sortedTypes.map(([type, sectors]) => {
              const label = getSectorTypeLabel(type as Parameters<typeof getSectorTypeLabel>[0]);
              const IconComponent = SectorIcons[type as keyof typeof SectorIcons];
              return (
                <div
                  key={type}
                  className="bg-gray-800/50 rounded p-2 text-center"
                >
                  <div className="text-lg mb-1 flex justify-center">
                    {IconComponent ? <IconComponent className="w-5 h-5" /> : <span>?</span>}
                  </div>
                  <div className="text-lcars-amber font-mono text-lg">
                    {sectors.length}
                  </div>
                  <div className="text-gray-400 text-xs">{label}</div>
                </div>
              );
            })}
          </div>
          {planets.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-4">
              No sectors owned. Colonize to expand your empire.
            </div>
          )}
        </div>
      )}

      {activeTab === "colonize" && (
        <ColonizeSectorPanel credits={credits} />
      )}
    </div>
  );
}

export default SectorsPanelContent;
