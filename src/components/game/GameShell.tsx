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
import { TutorialOverlay } from "./tutorial";
import { PhaseIndicator } from "./PhaseIndicator";
import {
  getGameLayoutDataAction,
  endTurnEnhancedAction,
  type GameLayoutData,
} from "@/app/actions/turn-actions";
import type { TurnEvent, ResourceDelta } from "@/lib/game/types/turn-types";
import type { CivilStatusKey } from "@/lib/theme/names";
import { ResourcePanel } from "./ResourcePanel";
import {
  MilitaryPanelContent,
  SectorsPanelContent,
  CombatPanelContent,
  MarketPanelContent,
  ResearchPanelContent,
  DiplomacyPanelContent,
  CovertPanelContent,
  MessagesPanelContent,
} from "./panels";
import { useGameKeyboardShortcuts } from "@/hooks/useGameKeyboardShortcuts";
import { PanelProvider, type PanelContextData } from "@/contexts/PanelContext";

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
  const [panelContext, setPanelContext] = useState<PanelContextData | null>(null);

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

    /**
     * POLLING STRATEGY (Current Implementation)
     *
     * Polls every 30 seconds to catch external changes (bot attacks, market prices, etc.)
     * This ensures the UI stays in sync without requiring page refreshes.
     *
     * WHY 30 SECONDS:
     * - Balance between freshness and server load
     * - Most game changes happen on turn end (manual trigger)
     * - External events (bot attacks) are relatively infrequent
     * - Mobile/slow connections can handle 30s intervals
     *
     * LIMITATIONS:
     * - Creates unnecessary load when game state hasn't changed
     * - 30-second delay before showing external changes
     * - Multiple tabs = multiple polling requests
     * - Doesn't scale well with many concurrent players
     *
     * FUTURE: PUSH UPDATE STRATEGY
     *
     * For production deployments, consider replacing with server-sent events (SSE)
     * or WebSockets for real-time updates:
     *
     * Option 1: Server-Sent Events (SSE) - Recommended for Next.js
     * - Use Next.js Route Handlers with ReadableStream
     * - Push updates only when game state changes
     * - Lower latency, lower server load
     * - Example: /api/game/[gameId]/stream
     *
     * Option 2: WebSockets via Socket.io
     * - Requires custom server setup
     * - Bidirectional communication
     * - Best for real-time multiplayer features
     * - More complex deployment (need WebSocket support)
     *
     * Option 3: Polling with ETag/Last-Modified headers
     * - Interim solution: still polls but with 304 Not Modified
     * - Reduces bandwidth, but still makes requests
     * - Easy to implement with Next.js middleware
     *
     * Implementation Priority:
     * 1. Add ETag support (quick win, reduces bandwidth)
     * 2. Implement SSE for game state updates (production ready)
     * 3. Consider WebSockets only if adding real-time multiplayer
     */
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

  // Handle panel toggle with optional context
  const handlePanelToggle = useCallback((panel: PanelType, context?: PanelContextData) => {
    setActivePanel(panel);
    setPanelContext(context ?? null);
  }, []);

  // Handle panel close
  const handlePanelClose = useCallback(() => {
    setActivePanel(null);
    setPanelContext(null);
  }, []);

  // Keyboard shortcuts for panel navigation
  useGameKeyboardShortcuts({
    onOpenPanel: handlePanelToggle,
    onClosePanel: handlePanelClose,
    activePanel,
    onEndTurn: handleEndTurn,
    isProcessing,
    enabled: true,
  });

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
    <PanelProvider
      activePanel={activePanel}
      panelContext={panelContext}
      openPanel={handlePanelToggle}
      closePanel={handlePanelClose}
    >
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Onboarding Hints (first 5 turns) */}
      <OnboardingManager currentTurn={data.currentTurn} />

      {/* Phase Indicator - shows current turn phase */}
      <PhaseIndicator
        currentPhase={null} // null = player action phase (will be enhanced later for turn processing)
        isProcessing={isProcessing}
      />

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
          onOpenPanel={handlePanelToggle}
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

      {/* Slide-out Panels */}
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
        width="lg"
      >
        <MilitaryPanelContent onClose={() => setActivePanel(null)} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "sectors"}
        onClose={() => setActivePanel(null)}
        title="Sectors"
        width="lg"
      >
        <SectorsPanelContent onClose={() => setActivePanel(null)} />
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

      <SlideOutPanel
        isOpen={activePanel === "combat"}
        onClose={handlePanelClose}
        title="Combat"
        width="lg"
        variant="combat"
        side="right"
      >
        <CombatPanelContent
          targetEmpireId={panelContext?.targetEmpireId}
          onClose={handlePanelClose}
        />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "market"}
        onClose={() => setActivePanel(null)}
        title="Market"
        width="lg"
      >
        <MarketPanelContent onClose={() => setActivePanel(null)} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "research"}
        onClose={() => setActivePanel(null)}
        title="Research"
        width="lg"
      >
        <ResearchPanelContent onClose={() => setActivePanel(null)} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "diplomacy"}
        onClose={() => setActivePanel(null)}
        title="Diplomacy"
        width="lg"
      >
        <DiplomacyPanelContent onClose={() => setActivePanel(null)} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "covert"}
        onClose={handlePanelClose}
        title="Covert Operations"
        width="lg"
      >
        <CovertPanelContent
          targetEmpireId={panelContext?.targetEmpireId}
          onClose={handlePanelClose}
        />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "messages"}
        onClose={() => setActivePanel(null)}
        title="Messages"
        width="lg"
      >
        <MessagesPanelContent onClose={() => setActivePanel(null)} />
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

      {/* Tutorial Overlay (5-step guided tutorial for new players) */}
      <TutorialOverlay
        onActionRequired={(action) => {
          if (action === "end_turn") {
            // Tutorial asks player to end their first turn
            handleEndTurn();
          }
        }}
        onComplete={(completed) => {
          console.log(
            completed ? "Tutorial completed!" : "Tutorial skipped"
          );
        }}
      />
    </div>
    </PanelProvider>
  );
}

export default GameShell;
