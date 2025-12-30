import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startSession,
  endSession,
  getCurrentSession,
  getGameSessions,
  recordSessionEvent,
  recordEmpireEliminated,
  getSessionSummary,
  getAllSessionSummaries,
  type SessionSummary,
} from "../session-service";
import type { GameSession } from "@/lib/db/schema";

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      gameSessions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      games: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  },
}));

import { db } from "@/lib/db";

describe("session-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startSession", () => {
    it("should create a new session when no active session exists", async () => {
      const gameId = "game-123";
      const mockGame = {
        id: gameId,
        sessionCount: 0,
        currentTurn: 1,
      };

      const mockNewSession: GameSession = {
        id: "session-1",
        gameId,
        sessionNumber: 1,
        startTurn: 1,
        endTurn: null,
        startedAt: new Date(),
        endedAt: null,
        empiresEliminated: 0,
        notableEvents: [],
      };

      // No active session
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(undefined);
      vi.mocked(db.query.games.findFirst).mockResolvedValue(mockGame as never);

      // Mock insert chain
      const mockReturning = vi.fn().mockResolvedValue([mockNewSession]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      // Mock update chain
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const result = await startSession(gameId);

      expect(result.isNewSession).toBe(true);
      expect(result.session.sessionNumber).toBe(1);
      expect(result.session.startTurn).toBe(1);
    });

    it("should return existing active session if one exists", async () => {
      const gameId = "game-123";
      const mockActiveSession: GameSession = {
        id: "session-1",
        gameId,
        sessionNumber: 1,
        startTurn: 1,
        endTurn: null, // Still active
        startedAt: new Date(),
        endedAt: null,
        empiresEliminated: 0,
        notableEvents: [],
      };

      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(
        mockActiveSession as never
      );

      const result = await startSession(gameId);

      expect(result.isNewSession).toBe(false);
      expect(result.session.id).toBe(mockActiveSession.id);
    });

    it("should increment session number for subsequent sessions", async () => {
      const gameId = "game-123";
      const mockGame = {
        id: gameId,
        sessionCount: 2, // Already had 2 sessions
        currentTurn: 50,
      };

      const mockNewSession: GameSession = {
        id: "session-3",
        gameId,
        sessionNumber: 3,
        startTurn: 50,
        endTurn: null,
        startedAt: new Date(),
        endedAt: null,
        empiresEliminated: 0,
        notableEvents: [],
      };

      // Previous session is ended
      const endedSession = { ...mockNewSession, sessionNumber: 2, endTurn: 49 };
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(
        endedSession as never
      );
      vi.mocked(db.query.games.findFirst).mockResolvedValue(mockGame as never);

      const mockReturning = vi.fn().mockResolvedValue([mockNewSession]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const result = await startSession(gameId);

      expect(result.session.sessionNumber).toBe(3);
      expect(result.session.startTurn).toBe(50);
    });
  });

  describe("endSession", () => {
    it("should end active session and record end turn", async () => {
      const gameId = "game-123";
      const mockGame = {
        id: gameId,
        currentTurn: 25,
      };

      const mockActiveSession: GameSession = {
        id: "session-1",
        gameId,
        sessionNumber: 1,
        startTurn: 1,
        endTurn: null,
        startedAt: new Date(),
        endedAt: null,
        empiresEliminated: 3,
        notableEvents: ["Empire X eliminated"],
      };

      const mockEndedSession: GameSession = {
        ...mockActiveSession,
        endTurn: 25,
        endedAt: new Date(),
      };

      vi.mocked(db.query.games.findFirst).mockResolvedValue(mockGame as never);
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(
        mockActiveSession as never
      );

      const mockReturning = vi.fn().mockResolvedValue([mockEndedSession]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const result = await endSession(gameId);

      expect(result).not.toBeNull();
      expect(result?.endTurn).toBe(25);
    });

    it("should return null when no active session exists", async () => {
      const gameId = "game-123";
      const mockGame = { id: gameId, currentTurn: 10 };

      vi.mocked(db.query.games.findFirst).mockResolvedValue(mockGame as never);
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(undefined);

      const result = await endSession(gameId);

      expect(result).toBeNull();
    });
  });

  describe("getSessionSummary", () => {
    it("should calculate correct summary for completed session", () => {
      const startTime = new Date("2025-01-01T10:00:00Z");
      const endTime = new Date("2025-01-01T12:30:00Z");

      const session: GameSession = {
        id: "session-1",
        gameId: "game-123",
        sessionNumber: 1,
        startTurn: 1,
        endTurn: 30,
        startedAt: startTime,
        endedAt: endTime,
        empiresEliminated: 5,
        notableEvents: ["Player won battle", "Empire X eliminated"],
      };

      const summary = getSessionSummary(session);

      expect(summary.sessionNumber).toBe(1);
      expect(summary.turnsPlayed).toBe(29); // 30 - 1
      expect(summary.duration).toBe(9000000); // 2.5 hours in ms
      expect(summary.empiresEliminated).toBe(5);
      expect(summary.notableEvents).toHaveLength(2);
    });

    it("should handle ongoing session (no end turn)", () => {
      const session: GameSession = {
        id: "session-1",
        gameId: "game-123",
        sessionNumber: 1,
        startTurn: 1,
        endTurn: null,
        startedAt: new Date(),
        endedAt: null,
        empiresEliminated: 2,
        notableEvents: [],
      };

      const summary = getSessionSummary(session);

      expect(summary.turnsPlayed).toBe(0);
      expect(summary.duration).toBeNull();
      expect(summary.endTurn).toBeNull();
    });
  });
});
