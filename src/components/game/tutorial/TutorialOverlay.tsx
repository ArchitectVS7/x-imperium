"use client";

/**
 * Tutorial Overlay Component (M9.2)
 *
 * Displays the 5-step tutorial with modal overlays and step indicators.
 */

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  type TutorialState,
  type TutorialStepInfo,
} from "@/lib/tutorial/types";
import {
  getStepInfo,
  getStepIndex,
  getTotalSteps,
  advanceTutorialStep,
  skipTutorial,
  getTutorialProgress,
  saveTutorialState,
  loadTutorialState,
  initializeTutorialState,
  hasSkippedTutorial,
} from "@/lib/tutorial/tutorial-service";

// =============================================================================
// PROPS
// =============================================================================

interface TutorialOverlayProps {
  /** Called when tutorial step requires action (e.g., "end_turn") */
  onActionRequired?: (action: string) => void;
  /** Called when tutorial is completed or skipped */
  onComplete?: (completed: boolean) => void;
  /** Force show for testing */
  forceShow?: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StepIndicator({
  currentIndex,
  totalSteps,
}: {
  currentIndex: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            i < currentIndex && "bg-lcars-gold",
            i === currentIndex && "bg-lcars-amber animate-pulse",
            i > currentIndex && "bg-gray-600"
          )}
        />
      ))}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-1 mb-4">
      <div
        className="bg-lcars-gold h-1 rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function StepContent({ step }: { step: TutorialStepInfo }) {
  const isVictoryStep = step.id === "victory";

  return (
    <div className="text-left">
      <h2 className="text-xl font-semibold text-lcars-gold mb-3">
        {step.title}
      </h2>

      {isVictoryStep ? (
        <div className="space-y-2 text-gray-300 text-sm">
          <p className="mb-3">There are six ways to win:</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-lcars-amber">•</span>
              <span>
                <strong className="text-white">Conquest:</strong> Control 60% of all planets
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lcars-amber">•</span>
              <span>
                <strong className="text-white">Economic:</strong> Have 1.5× the networth of 2nd place
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lcars-amber">•</span>
              <span>
                <strong className="text-white">Survival:</strong> Highest score at turn 200
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lcars-amber">•</span>
              <span>
                <strong className="text-white">Coalition:</strong> Lead a victorious alliance
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lcars-amber">•</span>
              <span>
                <strong className="text-white">Technological:</strong> Reach Research Level 10
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lcars-amber">•</span>
              <span>
                <strong className="text-white">Domination:</strong> Eliminate all opponents
              </span>
            </li>
          </ul>
        </div>
      ) : (
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {step.description}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TutorialOverlay({
  onActionRequired,
  onComplete,
  forceShow,
}: TutorialOverlayProps) {
  const [state, setState] = useState<TutorialState | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Initialize state on mount
  useEffect(() => {
    const savedState = loadTutorialState();
    if (savedState) {
      setState(savedState);
      setIsVisible(savedState.isActive);
    } else if (!hasSkippedTutorial()) {
      const newState = initializeTutorialState();
      setState(newState);
      saveTutorialState(newState);
      setIsVisible(true);
    }
  }, []);

  // Handle force show for testing
  useEffect(() => {
    if (forceShow !== undefined) {
      setIsVisible(forceShow);
    }
  }, [forceShow]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (!state) return;

    const currentStepInfo = state.currentStep ? getStepInfo(state.currentStep) : null;

    // If current step has an action, notify parent
    if (currentStepInfo?.action) {
      onActionRequired?.(currentStepInfo.action);
    }

    const newState = advanceTutorialStep(state);
    setState(newState);
    saveTutorialState(newState);

    // Check if completed
    if (!newState.isActive) {
      setIsVisible(false);
      onComplete?.(true);
    }
  }, [state, onActionRequired, onComplete]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (!state) return;

    const newState = skipTutorial(state);
    setState(newState);
    saveTutorialState(newState);
    setIsVisible(false);
    onComplete?.(false);
  }, [state, onComplete]);

  // Don't render if not visible or no state
  if (!isVisible || !state || !state.currentStep) {
    return null;
  }

  const currentStep = getStepInfo(state.currentStep);
  if (!currentStep) return null;

  const stepIndex = getStepIndex(state.currentStep);
  const totalSteps = getTotalSteps();
  const progress = getTutorialProgress(state);
  const isLastStep = state.currentStep === "victory";
  const isFirstStep = state.currentStep === "welcome";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="tutorial-overlay"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Modal */}
      <div
        className="relative bg-gray-900 border border-lcars-amber/50 rounded-lg max-w-lg w-full mx-4 p-6 shadow-2xl"
        data-testid="tutorial-modal"
      >
        {/* Step indicator */}
        <StepIndicator currentIndex={stepIndex} totalSteps={totalSteps} />

        {/* Progress bar */}
        <ProgressBar progress={progress} />

        {/* Step number */}
        <div className="text-xs text-gray-500 mb-2">
          Step {stepIndex + 1} of {totalSteps}
        </div>

        {/* Content */}
        <StepContent step={currentStep} />

        {/* Highlight hint */}
        {currentStep.targetElement && (
          <div className="mt-4 text-xs text-lcars-amber/70 flex items-center gap-2">
            <span className="animate-pulse">●</span>
            <span>Look for the highlighted element on screen</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-between">
          {/* Skip button (not shown on last step) */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              data-testid="tutorial-skip"
            >
              Skip tutorial
            </button>
          )}

          {isLastStep && <div />}

          {/* Next/Finish button */}
          <button
            onClick={handleNext}
            className={cn(
              "px-4 py-2 rounded font-medium transition-colors",
              "bg-lcars-amber text-black hover:bg-lcars-gold",
              isLastStep && "bg-green-600 hover:bg-green-500 text-white"
            )}
            data-testid="tutorial-next"
          >
            {isLastStep ? "Start Playing!" : isFirstStep ? "Let's Go!" : "Next"}
          </button>
        </div>

        {/* Skip checkbox hint (only on first step) */}
        {isFirstStep && (
          <div className="mt-4 text-xs text-gray-600 text-center">
            Returning player? You can skip the tutorial.
          </div>
        )}
      </div>
    </div>
  );
}

export default TutorialOverlay;
