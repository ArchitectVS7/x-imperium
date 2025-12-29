import { describe, it, expect } from "vitest";
import {
  PROGRESSIVE_UNLOCKS,
  UNLOCK_DEFINITIONS,
  UNLOCK_TURNS,
  getUnlockedFeatures,
  getNewUnlocks,
  isFeatureUnlocked,
  getUnlockTurn,
  getUnlockDefinition,
  getUpcomingUnlocks,
  getNextUnlock,
  getUnlockProgress,
  getCurrentPhase,
  ALL_UNLOCK_FEATURES,
  GAME_PHASES,
  PHASE_NAMES,
  type UnlockFeature,
} from "../unlocks";

describe("Progressive Unlock System", () => {
  describe("PROGRESSIVE_UNLOCKS", () => {
    it("should have core_mechanics at turn 1", () => {
      expect(PROGRESSIVE_UNLOCKS[1]).toContain("core_mechanics");
    });

    it("should have all expected unlock turns", () => {
      expect(PROGRESSIVE_UNLOCKS[1]).toBeDefined();
      expect(PROGRESSIVE_UNLOCKS[10]).toBeDefined();
      expect(PROGRESSIVE_UNLOCKS[20]).toBeDefined();
      expect(PROGRESSIVE_UNLOCKS[30]).toBeDefined();
      expect(PROGRESSIVE_UNLOCKS[50]).toBeDefined();
      expect(PROGRESSIVE_UNLOCKS[75]).toBeDefined();
      expect(PROGRESSIVE_UNLOCKS[100]).toBeDefined();
      expect(PROGRESSIVE_UNLOCKS[150]).toBeDefined();
    });

    it("should unlock features in correct order", () => {
      expect(PROGRESSIVE_UNLOCKS[10]).toContain("diplomacy_basics");
      expect(PROGRESSIVE_UNLOCKS[20]).toContain("coalitions");
      expect(PROGRESSIVE_UNLOCKS[30]).toContain("black_market");
      expect(PROGRESSIVE_UNLOCKS[50]).toContain("advanced_ships");
      expect(PROGRESSIVE_UNLOCKS[75]).toContain("coalition_warfare");
      expect(PROGRESSIVE_UNLOCKS[100]).toContain("superweapons");
      expect(PROGRESSIVE_UNLOCKS[150]).toContain("endgame_ultimatums");
    });
  });

  describe("UNLOCK_DEFINITIONS", () => {
    it("should have definitions for all features", () => {
      const features: UnlockFeature[] = [
        "core_mechanics",
        "diplomacy_basics",
        "coalitions",
        "black_market",
        "advanced_ships",
        "coalition_warfare",
        "superweapons",
        "endgame_ultimatums",
      ];

      for (const feature of features) {
        const def = UNLOCK_DEFINITIONS[feature];
        expect(def).toBeDefined();
        expect(def.id).toBe(feature);
        expect(def.name).toBeTruthy();
        expect(def.unlockTurn).toBeGreaterThan(0);
        expect(def.description).toBeTruthy();
        expect(def.unlockMessage).toBeTruthy();
      }
    });
  });

  describe("UNLOCK_TURNS", () => {
    it("should be sorted in ascending order", () => {
      for (let i = 1; i < UNLOCK_TURNS.length; i++) {
        expect(UNLOCK_TURNS[i]).toBeGreaterThan(UNLOCK_TURNS[i - 1]!);
      }
    });

    it("should start with turn 1", () => {
      expect(UNLOCK_TURNS[0]).toBe(1);
    });
  });

  describe("getUnlockedFeatures", () => {
    it("should return only core_mechanics at turn 1", () => {
      const unlocked = getUnlockedFeatures(1);
      expect(unlocked).toContain("core_mechanics");
      expect(unlocked.length).toBe(1);
    });

    it("should return core_mechanics and diplomacy_basics at turn 10", () => {
      const unlocked = getUnlockedFeatures(10);
      expect(unlocked).toContain("core_mechanics");
      expect(unlocked).toContain("diplomacy_basics");
      expect(unlocked.length).toBe(2);
    });

    it("should include all features by turn 150", () => {
      const unlocked = getUnlockedFeatures(150);
      expect(unlocked.length).toBe(ALL_UNLOCK_FEATURES.length);
    });

    it("should return more features as turns progress", () => {
      const turn10 = getUnlockedFeatures(10);
      const turn50 = getUnlockedFeatures(50);
      const turn100 = getUnlockedFeatures(100);

      expect(turn50.length).toBeGreaterThan(turn10.length);
      expect(turn100.length).toBeGreaterThan(turn50.length);
    });

    it("should return no features before turn 1", () => {
      const unlocked = getUnlockedFeatures(0);
      expect(unlocked.length).toBe(0);
    });
  });

  describe("getNewUnlocks", () => {
    it("should return core_mechanics at turn 1", () => {
      const newUnlocks = getNewUnlocks(1);
      expect(newUnlocks).toContain("core_mechanics");
    });

    it("should return empty array for non-unlock turns", () => {
      expect(getNewUnlocks(5)).toEqual([]);
      expect(getNewUnlocks(15)).toEqual([]);
      expect(getNewUnlocks(99)).toEqual([]);
    });

    it("should return diplomacy_basics at turn 10", () => {
      const newUnlocks = getNewUnlocks(10);
      expect(newUnlocks).toContain("diplomacy_basics");
    });

    it("should return superweapons at turn 100", () => {
      const newUnlocks = getNewUnlocks(100);
      expect(newUnlocks).toContain("superweapons");
    });
  });

  describe("isFeatureUnlocked", () => {
    it("should return true for core_mechanics at turn 1", () => {
      expect(isFeatureUnlocked("core_mechanics", 1)).toBe(true);
    });

    it("should return false for diplomacy_basics at turn 1", () => {
      expect(isFeatureUnlocked("diplomacy_basics", 1)).toBe(false);
    });

    it("should return true for diplomacy_basics at turn 10", () => {
      expect(isFeatureUnlocked("diplomacy_basics", 10)).toBe(true);
    });

    it("should return true for diplomacy_basics after turn 10", () => {
      expect(isFeatureUnlocked("diplomacy_basics", 50)).toBe(true);
    });

    it("should return false for superweapons before turn 100", () => {
      expect(isFeatureUnlocked("superweapons", 99)).toBe(false);
    });

    it("should return true for superweapons at turn 100", () => {
      expect(isFeatureUnlocked("superweapons", 100)).toBe(true);
    });
  });

  describe("getUnlockTurn", () => {
    it("should return 1 for core_mechanics", () => {
      expect(getUnlockTurn("core_mechanics")).toBe(1);
    });

    it("should return 10 for diplomacy_basics", () => {
      expect(getUnlockTurn("diplomacy_basics")).toBe(10);
    });

    it("should return 100 for superweapons", () => {
      expect(getUnlockTurn("superweapons")).toBe(100);
    });

    it("should return 150 for endgame_ultimatums", () => {
      expect(getUnlockTurn("endgame_ultimatums")).toBe(150);
    });
  });

  describe("getUnlockDefinition", () => {
    it("should return full definition for a feature", () => {
      const def = getUnlockDefinition("black_market");

      expect(def.id).toBe("black_market");
      expect(def.name).toBe("Black Market");
      expect(def.unlockTurn).toBe(30);
      expect(def.description).toBeTruthy();
      expect(def.unlockMessage).toBeTruthy();
    });
  });

  describe("getUpcomingUnlocks", () => {
    it("should return all features except core_mechanics at turn 1", () => {
      const upcoming = getUpcomingUnlocks(1);
      expect(upcoming.length).toBe(ALL_UNLOCK_FEATURES.length - 1);
      expect(upcoming.find(u => u.id === "core_mechanics")).toBeUndefined();
    });

    it("should return empty array after all features unlocked", () => {
      const upcoming = getUpcomingUnlocks(200);
      expect(upcoming).toEqual([]);
    });

    it("should be sorted by unlock turn", () => {
      const upcoming = getUpcomingUnlocks(1);
      for (let i = 1; i < upcoming.length; i++) {
        expect(upcoming[i]!.unlockTurn).toBeGreaterThanOrEqual(upcoming[i - 1]!.unlockTurn);
      }
    });

    it("should not include already unlocked features", () => {
      const upcoming = getUpcomingUnlocks(50);
      const upcomingIds = upcoming.map(u => u.id);

      expect(upcomingIds).not.toContain("core_mechanics");
      expect(upcomingIds).not.toContain("diplomacy_basics");
      expect(upcomingIds).not.toContain("coalitions");
      expect(upcomingIds).not.toContain("black_market");
      expect(upcomingIds).not.toContain("advanced_ships");
    });
  });

  describe("getNextUnlock", () => {
    it("should return diplomacy_basics as next unlock at turn 1", () => {
      const next = getNextUnlock(1);
      expect(next?.id).toBe("diplomacy_basics");
    });

    it("should return coalitions as next unlock at turn 10", () => {
      const next = getNextUnlock(10);
      expect(next?.id).toBe("coalitions");
    });

    it("should return undefined when all features unlocked", () => {
      const next = getNextUnlock(200);
      expect(next).toBeUndefined();
    });
  });

  describe("getUnlockProgress", () => {
    it("should return about 12-13% at turn 1 (1 of 8 features)", () => {
      const progress = getUnlockProgress(1);
      expect(progress).toBeGreaterThanOrEqual(12);
      expect(progress).toBeLessThanOrEqual(13);
    });

    it("should return 100% after all features unlocked", () => {
      const progress = getUnlockProgress(200);
      expect(progress).toBe(100);
    });

    it("should increase as turns progress", () => {
      const p10 = getUnlockProgress(10);
      const p50 = getUnlockProgress(50);
      const p100 = getUnlockProgress(100);

      expect(p50).toBeGreaterThan(p10);
      expect(p100).toBeGreaterThan(p50);
    });

    it("should return 0% before turn 1", () => {
      const progress = getUnlockProgress(0);
      expect(progress).toBe(0);
    });
  });

  describe("GAME_PHASES", () => {
    it("should have correct phase boundaries", () => {
      expect(GAME_PHASES.EXPANSION).toEqual({ start: 1, end: 30 });
      expect(GAME_PHASES.COMPETITION).toEqual({ start: 31, end: 80 });
      expect(GAME_PHASES.DOMINATION).toEqual({ start: 81, end: 150 });
      expect(GAME_PHASES.ENDGAME).toEqual({ start: 151, end: 200 });
    });
  });

  describe("getCurrentPhase", () => {
    it("should return EXPANSION for turns 1-30", () => {
      expect(getCurrentPhase(1)).toBe("EXPANSION");
      expect(getCurrentPhase(15)).toBe("EXPANSION");
      expect(getCurrentPhase(30)).toBe("EXPANSION");
    });

    it("should return COMPETITION for turns 31-80", () => {
      expect(getCurrentPhase(31)).toBe("COMPETITION");
      expect(getCurrentPhase(55)).toBe("COMPETITION");
      expect(getCurrentPhase(80)).toBe("COMPETITION");
    });

    it("should return DOMINATION for turns 81-150", () => {
      expect(getCurrentPhase(81)).toBe("DOMINATION");
      expect(getCurrentPhase(120)).toBe("DOMINATION");
      expect(getCurrentPhase(150)).toBe("DOMINATION");
    });

    it("should return ENDGAME for turns 151+", () => {
      expect(getCurrentPhase(151)).toBe("ENDGAME");
      expect(getCurrentPhase(200)).toBe("ENDGAME");
      expect(getCurrentPhase(250)).toBe("ENDGAME");
    });
  });

  describe("PHASE_NAMES", () => {
    it("should have display names for all phases", () => {
      expect(PHASE_NAMES.EXPANSION).toBe("Expansion");
      expect(PHASE_NAMES.COMPETITION).toBe("Competition");
      expect(PHASE_NAMES.DOMINATION).toBe("Domination");
      expect(PHASE_NAMES.ENDGAME).toBe("Endgame");
    });
  });

  describe("ALL_UNLOCK_FEATURES", () => {
    it("should contain all features", () => {
      expect(ALL_UNLOCK_FEATURES.length).toBe(8);
      expect(ALL_UNLOCK_FEATURES).toContain("core_mechanics");
      expect(ALL_UNLOCK_FEATURES).toContain("endgame_ultimatums");
    });
  });
});
