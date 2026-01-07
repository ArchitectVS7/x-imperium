import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GAME_EVENT_TYPES,
  EVENT_TRIGGERS,
  createDefaultEmotionalState,
  calculateEmotionalResponse,
  applyEmotionalResponse,
  processEmotionalEvent,
  applyIntensityDecay,
  hasPermanentGrudge,
  getDominantRecentEmotion,
  ALL_GAME_EVENTS,
  type GameEventType,
  type BotEmotionalState,
} from "../triggers";
import { DEFAULT_EMOTIONAL_STATE, DEFAULT_INTENSITY } from "../states";

describe("Emotional Triggers", () => {
  describe("GAME_EVENT_TYPES", () => {
    it("should have all expected combat events", () => {
      expect(GAME_EVENT_TYPES).toContain("battle_won");
      expect(GAME_EVENT_TYPES).toContain("battle_lost");
      expect(GAME_EVENT_TYPES).toContain("sector_captured");
      expect(GAME_EVENT_TYPES).toContain("sector_lost");
      expect(GAME_EVENT_TYPES).toContain("invasion_success");
      expect(GAME_EVENT_TYPES).toContain("invasion_failed");
      expect(GAME_EVENT_TYPES).toContain("under_attack");
      expect(GAME_EVENT_TYPES).toContain("attack_repelled");
    });

    it("should have all expected diplomatic events", () => {
      expect(GAME_EVENT_TYPES).toContain("alliance_formed");
      expect(GAME_EVENT_TYPES).toContain("alliance_broken");
      expect(GAME_EVENT_TYPES).toContain("treaty_offered");
      expect(GAME_EVENT_TYPES).toContain("treaty_rejected");
      expect(GAME_EVENT_TYPES).toContain("betrayed");
      expect(GAME_EVENT_TYPES).toContain("saved_by_ally");
    });

    it("should have all expected economic events", () => {
      expect(GAME_EVENT_TYPES).toContain("trade_success");
      expect(GAME_EVENT_TYPES).toContain("market_manipulation_detected");
      expect(GAME_EVENT_TYPES).toContain("resource_shortage");
      expect(GAME_EVENT_TYPES).toContain("economic_boom");
    });

    it("should have all expected covert events", () => {
      expect(GAME_EVENT_TYPES).toContain("spy_caught");
      expect(GAME_EVENT_TYPES).toContain("spy_success");
      expect(GAME_EVENT_TYPES).toContain("covert_op_against_me");
      expect(GAME_EVENT_TYPES).toContain("covert_op_success");
    });

    it("should have all expected power dynamics events", () => {
      expect(GAME_EVENT_TYPES).toContain("became_top_3");
      expect(GAME_EVENT_TYPES).toContain("fell_from_top_3");
      expect(GAME_EVENT_TYPES).toContain("significantly_outpowered");
      expect(GAME_EVENT_TYPES).toContain("achieved_dominance");
    });

    it("should have all expected survival events", () => {
      expect(GAME_EVENT_TYPES).toContain("near_elimination");
      expect(GAME_EVENT_TYPES).toContain("survived_threat");
      expect(GAME_EVENT_TYPES).toContain("turns_without_incident");
    });
  });

  describe("EVENT_TRIGGERS", () => {
    it("should have triggers for all event types", () => {
      for (const eventType of GAME_EVENT_TYPES) {
        expect(EVENT_TRIGGERS[eventType]).toBeDefined();
        expect(EVENT_TRIGGERS[eventType].event).toBe(eventType);
        expect(EVENT_TRIGGERS[eventType].description).toBeTruthy();
        expect(EVENT_TRIGGERS[eventType].responses.default).toBeDefined();
      }
    });

    it("should have valid intensity changes for all triggers", () => {
      for (const eventType of GAME_EVENT_TYPES) {
        const trigger = EVENT_TRIGGERS[eventType];
        const { default: defaultResp, fromPositive, fromNegative } = trigger.responses;

        expect(defaultResp.intensityChange).toBeGreaterThanOrEqual(-1);
        expect(defaultResp.intensityChange).toBeLessThanOrEqual(1);

        if (fromPositive) {
          expect(fromPositive.intensityChange).toBeDefined();
        }
        if (fromNegative) {
          expect(fromNegative.intensityChange).toBeDefined();
        }
      }
    });

    it("should mark scarring events correctly", () => {
      expect(EVENT_TRIGGERS.sector_lost.canScar).toBe(true);
      expect(EVENT_TRIGGERS.betrayed.canScar).toBe(true);
      expect(EVENT_TRIGGERS.near_elimination.canScar).toBe(true);
      expect(EVENT_TRIGGERS.battle_won.canScar).toBeFalsy();
    });
  });

  describe("createDefaultEmotionalState", () => {
    it("should create a state with default values", () => {
      const state = createDefaultEmotionalState();

      expect(state.currentState).toBe(DEFAULT_EMOTIONAL_STATE);
      expect(state.intensity).toBe(DEFAULT_INTENSITY);
      expect(state.stateChangedTurn).toBe(1);
      expect(state.permanentGrudges).toEqual([]);
      expect(state.recentEvents).toEqual([]);
    });

    it("should use custom start turn", () => {
      const state = createDefaultEmotionalState(10);
      expect(state.stateChangedTurn).toBe(10);
    });
  });

  describe("calculateEmotionalResponse", () => {
    it("should return default response for neutral state", () => {
      const state: BotEmotionalState = {
        currentState: "fearful",
        intensity: 0.5,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const response = calculateEmotionalResponse("battle_won", state);

      expect(response.newState).toBe("confident");
      expect(response.intensityChange).toBe(0.15);
    });

    it("should return fromPositive response when in positive state", () => {
      const state: BotEmotionalState = {
        currentState: "confident",
        intensity: 0.6,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const response = calculateEmotionalResponse("battle_lost", state);

      expect(response.newState).toBe("confident");
      expect(response.intensityChange).toBe(-0.20);
    });

    it("should return fromNegative response when in negative state", () => {
      const state: BotEmotionalState = {
        currentState: "fearful",
        intensity: 0.6,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const response = calculateEmotionalResponse("battle_won", state);

      expect(response.newState).toBe("confident");
      expect(response.intensityChange).toBe(0.15);
    });

    it("should return triumphant response when positive state and winning battle", () => {
      const state: BotEmotionalState = {
        currentState: "triumphant",
        intensity: 0.7,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const response = calculateEmotionalResponse("battle_won", state);

      expect(response.newState).toBe("triumphant");
      expect(response.intensityChange).toBe(0.20);
    });
  });

  describe("applyEmotionalResponse", () => {
    let state: BotEmotionalState;

    beforeEach(() => {
      state = {
        currentState: "confident",
        intensity: 0.5,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };
    });

    it("should apply intensity change correctly", () => {
      const response = { newState: "triumphant" as const, intensityChange: 0.2 };
      const newState = applyEmotionalResponse(state, response, 5, "battle_won");

      expect(newState.intensity).toBe(0.7);
      expect(newState.currentState).toBe("triumphant");
      expect(newState.stateChangedTurn).toBe(5);
    });

    it("should clamp intensity to valid range (max 1)", () => {
      state.intensity = 0.9;
      const response = { newState: "triumphant" as const, intensityChange: 0.3 };
      const newState = applyEmotionalResponse(state, response, 5, "battle_won");

      expect(newState.intensity).toBe(1);
    });

    it("should clamp intensity to valid range (min 0)", () => {
      state.intensity = 0.1;
      const response = { newState: "confident" as const, intensityChange: -0.3 };
      const newState = applyEmotionalResponse(state, response, 5, "turns_without_incident");

      expect(newState.intensity).toBe(0);
    });

    it("should apply minIntensity constraint", () => {
      state.intensity = 0.2;
      const response = { newState: "desperate" as const, intensityChange: 0.1, minIntensity: 0.7 };
      const newState = applyEmotionalResponse(state, response, 5, "near_elimination");

      expect(newState.intensity).toBe(0.7);
    });

    it("should apply maxIntensity constraint", () => {
      state.intensity = 0.9;
      const response = { newState: "triumphant" as const, intensityChange: 0.5, maxIntensity: 0.8 };
      const newState = applyEmotionalResponse(state, response, 5, "sector_captured");

      expect(newState.intensity).toBe(0.8);
    });

    it("should add event to recent events", () => {
      const response = { newState: "triumphant" as const, intensityChange: 0.2 };
      const newState = applyEmotionalResponse(state, response, 5, "battle_won", "enemy-123");

      expect(newState.recentEvents.length).toBe(1);
      expect(newState.recentEvents[0]).toEqual({
        event: "battle_won",
        turn: 5,
        targetEmpireId: "enemy-123",
      });
    });

    it("should keep only last 10 recent events", () => {
      state.recentEvents = Array.from({ length: 10 }, (_, i) => ({
        event: "battle_won" as GameEventType,
        turn: i + 1,
      }));

      const response = { newState: "triumphant" as const, intensityChange: 0.2 };
      const newState = applyEmotionalResponse(state, response, 15, "sector_captured");

      expect(newState.recentEvents.length).toBe(10);
      expect(newState.recentEvents[0]?.event).toBe("sector_captured");
      expect(newState.recentEvents[0]?.turn).toBe(15);
    });

    it("should not change stateChangedTurn if state remains the same", () => {
      state.currentState = "confident";
      const response = { newState: "confident" as const, intensityChange: 0.1 };
      const newState = applyEmotionalResponse(state, response, 10, "trade_success");

      expect(newState.stateChangedTurn).toBe(1);
    });
  });

  describe("applyEmotionalResponse - grudge mechanics", () => {
    let state: BotEmotionalState;

    beforeEach(() => {
      state = {
        currentState: "confident",
        intensity: 0.5,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should potentially add permanent grudge for scarring events", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1); // Below 0.2 threshold

      const response = { newState: "vengeful" as const, intensityChange: 0.5 };
      const newState = applyEmotionalResponse(state, response, 5, "betrayed", "betrayer-123");

      expect(newState.permanentGrudges).toContain("betrayer-123");
    });

    it("should not add grudge if random check fails", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.3); // Above 0.2 threshold

      const response = { newState: "vengeful" as const, intensityChange: 0.5 };
      const newState = applyEmotionalResponse(state, response, 5, "betrayed", "betrayer-123");

      expect(newState.permanentGrudges).not.toContain("betrayer-123");
    });

    it("should not add duplicate grudges", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1); // Below threshold
      state.permanentGrudges = ["betrayer-123"];

      const response = { newState: "vengeful" as const, intensityChange: 0.5 };
      const newState = applyEmotionalResponse(state, response, 5, "betrayed", "betrayer-123");

      expect(newState.permanentGrudges.filter(id => id === "betrayer-123").length).toBe(1);
    });

    it("should not add grudge for non-scarring events", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1);

      const response = { newState: "triumphant" as const, intensityChange: 0.2 };
      const newState = applyEmotionalResponse(state, response, 5, "battle_won", "enemy-123");

      expect(newState.permanentGrudges).not.toContain("enemy-123");
    });
  });

  describe("processEmotionalEvent", () => {
    it("should process event and return updated state", () => {
      const state = createDefaultEmotionalState();
      const newState = processEmotionalEvent("battle_won", state, 5);

      expect(newState.currentState).not.toBe(state.currentState);
      expect(newState.recentEvents.length).toBe(1);
    });

    it("should process betrayal event with high impact", () => {
      const state = createDefaultEmotionalState();
      const newState = processEmotionalEvent("betrayed", state, 10, "traitor-123");

      expect(newState.currentState).toBe("vengeful");
      expect(newState.intensity).toBeGreaterThanOrEqual(0.6);
    });

    it("should process near_elimination with desperation", () => {
      const state = createDefaultEmotionalState();
      const newState = processEmotionalEvent("near_elimination", state, 50);

      expect(newState.currentState).toBe("desperate");
      expect(newState.intensity).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe("applyIntensityDecay", () => {
    it("should decay intensity toward 0.5 from above", () => {
      const state: BotEmotionalState = {
        currentState: "triumphant",
        intensity: 0.8,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = applyIntensityDecay(state, 5, 0.02);

      expect(newState.intensity).toBeCloseTo(0.7); // 0.8 - (5 * 0.02)
    });

    it("should decay intensity toward 0.5 from below", () => {
      const state: BotEmotionalState = {
        currentState: "fearful",
        intensity: 0.3,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = applyIntensityDecay(state, 5, 0.02);

      expect(newState.intensity).toBeCloseTo(0.4); // 0.3 + (5 * 0.02)
    });

    it("should not decay past 0.5 from above", () => {
      const state: BotEmotionalState = {
        currentState: "confident",
        intensity: 0.6,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = applyIntensityDecay(state, 20, 0.02);

      expect(newState.intensity).toBe(0.5);
    });

    it("should not decay past 0.5 from below", () => {
      const state: BotEmotionalState = {
        currentState: "fearful",
        intensity: 0.4,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = applyIntensityDecay(state, 20, 0.02);

      expect(newState.intensity).toBe(0.5);
    });

    it("should use default decay rate", () => {
      const state: BotEmotionalState = {
        currentState: "triumphant",
        intensity: 0.8,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = applyIntensityDecay(state, 5);

      // Default rate is 0.02, so 5 * 0.02 = 0.1 decay
      expect(newState.intensity).toBeCloseTo(0.7);
    });
  });

  describe("hasPermanentGrudge", () => {
    it("should return true if grudge exists", () => {
      const state: BotEmotionalState = {
        currentState: "vengeful",
        intensity: 0.7,
        stateChangedTurn: 1,
        permanentGrudges: ["enemy-123", "enemy-456"],
        recentEvents: [],
      };

      expect(hasPermanentGrudge(state, "enemy-123")).toBe(true);
      expect(hasPermanentGrudge(state, "enemy-456")).toBe(true);
    });

    it("should return false if grudge does not exist", () => {
      const state: BotEmotionalState = {
        currentState: "confident",
        intensity: 0.5,
        stateChangedTurn: 1,
        permanentGrudges: ["enemy-123"],
        recentEvents: [],
      };

      expect(hasPermanentGrudge(state, "enemy-789")).toBe(false);
    });

    it("should return false for empty grudge list", () => {
      const state = createDefaultEmotionalState();
      expect(hasPermanentGrudge(state, "enemy-123")).toBe(false);
    });
  });

  describe("getDominantRecentEmotion", () => {
    it("should return null for empty recent events", () => {
      const state = createDefaultEmotionalState();
      expect(getDominantRecentEmotion(state)).toBeNull();
    });

    it("should return the most common resulting state", () => {
      const state: BotEmotionalState = {
        currentState: "confident",
        intensity: 0.5,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [
          { event: "battle_won", turn: 1 },
          { event: "battle_won", turn: 2 },
          { event: "battle_lost", turn: 3 },
        ],
      };

      const dominant = getDominantRecentEmotion(state);
      expect(dominant).toBe("triumphant"); // battle_won defaults to triumphant
    });

    it("should handle mixed events", () => {
      const state: BotEmotionalState = {
        currentState: "confident",
        intensity: 0.5,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [
          { event: "betrayed", turn: 1 },
          { event: "betrayed", turn: 2 },
          { event: "battle_won", turn: 3 },
        ],
      };

      const dominant = getDominantRecentEmotion(state);
      expect(dominant).toBe("vengeful"); // betrayed defaults to vengeful
    });
  });

  describe("ALL_GAME_EVENTS", () => {
    it("should contain all event types", () => {
      expect(ALL_GAME_EVENTS.length).toBe(GAME_EVENT_TYPES.length);
      for (const eventType of GAME_EVENT_TYPES) {
        expect(ALL_GAME_EVENTS).toContain(eventType);
      }
    });
  });

  describe("Combat event responses", () => {
    it("should handle battle_won from negative state", () => {
      const state: BotEmotionalState = {
        currentState: "fearful",
        intensity: 0.6,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = processEmotionalEvent("battle_won", state, 5);
      expect(newState.currentState).toBe("confident");
    });

    it("should handle under_attack from positive state", () => {
      const state: BotEmotionalState = {
        currentState: "confident",
        intensity: 0.5,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = processEmotionalEvent("under_attack", state, 5);
      expect(newState.currentState).toBe("vengeful");
    });

    it("should handle under_attack from negative state", () => {
      const state: BotEmotionalState = {
        currentState: "fearful",
        intensity: 0.4,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = processEmotionalEvent("under_attack", state, 5);
      expect(newState.currentState).toBe("fearful");
    });
  });

  describe("Economic event responses", () => {
    it("should handle economic_boom from negative state", () => {
      const state: BotEmotionalState = {
        currentState: "desperate",
        intensity: 0.7,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = processEmotionalEvent("economic_boom", state, 5);
      expect(newState.currentState).toBe("confident");
    });

    it("should handle resource_shortage from positive state", () => {
      const state: BotEmotionalState = {
        currentState: "triumphant",
        intensity: 0.8,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = processEmotionalEvent("resource_shortage", state, 5);
      expect(newState.currentState).toBe("fearful");
    });
  });

  describe("Power dynamics event responses", () => {
    it("should handle achieved_dominance with high intensity", () => {
      const state = createDefaultEmotionalState();
      const newState = processEmotionalEvent("achieved_dominance", state, 50);

      expect(newState.currentState).toBe("arrogant");
      expect(newState.intensity).toBeGreaterThanOrEqual(0.5);
    });

    it("should handle fell_from_top_3 from positive state", () => {
      const state: BotEmotionalState = {
        currentState: "confident", // confident is a positive state
        intensity: 0.8,
        stateChangedTurn: 1,
        permanentGrudges: [],
        recentEvents: [],
      };

      const newState = processEmotionalEvent("fell_from_top_3", state, 50);
      expect(newState.currentState).toBe("vengeful");
    });
  });
});
