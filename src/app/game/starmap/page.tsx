"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GalaxyView } from "@/components/game/starmap/GalaxyView";
import { SectorDetail } from "@/components/game/starmap/SectorDetail";
import { getGalaxyViewDataAction } from "@/app/actions/starmap-actions";
import { hasActiveGameAction } from "@/app/actions/game-actions";
import { usePanelContextSafe } from "@/contexts/PanelContext";
import type { GalaxyRegion } from "@/components/game/starmap/GalaxyView";
import type { GalaxyViewData } from "@/app/actions/starmap-actions";

function StarmapSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800/50 rounded w-48 mb-6" />
      <div className="h-[600px] bg-gray-800/50 rounded-lg" />
    </div>
  );
}

export default function StarmapPage() {
  const router = useRouter();
  const panelContext = usePanelContextSafe();
  const [data, setData] = useState<GalaxyViewData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<GalaxyRegion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle attack - opens combat panel with target pre-selected
  const handleAttack = useCallback((targetEmpireId: string) => {
    if (panelContext) {
      panelContext.openPanel("combat", { targetEmpireId });
    } else {
      // Fallback to page navigation if not in GameShell
      router.push(`/game/combat?target=${targetEmpireId}`);
    }
  }, [panelContext, router]);

  // Handle message - opens messages panel
  const handleMessage = useCallback((targetEmpireId: string) => {
    if (panelContext) {
      panelContext.openPanel("messages", { targetEmpireId });
    } else {
      router.push(`/game/messages?to=${targetEmpireId}`);
    }
  }, [panelContext, router]);

  // Handle view profile - could open a profile panel or navigate
  const handleViewProfile = useCallback((targetEmpireId: string) => {
    // For now, we don't have a profile panel, so just log
    console.log("View profile for:", targetEmpireId);
  }, []);

  useEffect(() => {
    async function loadData() {
      const hasGame = await hasActiveGameAction();
      if (!hasGame) {
        router.push("/game");
        return;
      }

      const galaxyData = await getGalaxyViewDataAction();
      if (!galaxyData) {
        setIsLoading(false);
        return;
      }

      setData(galaxyData);
      setIsLoading(false);
    }

    loadData();
  }, [router]);

  const handleSelectSector = (regionId: string) => {
    if (!data) return;

    const region = data.regions.find((r) => r.id === regionId);
    if (region) {
      setIsTransitioning(true);
      // Small delay to trigger the transition animation
      setTimeout(() => {
        setSelectedRegion(region);
        setIsTransitioning(false);
      }, 50);
    }
  };

  const handleBackToGalaxy = () => {
    setIsTransitioning(true);
    // Small delay to trigger the transition animation
    setTimeout(() => {
      setSelectedRegion(null);
      setIsTransitioning(false);
    }, 50);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display text-lcars-amber mb-8">
          Galactic Starmap
        </h1>
        <StarmapSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display text-lcars-amber mb-8">
          Galactic Starmap
        </h1>
        <div className="lcars-panel text-center py-8">
          <p className="text-gray-400">Failed to load starmap data.</p>
        </div>
      </div>
    );
  }

  const activeEmpires = data.regions
    .flatMap((r) => r.empires)
    .filter((e) => !e.isEliminated);

  const isPlayerRegion = selectedRegion?.id === data.playerRegionId;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        Galactic Starmap
      </h1>

      <div data-testid="starmap-page">
        <div className="mb-6">
          <h2 className="text-xl text-gray-300">
            Turn {data.currentTurn} of 200
          </h2>
          <p className="text-sm text-gray-500">
            {activeEmpires.length} empires remain active
          </p>
        </div>

        {/* View Container with Transitions */}
        <div className="relative min-h-[600px]">
          {/* Galaxy View */}
          <div
            className={`transition-all duration-500 ease-in-out ${
              selectedRegion
                ? "opacity-0 scale-95 pointer-events-none absolute inset-0"
                : "opacity-100 scale-100"
            }`}
          >
            <GalaxyView
              regions={data.regions}
              wormholes={data.wormholes}
              playerEmpireId={data.playerEmpireId}
              playerRegionId={data.playerRegionId}
              currentTurn={data.currentTurn}
              protectionTurns={data.protectionTurns}
              treaties={data.treaties}
              width={900}
              height={600}
              onSelectSector={handleSelectSector}
            />
          </div>

          {/* Sector Detail View */}
          {selectedRegion && (
            <div
              className={`transition-all duration-500 ease-in-out ${
                isTransitioning
                  ? "opacity-0 scale-105"
                  : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Back Button */}
                <button
                  onClick={handleBackToGalaxy}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-lcars-amber rounded-lg transition-colors flex items-center gap-2"
                  data-testid="back-to-galaxy"
                >
                  <span className="text-lg">←</span>
                  <span>Back to Galaxy</span>
                </button>

                {/* Sector Detail Panel */}
                <div className="flex-1">
                  <SectorDetail
                    region={selectedRegion}
                    playerEmpireId={data.playerEmpireId}
                    isPlayerRegion={isPlayerRegion}
                    currentTurn={data.currentTurn}
                    protectionTurns={data.protectionTurns}
                    onClose={handleBackToGalaxy}
                    onAttack={handleAttack}
                    onMessage={handleMessage}
                    onViewProfile={handleViewProfile}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
