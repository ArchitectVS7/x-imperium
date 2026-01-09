/**
 * Tutorial Service (M9.1)
 *
 * Manages tutorial state and progression.
 */

import {
  type TutorialStep,
  type TutorialState,
  type TutorialStepInfo,
  TUTORIAL_STEPS,
  VICTORY_STEP,
  DEFAULT_TUTORIAL_STATE,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** LocalStorage key for tutorial state */
export const TUTORIAL_STORAGE_KEY = "nexus-dominion-tutorial";

/** LocalStorage key for skip preference */
export const TUTORIAL_SKIP_KEY = "nexus-dominion-tutorial-skipped";

// =============================================================================
// STEP HELPERS
// =============================================================================

/**
 * Get tutorial step info by ID.
 */
export function getStepInfo(stepId: TutorialStep | "victory"): TutorialStepInfo | null {
  if (stepId === "victory") {
    return VICTORY_STEP;
  }
  return TUTORIAL_STEPS.find((step) => step.id === stepId) ?? null;
}

/**
 * Get the next step after a given step.
 */
export function getNextStep(
  currentStep: TutorialStep | "victory"
): TutorialStep | "victory" | null {
  const stepInfo = getStepInfo(currentStep);
  return stepInfo?.nextStep ?? null;
}

/**
 * Get step index (0-based).
 */
export function getStepIndex(stepId: TutorialStep | "victory"): number {
  if (stepId === "victory") {
    return TUTORIAL_STEPS.length;
  }
  return TUTORIAL_STEPS.findIndex((step) => step.id === stepId);
}

/**
 * Get total number of steps (including victory).
 */
export function getTotalSteps(): number {
  return TUTORIAL_STEPS.length + 1; // +1 for victory step
}

// =============================================================================
// STATE MANAGEMENT (Pure Functions)
// =============================================================================

/**
 * Initialize tutorial state for a new player.
 */
export function initializeTutorialState(skipIfReturning: boolean = false): TutorialState {
  if (skipIfReturning) {
    return {
      ...DEFAULT_TUTORIAL_STATE,
      isActive: false,
      skipped: true,
    };
  }

  return {
    ...DEFAULT_TUTORIAL_STATE,
    startedAt: new Date(),
  };
}

/**
 * Advance to the next tutorial step.
 */
export function advanceTutorialStep(state: TutorialState): TutorialState {
  if (!state.isActive || !state.currentStep) {
    return state;
  }

  const nextStep = getNextStep(state.currentStep);
  const completedSteps = [...state.completedSteps, state.currentStep];

  // If no next step, tutorial is complete
  if (!nextStep) {
    return {
      ...state,
      isActive: false,
      currentStep: null,
      completedSteps,
      completedAt: new Date(),
    };
  }

  return {
    ...state,
    currentStep: nextStep,
    completedSteps,
  };
}

/**
 * Skip the tutorial entirely.
 */
export function skipTutorial(state: TutorialState): TutorialState {
  return {
    ...state,
    isActive: false,
    currentStep: null,
    skipped: true,
  };
}

/**
 * Check if a specific step is completed.
 */
export function isStepCompleted(
  state: TutorialState,
  stepId: TutorialStep | "victory"
): boolean {
  return state.completedSteps.includes(stepId);
}

/**
 * Check if tutorial is fully completed (not skipped).
 */
export function isTutorialCompleted(state: TutorialState): boolean {
  return !state.isActive && !state.skipped && state.completedAt !== null;
}

/**
 * Get progress percentage (0-100).
 */
export function getTutorialProgress(state: TutorialState): number {
  const total = getTotalSteps();
  const completed = state.completedSteps.length;
  return Math.round((completed / total) * 100);
}

// =============================================================================
// PERSISTENCE (Client-side)
// =============================================================================

/**
 * Save tutorial state to localStorage.
 * Call this from client-side code only.
 */
export function saveTutorialState(state: TutorialState): void {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify({
      ...state,
      startedAt: state.startedAt?.toISOString() ?? null,
      completedAt: state.completedAt?.toISOString() ?? null,
    });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, serialized);

    if (state.skipped) {
      localStorage.setItem(TUTORIAL_SKIP_KEY, "true");
    }
  } catch {
    console.error("Failed to save tutorial state");
  }
}

/**
 * Load tutorial state from localStorage.
 * Call this from client-side code only.
 */
export function loadTutorialState(): TutorialState | null {
  if (typeof window === "undefined") return null;

  try {
    const serialized = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!serialized) return null;

    const parsed = JSON.parse(serialized);
    return {
      ...parsed,
      startedAt: parsed.startedAt ? new Date(parsed.startedAt) : null,
      completedAt: parsed.completedAt ? new Date(parsed.completedAt) : null,
    };
  } catch {
    console.error("Failed to load tutorial state");
    return null;
  }
}

/**
 * Check if user has previously skipped the tutorial.
 */
export function hasSkippedTutorial(): boolean {
  if (typeof window === "undefined") return false;

  return localStorage.getItem(TUTORIAL_SKIP_KEY) === "true";
}

/**
 * Clear tutorial state (for testing/reset).
 */
export function clearTutorialState(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  localStorage.removeItem(TUTORIAL_SKIP_KEY);
}

/**
 * Check if tutorial is currently active (not completed or skipped).
 * This function checks localStorage to determine if the tutorial overlay
 * should be blocking other UI elements.
 *
 * @returns true if tutorial is still in progress, false if completed/skipped
 */
export function isTutorialActive(): boolean {
  if (typeof window === "undefined") return false;

  // Check if user has skipped
  if (hasSkippedTutorial()) {
    return false;
  }

  // Load saved state
  const state = loadTutorialState();

  // If no state exists, tutorial hasn't started yet - it will be active
  if (!state) {
    return true;
  }

  // Tutorial is active if isActive is true
  return state.isActive;
}
