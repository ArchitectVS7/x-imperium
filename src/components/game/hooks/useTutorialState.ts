"use client";

import { useState, useEffect, useCallback } from "react";
import { isTutorialActive } from "@/lib/tutorial/tutorial-service";

/**
 * Hook for managing tutorial completion state.
 *
 * Tracks whether the tutorial is active and provides a callback
 * for marking the tutorial as complete.
 */
export function useTutorialState() {
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Check tutorial state on mount
  useEffect(() => {
    const tutorialIsActive = isTutorialActive();
    setTutorialCompleted(!tutorialIsActive);
  }, []);

  /**
   * Mark the tutorial as completed.
   * Called when the user finishes the tutorial flow.
   */
  const handleTutorialComplete = useCallback((completed: boolean) => {
    console.log(completed ? "Tutorial completed!" : "Tutorial skipped");
    setTutorialCompleted(true);
  }, []);

  return {
    tutorialCompleted,
    handleTutorialComplete,
  };
}
