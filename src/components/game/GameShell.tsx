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
 *
 * MODAL SEQUENCING (P2-16 fix):
 * - Tutorial overlay shows FIRST on turn 1
 * - Welcome modal shows AFTER tutorial is completed/skipped
 * - OnboardingManager only shows hints AFTER tutorial is done
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TurnOrderPanel } from "./TurnOrderPanel";
import { TurnSummaryModal } from "./TurnSummaryModal";
import { EmpireStatusBar } from "./EmpireStatusBar";
import { SlideOutPanel } from "./SlideOutPanel";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileActionSheet } from "./MobileActionSheet";
import { OnboardingManager } from "./onboarding";
import { TutorialOverlay } from "./tutorial";
import { PhaseIndicator } from "./PhaseIndicator";
import { QuickReferenceModal } from "./QuickReferenceModal";
import { DefeatAnalysisModal } from "./DefeatAnalysisModal";
import type { GameLayoutData } from "@/app/actions/turn-actions";
import type { DefeatAnalysis } from "@/lib/game/types/turn-types";
import { useToast } from "@/hooks/useToast";
import { useTurnProcessing, type TurnProcessingResult } from "@/hooks/useTurnProcessing";
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
import { useProgressiveDisclosure } from "@/hooks/useProgressiveDisclosure";
import { PanelProvider } from "@/contexts/PanelContext";
import { useGameStateStream, type GameStateUpdate } from "@/hooks/useGameStateStream";
import {
  useTutorialState,
  usePanelState,
  useMobileSheet,
  useWelcomeModal,
} from "./hooks";

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

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [turnResult, setTurnResult] = useState<TurnProcessingResult | null>(null);

  // Tutorial completion tracking (P2-16 fix) - extracted hook
  const { tutorialCompleted, handleTutorialComplete } = useTutorialState();

  // Mobile action sheet state - extracted hook
  const { mobileSheetOpen, setMobileSheetOpen } = useMobileSheet();

  // Quick reference modal state
  const [showQuickReference, setShowQuickReference] = useState(false);

  // Defeat analysis modal state
  const [defeatAnalysis, setDefeatAnalysis] = useState<DefeatAnalysis | null>(null);

  // Toast notifications (extracted hook)
  const { toast, showToast, dismissToast } = useToast({ duration: 5000 });

  // Turn processing (extracted hook)
  const { isProcessing, processTurn, refreshLayoutData } = useTurnProcessing({
    onSuccess: useCallback((result: TurnProcessingResult) => {
      setTurnResult(result);
      setShowModal(true);
    }, []),
    onError: useCallback((error: string) => {
      showToast(error, "error");
    }, [showToast]),
    onDefeat: useCallback((analysis: DefeatAnalysis) => {
      setDefeatAnalysis(analysis);
    }, []),
    setLayoutData,
  });

  // SSE connection for real-time game state updates
  const { isConnected: sseConnected, error: sseError } = useGameStateStream({
    gameId: layoutData?.gameId ?? null,
    empireId: layoutData?.empireId ?? null,
    onUpdate: useCallback((update: GameStateUpdate) => {
      // Merge SSE updates into layout data
      setLayoutData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentTurn: update.currentTurn,
          turnLimit: update.turnLimit,
          credits: update.credits,
          food: update.food,
          ore: update.ore,
          petroleum: update.petroleum,
          population: update.population,
          networth: update.networth,
        };
      });
    }, []),
    onGameEnded: useCallback((status: string, finalTurn: number) => {
      console.log(`Game ended: ${status} at turn ${finalTurn}`);
      router.refresh();
    }, [router]),
    enabled: !!layoutData?.gameId && !!layoutData?.empireId,
    fallbackPollingInterval: 30000,
  });

  // Listen for fallback polling events from the SSE hook
  useEffect(() => {
    const handlePollNeeded = () => {
      refreshLayoutData();
    };
    window.addEventListener("game-state-poll-needed", handlePollNeeded);
    return () => {
      window.removeEventListener("game-state-poll-needed", handlePollNeeded);
    };
  }, [refreshLayoutData]);

  // Initial load if no server-side data provided
  useEffect(() => {
    if (!initialLayoutData) {
      refreshLayoutData();
    }
  }, [initialLayoutData, refreshLayoutData]);

  // Log SSE connection status for debugging
  useEffect(() => {
    if (sseConnected) {
      console.log("[GameShell] SSE connected - real-time updates active");
    } else if (sseError) {
      console.warn("[GameShell] SSE error, using polling fallback:", sseError);
    }
  }, [sseConnected, sseError]);

  // Welcome modal logic - extracted hook (P2-14)
  useWelcomeModal({
    layoutData,
    tutorialCompleted,
    setTurnResult,
    setShowModal,
  });

  // Handle end turn (delegates to hook, closes mobile sheet)
  const handleEndTurn = useCallback(async () => {
    setMobileSheetOpen(false);
    await processTurn();
  }, [setMobileSheetOpen, processTurn]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setTurnResult(null);
    // Refresh the page to show updated data
    router.refresh();
  }, [router]);

  // Progressive UI disclosure - unlock features gradually
  const { isPanelLocked, getUnlockTurn } = useProgressiveDisclosure({
    currentTurn: layoutData?.currentTurn ?? 1,
    onUnlock: useCallback((features: string[]) => {
      if (features.length > 0) {
        showToast(`New features unlocked: ${features.join(", ")}`, "success");
      }
    }, [showToast]),
    enabled: true,
  });

  // Panel state management - extracted hook (P2-14)
  const {
    activePanel,
    panelContext,
    handlePanelToggle,
    handlePanelClose,
    handlePanelToggleWithLock,
  } = usePanelState({
    isPanelLocked,
    getUnlockTurn,
    showToast,
  });

  // Keyboard shortcuts for panel navigation
  useGameKeyboardShortcuts({
    onOpenPanel: handlePanelToggle,
    onClosePanel: handlePanelClose,
    activePanel,
    onEndTurn: handleEndTurn,
    onQuickReference: useCallback(() => setShowQuickReference(true), []),
    isProcessing,
    enabled: true,
  });

  // Default layout data if not loaded
  const data = layoutData ?? {
    gameId: "",
    empireId: "",
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
      openPanel={handlePanelToggleWithLock}
      closePanel={handlePanelClose}
    >
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Onboarding Hints (turns 2-20, AFTER tutorial is done) - P2-16 fix */}
      {tutorialCompleted && (
        <OnboardingManager currentTurn={data.currentTurn} />
      )}

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
          isPanelLocked={isPanelLocked}
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
        onPanelToggle={handlePanelToggleWithLock}
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
        isPanelLocked={isPanelLocked}
      />

      {/* Slide-out Panels */}
      <SlideOutPanel
        isOpen={activePanel === "resources"}
        onClose={handlePanelClose}
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
        onClose={handlePanelClose}
        title="Military Forces"
        width="lg"
      >
        <MilitaryPanelContent onClose={handlePanelClose} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "sectors"}
        onClose={handlePanelClose}
        title="Sectors"
        width="lg"
      >
        <SectorsPanelContent onClose={handlePanelClose} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "population"}
        onClose={handlePanelClose}
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
        onClose={handlePanelClose}
        title="Market"
        width="lg"
      >
        <MarketPanelContent onClose={handlePanelClose} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "research"}
        onClose={handlePanelClose}
        title="Research"
        width="lg"
      >
        <ResearchPanelContent onClose={handlePanelClose} />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={activePanel === "diplomacy"}
        onClose={handlePanelClose}
        title="Diplomacy"
        width="lg"
      >
        <DiplomacyPanelContent onClose={handlePanelClose} />
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
        onClose={handlePanelClose}
        title="Messages"
        width="lg"
      >
        <MessagesPanelContent onClose={handlePanelClose} />
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
      {/* P2-16: Shows FIRST on turn 1, before welcome modal */}
      <TutorialOverlay
        onActionRequired={(action) => {
          if (action === "end_turn") {
            // Tutorial asks player to end their first turn
            handleEndTurn();
          }
        }}
        onComplete={handleTutorialComplete}
      />

      {/* Quick Reference Modal (? key) */}
      <QuickReferenceModal
        isOpen={showQuickReference}
        onClose={() => setShowQuickReference(false)}
      />

      {/* Defeat Analysis Modal */}
      <DefeatAnalysisModal
        isOpen={defeatAnalysis !== null}
        onClose={() => setDefeatAnalysis(null)}
        data={defeatAnalysis}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed bottom-24 lg:bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg max-w-md transition-opacity duration-300 ${
            toast.type === "error"
              ? "bg-lcars-red/90 text-white border border-lcars-red"
              : "bg-lcars-green/90 text-white border border-lcars-green"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {toast.type === "error" ? "!" : "OK"}
            </span>
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={dismissToast}
              className="ml-auto text-white/80 hover:text-white"
              aria-label="Dismiss notification"
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
    </PanelProvider>
  );
}

export default GameShell;
