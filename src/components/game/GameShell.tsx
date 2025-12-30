"use client";

/**
 * GameShell - The main game interface wrapper
 *
 * Provides the galaxy-centric layout with:
 * - Main content area (left/center)
 * - Turn Order Panel sidebar (right) - desktop only
 * - Empire Status Bar (bottom) - desktop only
 * - Mobile Bottom Bar + Action Sheet - mobile only
 * - Turn Summary Modal (after END TURN)
 * - Slide-out panels for quick access
 *
 * This component handles the turn processing flow and provides
 * context to child components.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TurnOrderPanel } from "./TurnOrderPanel";
import { TurnSummaryModal } from "./TurnSummaryModal";
import { EmpireStatusBar, type PanelType } from "./EmpireStatusBar";
import { SlideOutPanel } from "./SlideOutPanel";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileActionSheet } from "./MobileActionSheet";
import { OnboardingManager } from "./onboarding";
import {
  getGameLayoutDataAction,
  endTurnEnhancedAction,
  type GameLayoutData,
} from "@/app/actions/turn-actions";
import type { TurnEvent, ResourceDelta } from "@/lib/game/types/turn-types";
import type { CivilStatusKey } from "@/lib/theme/names";
import { ResourcePanel } from "./ResourcePanel";

interface GameShellProps {
  children: React.ReactNode;
  initialLayoutData?: GameLayoutData | null;
}

export function GameShell({ children, initialLayoutData }: GameShellProps) {
  const router = useRouter();

  // Layout data state
  const [layoutData, setLayoutData] = useState<GameLayoutData | null>(
    initialLayoutData ?? null
  );

  // Turn processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [turnResult, setTurnResult] = useState<{
    turn: number;
    processingMs: number;
    resourceChanges: ResourceDelta;
    populationBefore: number;
    populationAfter: number;
    events: TurnEvent[];
    messagesReceived: number;
    botBattles: number;
    empiresEliminated: string[];
    victoryResult?: { type: string; message: string };
  } | null>(null);

  // Slide-out panel state (desktop)
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  // Mobile action sheet state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Refresh layout data
  const refreshLayoutData = useCallback(async () => {
    const data = await getGameLayoutDataAction();
    if (data) {
      setLayoutData(data);
    }
  }, []);

  // Refresh on mount and periodically
  useEffect(() => {
    if (!initialLayoutData) {
      refreshLayoutData();
    }

    // Refresh every 30 seconds to catch external changes
    const interval = setInterval(refreshLayoutData, 30000);
    return () => clearInterval(interval);
  }, [initialLayoutData, refreshLayoutData]);

  // Track if we've shown the initial welcome modal (using ref to persist across re-renders)
  const hasShownWelcomeModal = useRef(false);

  // Show initial turn summary on turn 1 (game start)
  useEffect(() => {
    // Only show welcome modal once per component mount, for turn 1
    if (layoutData && layoutData.currentTurn === 1 && !hasShownWelcomeModal.current) {
      hasShownWelcomeModal.current = true;

      // Show immediately - no delay needed
      setTurnResult({
        turn: 1,
        processingMs: 0,
        resourceChanges: {
          credits: layoutData.credits,
          food: layoutData.food,
          ore: layoutData.ore,
          petroleum: layoutData.petroleum,
          researchPoints: layoutData.researchPoints,
        },
        populationBefore: 0,
        populationAfter: layoutData.population,
        events: [
          {
            type: "other" as const,
            severity: "info" as const,
            message: "Welcome to Nexus Dominion! Your empire begins with starting resources and population.",
          },
          {
            type: "other" as const,
            severity: "info" as const,
            message: `You have ${layoutData.protectionTurnsLeft} turns of protection from attacks.`,
          },
        ],
        messagesReceived: 0,
        botBattles: 0,
        empiresEliminated: [],
      });
      setShowModal(true);
    }
  }, [layoutData]);

  // Handle end turn
  const handleEndTurn = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    // Close mobile sheet if open
    setMobileSheetOpen(false);

    try {
      const result = await endTurnEnhancedAction();

      if (result.success) {
        setTurnResult({
          turn: result.turn,
          processingMs: result.processingMs,
          resourceChanges: result.resourceChanges,
          populationBefore: result.populationBefore,
          populationAfter: result.populationAfter,
          events: result.events,
          messagesReceived: result.messagesReceived,
          botBattles: result.botBattles,
          empiresEliminated: result.empiresEliminated,
          victoryResult: result.victoryResult,
        });
        setShowModal(true);

        // Refresh layout data after turn
        await refreshLayoutData();
      } else {
        // TODO: Show error toast
        console.error("Turn failed:", result.error);
      }
    } catch (error) {
      console.error("End turn error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshLayoutData]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setTurnResult(null);
    // Refresh the page to show updated data
    router.refresh();
  }, [router]);

  // Handle panel toggle
  const handlePanelToggle = useCallback((panel: PanelType) => {
    setActivePanel(panel);
  }, []);

  // Default layout data if not loaded
  const data = layoutData ?? {
    currentTurn: 1,
    turnLimit: 200,
    foodStatus: "stable" as const,
    armyStrength: "moderate" as const,
    threatCount: 0,
    unreadMessages: 0,
    protectionTurnsLeft: 20,
    credits: 0,
    food: 0,
    ore: 0,
    petroleum: 0,
    researchPoints: 0,
    population: 0,
    sectorCount: 0,
    militaryPower: 0,
    networth: 0,
    rank: 1,
    civilStatus: "content",
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Onboarding Hints (first 5 turns) */}
      <OnboardingManager currentTurn={data.currentTurn} />

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area - add bottom padding on mobile for the bottom bar */}
        <div className="flex-1 overflow-y-auto pb-28 lg:pb-0">
          {children}
        </div>

        {/* Turn Order Panel Sidebar - Desktop only (hidden on mobile via component) */}
        <TurnOrderPanel
          currentTurn={data.currentTurn}
          turnLimit={data.turnLimit}
          foodStatus={data.foodStatus}
          armyStrength={data.armyStrength}
          threatCount={data.threatCount}
          unreadMessages={data.unreadMessages}
          protectionTurnsLeft={data.protectionTurnsLeft}
          onEndTurn={handleEndTurn}
          isProcessing={isProcessing}
        />
      </div>

      {/* Empire Status Bar (bottom) - Desktop only (hidden on mobile via component) */}
      <EmpireStatusBar
        credits={data.credits}
        food={data.food}
        ore={data.ore}
        petroleum={data.petroleum}
        researchPoints={data.researchPoints}
        population={data.population}
        sectorCount={data.sectorCount}
        militaryPower={data.militaryPower}
        networth={data.networth}
        rank={data.rank}
        civilStatus={data.civilStatus as CivilStatusKey}
        activePanel={activePanel}
        onPanelToggle={handlePanelToggle}
      />

      {/* Mobile Bottom Bar - Mobile only */}
      <MobileBottomBar
        currentTurn={data.currentTurn}
        turnLimit={data.turnLimit}
        credits={data.credits}
        foodStatus={data.foodStatus}
        armyStrength={data.armyStrength}
        unreadMessages={data.unreadMessages}
        onEndTurn={handleEndTurn}
        onOpenActions={() => setMobileSheetOpen(true)}
        isProcessing={isProcessing}
      />

      {/* Mobile Action Sheet - Mobile only */}
      <MobileActionSheet
        isOpen={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        currentTurn={data.currentTurn}
        turnLimit={data.turnLimit}
        foodStatus={data.foodStatus}
        armyStrength={data.armyStrength}
        threatCount={data.threatCount}
        unreadMessages={data.unreadMessages}
        protectionTurnsLeft={data.protectionTurnsLeft}
      />

      {/* Slide-out Panels - Desktop only */}
      <SlideOutPanel
        isOpen={activePanel === "resources"}
        onClose={() => setActivePanel(null)}
        title="Resources"
      >
        <ResourcePanel
          credits={data.credits}
          food={data.food}
          ore={data.ore}
          petroleum={data.petroleum}
          researchPoints={data.researchPoints}
        />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "military"}
        onClose={() => setActivePanel(null)}
        title="Military Forces"
      >
        <div className="text-gray-300">
          <p className="mb-4">Total Military Power: <span className="text-lcars-amber font-mono">{data.militaryPower.toLocaleString()}</span></p>
          <p className="text-sm text-gray-500">Visit the Forces page for full details and unit management.</p>
        </div>
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "planets"}
        onClose={() => setActivePanel(null)}
        title="Sectors"
      >
        <div className="text-gray-300">
          <p className="mb-4">Total Sectors: <span className="text-lcars-amber font-mono">{data.sectorCount}</span></p>
          <p className="text-sm text-gray-500">Visit the Sectors page to buy or manage territories.</p>
        </div>
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "population"}
        onClose={() => setActivePanel(null)}
        title="Population"
      >
        <div className="text-gray-300">
          <p className="mb-4">Citizens: <span className="text-lcars-amber font-mono">{data.population.toLocaleString()}</span></p>
          <p className="mb-2">Civil Status: <span className="text-lcars-lavender">{data.civilStatus}</span></p>
          <p className="text-sm text-gray-500">Population grows when fed. Happy citizens produce more.</p>
        </div>
      </SlideOutPanel>

      {/* Turn Summary Modal */}
      <TurnSummaryModal
        isOpen={showModal}
        onClose={handleCloseModal}
        turn={turnResult?.turn ?? 0}
        processingMs={turnResult?.processingMs ?? 0}
        resourceChanges={turnResult?.resourceChanges}
        populationBefore={turnResult?.populationBefore}
        populationAfter={turnResult?.populationAfter}
        events={turnResult?.events ?? []}
        messagesReceived={turnResult?.messagesReceived ?? 0}
        botBattles={turnResult?.botBattles ?? 0}
        empiresEliminated={turnResult?.empiresEliminated ?? []}
        victoryResult={turnResult?.victoryResult}
      />
    </div>
  );
}

export default GameShell;
