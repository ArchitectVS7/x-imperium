/**
 * Session Service
 *
 * Manages game sessions for campaign mode.
 * Auto-save only - NO manual save/load to prevent save-scumming.
 *
 * Sessions track:
 * - Turn ranges (start/end)
 * - Play time (started/ended timestamps)
 * - Notable events for session recaps
 */

import { db } from "@/lib/db";
import {
  games,
  gameSessions,
  empires,
  type GameSession,
  type NewGameSession,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export interface SessionStartResult {
  session: GameSession;
  isNewSession: boolean;
}

/**
 * Start or resume a session for a game.
 * If there's an active (unended) session, returns it.
 * Otherwise creates a new session.
 */
export async function startSession(gameId: string): Promise<SessionStartResult> {
  // Check for existing active session
  const activeSession = await db.query.gameSessions.findFirst({
    where: and(
      eq(gameSessions.gameId, gameId),
      // Active session has no endTurn
    ),
    orderBy: [desc(gameSessions.sessionNumber)],
  });

  // If there's an active session (no endTurn), return it
  if (activeSession && activeSession.endTurn === null) {
    return {
      session: activeSession,
      isNewSession: false,
    };
  }

  // Get game to determine session number and current turn
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  const sessionNumber = game.sessionCount + 1;

  // Create new session
  const [session] = await db
    .insert(gameSessions)
    .values({
      gameId,
      sessionNumber,
      startTurn: game.currentTurn,
    })
    .returning();

  // Update game session count
  await db
    .update(games)
    .set({
      sessionCount: sessionNumber,
      lastSessionAt: new Date(),
    })
    .where(eq(games.id, gameId));

  return {
    session: session!,
    isNewSession: true,
  };
}

/**
 * End the current session for a game.
 * Records the end turn and timestamp.
 */
export async function endSession(gameId: string): Promise<GameSession | null> {
  // Get the game's current turn
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  // Find active session
  const activeSession = await db.query.gameSessions.findFirst({
    where: and(
      eq(gameSessions.gameId, gameId),
    ),
    orderBy: [desc(gameSessions.sessionNumber)],
  });

  if (!activeSession || activeSession.endTurn !== null) {
    // No active session to end
    return null;
  }

  // End the session
  const [updatedSession] = await db
    .update(gameSessions)
    .set({
      endTurn: game.currentTurn,
      endedAt: new Date(),
    })
    .where(eq(gameSessions.id, activeSession.id))
    .returning();

  return updatedSession ?? null;
}

/**
 * Get the current active session for a game.
 */
export async function getCurrentSession(gameId: string): Promise<GameSession | null> {
  const session = await db.query.gameSessions.findFirst({
    where: eq(gameSessions.gameId, gameId),
    orderBy: [desc(gameSessions.sessionNumber)],
  });

  // Return only if it's active (no endTurn)
  if (session && session.endTurn === null) {
    return session;
  }

  return null;
}

/**
 * Get all sessions for a game.
 */
export async function getGameSessions(gameId: string): Promise<GameSession[]> {
  return db.query.gameSessions.findMany({
    where: eq(gameSessions.gameId, gameId),
    orderBy: [desc(gameSessions.sessionNumber)],
  });
}

/**
 * Record a notable event for the current session.
 * Events are stored for session recaps.
 */
export async function recordSessionEvent(
  gameId: string,
  event: string
): Promise<void> {
  const session = await getCurrentSession(gameId);
  if (!session) {
    // No active session, skip
    return;
  }

  const currentEvents = session.notableEvents ?? [];
  await db
    .update(gameSessions)
    .set({
      notableEvents: [...currentEvents, event],
    })
    .where(eq(gameSessions.id, session.id));
}

/**
 * Increment the empires eliminated count for the current session.
 */
export async function recordEmpireEliminated(gameId: string): Promise<void> {
  const session = await getCurrentSession(gameId);
  if (!session) {
    return;
  }

  await db
    .update(gameSessions)
    .set({
      empiresEliminated: session.empiresEliminated + 1,
    })
    .where(eq(gameSessions.id, session.id));
}

// =============================================================================
// SESSION SUMMARY
// =============================================================================

export interface SessionSummary {
  sessionNumber: number;
  turnsPlayed: number;
  duration: number | null; // milliseconds
  empiresEliminated: number;
  notableEvents: string[];
  startTurn: number;
  endTurn: number | null;
}

/**
 * Get a summary of a completed session.
 */
export function getSessionSummary(session: GameSession): SessionSummary {
  const turnsPlayed = session.endTurn
    ? session.endTurn - session.startTurn
    : 0;

  const duration =
    session.endedAt && session.startedAt
      ? session.endedAt.getTime() - session.startedAt.getTime()
      : null;

  return {
    sessionNumber: session.sessionNumber,
    turnsPlayed,
    duration,
    empiresEliminated: session.empiresEliminated,
    notableEvents: session.notableEvents ?? [],
    startTurn: session.startTurn,
    endTurn: session.endTurn,
  };
}

/**
 * Get summaries for all sessions in a game.
 */
export async function getAllSessionSummaries(
  gameId: string
): Promise<SessionSummary[]> {
  const sessions = await getGameSessions(gameId);
  return sessions.map(getSessionSummary);
}
