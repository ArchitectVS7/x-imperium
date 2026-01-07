/**
 * Tutorial Service Tests (M9.1)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getStepInfo,
  getNextStep,
  getStepIndex,
  getTotalSteps,
  initializeTutorialState,
  advanceTutorialStep,
  skipTutorial,
  isStepCompleted,
  isTutorialCompleted,
  getTutorialProgress,
} from "../tutorial-service";
import {
  TUTORIAL_STEPS,
  VICTORY_STEP,
  type TutorialState,
  getUIVisibilityLevel,
  isPanelVisible,
  getCurrentTurnGoal,
  TURN_GOALS,
} from "../types";

describe("Tutorial Step Helpers", () => {
  describe("getStepInfo", () => {
    it("should return step info for valid step", () => {
      const info = getStepInfo("welcome");
      expect(info).not.toBeNull();
      expect(info?.id).toBe("welcome");
      expect(info?.title).toBe("Welcome to Nexus Dominion");
    });

    it("should return victory step info", () => {
      const info = getStepInfo("victory");
      expect(info).not.toBeNull();
      expect(info?.id).toBe("victory");
      expect(info?.title).toBe("Paths to Victory");
    });

    it("should return null for invalid step", () => {
      // @ts-expect-error testing invalid input
      const info = getStepInfo("invalid");
      expect(info).toBeNull();
    });
  });

  describe("getNextStep", () => {
    it("should return neighbors after welcome", () => {
      expect(getNextStep("welcome")).toBe("neighbors");
    });

    it("should return victory after first_turn", () => {
      expect(getNextStep("first_turn")).toBe("victory");
    });

    it("should return null after victory", () => {
      expect(getNextStep("victory")).toBeNull();
    });
  });

  describe("getStepIndex", () => {
    it("should return 0 for welcome", () => {
      expect(getStepIndex("welcome")).toBe(0);
    });

    it("should return last index for victory", () => {
      expect(getStepIndex("victory")).toBe(TUTORIAL_STEPS.length);
    });
  });

  describe("getTotalSteps", () => {
    it("should return steps + victory", () => {
      expect(getTotalSteps()).toBe(TUTORIAL_STEPS.length + 1);
    });
  });
});

describe("Tutorial State Management", () => {
  describe("initializeTutorialState", () => {
    it("should create active tutorial state for new player", () => {
      const state = initializeTutorialState();
      expect(state.isActive).toBe(true);
      expect(state.currentStep).toBe("welcome");
      expect(state.completedSteps).toHaveLength(0);
      expect(state.skipped).toBe(false);
      expect(state.startedAt).toBeInstanceOf(Date);
    });

    it("should create skipped state for returning player", () => {
      const state = initializeTutorialState(true);
      expect(state.isActive).toBe(false);
      expect(state.skipped).toBe(true);
    });
  });

  describe("advanceTutorialStep", () => {
    let state: TutorialState;

    beforeEach(() => {
      state = initializeTutorialState();
    });

    it("should advance from welcome to neighbors", () => {
      const newState = advanceTutorialStep(state);
      expect(newState.currentStep).toBe("neighbors");
      expect(newState.completedSteps).toContain("welcome");
    });

    it("should advance through all steps", () => {
      let currentState = state;

      // Advance through all 5 steps + victory
      for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
        currentState = advanceTutorialStep(currentState);
      }

      // Should now be on victory step
      expect(currentState.currentStep).toBe("victory");
      expect(currentState.completedSteps).toHaveLength(TUTORIAL_STEPS.length);

      // Advance past victory
      currentState = advanceTutorialStep(currentState);
      expect(currentState.isActive).toBe(false);
      expect(currentState.currentStep).toBeNull();
      expect(currentState.completedAt).toBeInstanceOf(Date);
    });

    it("should not advance inactive tutorial", () => {
      const inactiveState: TutorialState = {
        ...state,
        isActive: false,
        currentStep: null,
      };
      const newState = advanceTutorialStep(inactiveState);
      expect(newState).toEqual(inactiveState);
    });
  });

  describe("skipTutorial", () => {
    it("should mark tutorial as skipped", () => {
      const state = initializeTutorialState();
      const skippedState = skipTutorial(state);

      expect(skippedState.isActive).toBe(false);
      expect(skippedState.currentStep).toBeNull();
      expect(skippedState.skipped).toBe(true);
    });
  });

  describe("isStepCompleted", () => {
    it("should return false for uncompleted step", () => {
      const state = initializeTutorialState();
      expect(isStepCompleted(state, "welcome")).toBe(false);
    });

    it("should return true for completed step", () => {
      const state = initializeTutorialState();
      const advanced = advanceTutorialStep(state);
      expect(isStepCompleted(advanced, "welcome")).toBe(true);
    });
  });

  describe("isTutorialCompleted", () => {
    it("should return false for active tutorial", () => {
      const state = initializeTutorialState();
      expect(isTutorialCompleted(state)).toBe(false);
    });

    it("should return false for skipped tutorial", () => {
      const state = skipTutorial(initializeTutorialState());
      expect(isTutorialCompleted(state)).toBe(false);
    });

    it("should return true for completed tutorial", () => {
      let state = initializeTutorialState();
      // Advance through all steps
      for (let i = 0; i <= TUTORIAL_STEPS.length; i++) {
        state = advanceTutorialStep(state);
      }
      expect(isTutorialCompleted(state)).toBe(true);
    });
  });

  describe("getTutorialProgress", () => {
    it("should return 0% at start", () => {
      const state = initializeTutorialState();
      expect(getTutorialProgress(state)).toBe(0);
    });

    it("should return progress based on completed steps", () => {
      let state = initializeTutorialState();
      state = advanceTutorialStep(state); // Complete welcome
      const progress = getTutorialProgress(state);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });

    it("should return 100% when all steps completed", () => {
      let state = initializeTutorialState();
      for (let i = 0; i <= TUTORIAL_STEPS.length; i++) {
        state = advanceTutorialStep(state);
      }
      expect(getTutorialProgress(state)).toBe(100);
    });
  });
});

describe("Contextual UI", () => {
  describe("getUIVisibilityLevel", () => {
    it("should return basic for turns 1-10", () => {
      expect(getUIVisibilityLevel(1)).toBe("basic");
      expect(getUIVisibilityLevel(5)).toBe("basic");
      expect(getUIVisibilityLevel(10)).toBe("basic");
    });

    it("should return intermediate for turns 11-20", () => {
      expect(getUIVisibilityLevel(11)).toBe("intermediate");
      expect(getUIVisibilityLevel(15)).toBe("intermediate");
      expect(getUIVisibilityLevel(20)).toBe("intermediate");
    });

    it("should return advanced for turns 21-50", () => {
      expect(getUIVisibilityLevel(21)).toBe("advanced");
      expect(getUIVisibilityLevel(35)).toBe("advanced");
      expect(getUIVisibilityLevel(50)).toBe("advanced");
    });

    it("should return full for turns 51+", () => {
      expect(getUIVisibilityLevel(51)).toBe("full");
      expect(getUIVisibilityLevel(100)).toBe("full");
      expect(getUIVisibilityLevel(200)).toBe("full");
    });
  });

  describe("isPanelVisible", () => {
    it("should show resource-panel at all levels", () => {
      expect(isPanelVisible("resource-panel", 1)).toBe(true);
      expect(isPanelVisible("resource-panel", 25)).toBe(true);
      expect(isPanelVisible("resource-panel", 100)).toBe(true);
    });

    it("should hide threat-panel at basic level", () => {
      expect(isPanelVisible("threat-panel", 5)).toBe(false);
    });

    it("should show threat-panel at intermediate level", () => {
      expect(isPanelVisible("threat-panel", 15)).toBe(true);
    });

    it("should hide covert-panel until full level", () => {
      expect(isPanelVisible("covert-panel", 10)).toBe(false);
      expect(isPanelVisible("covert-panel", 30)).toBe(false);
      expect(isPanelVisible("covert-panel", 51)).toBe(true);
    });
  });
});

describe("Turn Goals", () => {
  describe("getCurrentTurnGoal", () => {
    it("should return turn 5 goal at start", () => {
      const goal = getCurrentTurnGoal(1);
      expect(goal).not.toBeNull();
      expect(goal?.turn).toBe(5);
      expect(goal?.title).toBe("Build Your Army");
    });

    it("should return turn 10 goal after turn 5", () => {
      const goal = getCurrentTurnGoal(6);
      expect(goal).not.toBeNull();
      expect(goal?.turn).toBe(10);
    });

    it("should return null after all goals passed", () => {
      const lastGoalTurn = Math.max(...TURN_GOALS.map((g) => g.turn));
      const goal = getCurrentTurnGoal(lastGoalTurn + 1);
      expect(goal).toBeNull();
    });
  });

  describe("Turn goal conditions", () => {
    it("should check soldier count for turn 5 goal", () => {
      const goal = TURN_GOALS.find((g) => g.turn === 5);
      expect(goal).not.toBeUndefined();

      const notMet = goal!.checkCondition({ soldiers: 100, fighters: 0, sectorCount: 5, credits: 1000, food: 100, researchLevel: 0, hasNAP: false, hasAttacked: false });
      const met = goal!.checkCondition({ soldiers: 200, fighters: 0, sectorCount: 5, credits: 1000, food: 100, researchLevel: 0, hasNAP: false, hasAttacked: false });

      expect(notMet).toBe(false);
      expect(met).toBe(true);
    });

    it("should check sector count for turn 10 goal", () => {
      const goal = TURN_GOALS.find((g) => g.turn === 10);
      expect(goal).not.toBeUndefined();

      const notMet = goal!.checkCondition({ soldiers: 0, fighters: 0, sectorCount: 5, credits: 1000, food: 100, researchLevel: 0, hasNAP: false, hasAttacked: false });
      const met = goal!.checkCondition({ soldiers: 0, fighters: 0, sectorCount: 7, credits: 1000, food: 100, researchLevel: 0, hasNAP: false, hasAttacked: false });

      expect(notMet).toBe(false);
      expect(met).toBe(true);
    });
  });
});

describe("Tutorial Step Definitions", () => {
  it("should have 5 main tutorial steps", () => {
    expect(TUTORIAL_STEPS).toHaveLength(5);
  });

  it("should have all required properties for each step", () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.id).toBeDefined();
      expect(step.title).toBeDefined();
      expect(step.description).toBeDefined();
      expect(step.nextStep).toBeDefined();
    }
  });

  it("should have victory step as final", () => {
    const lastStep = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(lastStep?.nextStep).toBe("victory");
    expect(VICTORY_STEP.nextStep).toBeNull();
  });

  it("should have first_turn step require action", () => {
    const firstTurnStep = TUTORIAL_STEPS.find((s) => s.id === "first_turn");
    expect(firstTurnStep?.action).toBe("end_turn");
  });
});
