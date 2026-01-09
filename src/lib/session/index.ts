import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "./config";

/**
 * Get the current session from cookies.
 * Session data is cryptographically signed and cannot be tampered with.
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Set game session data.
 */
export async function setGameSession(gameId: string, empireId: string) {
  const session = await getSession();
  session.gameId = gameId;
  session.empireId = empireId;
  await session.save();
}

/**
 * Get game session data.
 */
export async function getGameSession(): Promise<{ gameId?: string; empireId?: string }> {
  const session = await getSession();
  return {
    gameId: session.gameId,
    empireId: session.empireId,
  };
}

/**
 * Clear game session.
 */
export async function clearGameSession() {
  const session = await getSession();
  session.destroy();
}

/**
 * Get or create rate limit identifier from session.
 */
export async function getRateLimitIdentifier(): Promise<string> {
  const session = await getSession();

  if (session.empireId) {
    return session.empireId;
  }

  if (!session.rateLimitId) {
    session.rateLimitId = crypto.randomUUID();
    await session.save();
  }

  return session.rateLimitId;
}

// Re-export types
export type { SessionData } from "./config";
