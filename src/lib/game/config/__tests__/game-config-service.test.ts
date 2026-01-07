/**
 * Tests for Game Configuration Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock server-only before importing the service
vi.mock("server-only", () => ({}));

import {
  loadGameConfig,
  setGameConfigOverride,
  clearGameConfigOverride,
  hasGameConfigOverrides,
  getAllGameConfigOverrides,
} from "../game-config-service";
import type { ConfigType } from "../game-config-service";

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  gameConfigs: {
    gameId: "game_id",
    configType: "config_type",
    overrides: "overrides",
    id: "id",
  },
}));

import { db } from "@/lib/db";

describe("Game Config Service", () => {
  const mockGameId = "test-game-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadGameConfig", () => {
    it("should load default combat config when no overrides exist", async () => {
      // Mock empty database response
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom.mockReturnValue({
          where: mockWhere.mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      const config = await loadGameConfig(mockGameId, "combat");

      expect(config).toBeDefined();
      expect(config).toHaveProperty("unified");
      expect(config).toHaveProperty("legacy");
    });

    it("should merge overrides with default config", async () => {
      const overrides = {
        unified: {
          defenderBonus: 1.25,
        },
      };

      // Mock database response with overrides
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([
        {
          configType: "combat",
          overrides,
        },
      ]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom.mockReturnValue({
          where: mockWhere.mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      const config = await loadGameConfig<{ unified: { defenderBonus: number } }>(
        mockGameId,
        "combat"
      );

      // Verify override was applied
      expect(config.unified.defenderBonus).toBe(1.25);
    });

    it("should load unit stats config", async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      const config = await loadGameConfig(mockGameId, "units");

      expect(config).toBeDefined();
      expect(config).toHaveProperty("soldiers");
      expect(config).toHaveProperty("fighters");
    });

    it("should load archetype configs", async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      const config = await loadGameConfig(mockGameId, "archetypes");

      expect(config).toBeDefined();
      expect(config).toHaveProperty("warlord");
      expect(config).toHaveProperty("diplomat");
    });
  });

  describe("setGameConfigOverride", () => {
    it("should insert new override when none exists", async () => {
      const mockValues = vi.fn().mockResolvedValue(undefined);

      // Mock select returning empty (no existing override)
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: mockValues,
      });

      const overrides = { unified: { defenderBonus: 1.25 } };
      await setGameConfigOverride(mockGameId, "combat", overrides);

      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        gameId: mockGameId,
        configType: "combat",
        overrides,
      });
    });

    it("should update existing override", async () => {
      const existingId = "existing-config-id";
      const mockSet = vi.fn();
      const mockWhere = vi.fn().mockResolvedValue(undefined);

      // Mock select returning existing override
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: existingId }]),
          }),
        }),
      });

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: mockSet.mockReturnValue({
          where: mockWhere,
        }),
      });

      const overrides = { unified: { defenderBonus: 1.30 } };
      await setGameConfigOverride(mockGameId, "combat", overrides);

      expect(db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ overrides });
    });
  });

  describe("clearGameConfigOverride", () => {
    it("should delete game config override", async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: mockWhere,
      });

      await clearGameConfigOverride(mockGameId, "combat");

      expect(db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("hasGameConfigOverrides", () => {
    it("should return true when overrides exist", async () => {
      // Mock database returning overrides
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "some-id" }]),
          }),
        }),
      });

      const result = await hasGameConfigOverrides(mockGameId);
      expect(result).toBe(true);
    });

    it("should return false when no overrides exist", async () => {
      // Mock database returning empty
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await hasGameConfigOverrides(mockGameId);
      expect(result).toBe(false);
    });
  });

  describe("getAllGameConfigOverrides", () => {
    it("should return all overrides for a game", async () => {
      const mockOverrides = [
        {
          configType: "combat" as ConfigType,
          overrides: { unified: { defenderBonus: 1.25 } },
        },
        {
          configType: "units" as ConfigType,
          overrides: { soldiers: { cost: { credits: 50 } } },
        },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockOverrides),
        }),
      });

      const result = await getAllGameConfigOverrides(mockGameId);

      expect(result.combat).toEqual({ unified: { defenderBonus: 1.25 } });
      expect(result.units).toEqual({ soldiers: { cost: { credits: 50 } } });
      expect(result.archetypes).toBeNull();
      expect(result.resources).toBeNull();
      expect(result.victory).toBeNull();
    });

    it("should return all nulls when no overrides exist", async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await getAllGameConfigOverrides(mockGameId);

      expect(result.combat).toBeNull();
      expect(result.units).toBeNull();
      expect(result.archetypes).toBeNull();
      expect(result.resources).toBeNull();
      expect(result.victory).toBeNull();
    });
  });

  describe("Deep merge behavior", () => {
    it("should deeply merge nested overrides", async () => {
      const overrides = {
        unified: {
          defenderBonus: 1.25, // Override this
          // powerMultipliers should remain from default
        },
        // legacy should remain from default
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                configType: "combat",
                overrides,
              },
            ]),
          }),
        }),
      });

      const config = await loadGameConfig<{
        unified: { defenderBonus: number; powerMultipliers: Record<string, number> };
        legacy: unknown;
      }>(mockGameId, "combat");

      // Verify override was applied
      expect(config.unified.defenderBonus).toBe(1.25);

      // Verify other fields remain from default
      expect(config.unified.powerMultipliers).toBeDefined();
      expect(config.legacy).toBeDefined();
    });

    it("should override arrays completely (not merge)", async () => {
      const overrides = {
        someArray: [1, 2, 3], // Should replace default entirely
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                configType: "resources",
                overrides,
              },
            ]),
          }),
        }),
      });

      const config = await loadGameConfig<{ someArray: number[] }>(
        mockGameId,
        "resources"
      );

      expect(config.someArray).toEqual([1, 2, 3]);
    });
  });
});
