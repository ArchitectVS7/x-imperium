"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  startNewGame,
  getDashboardData,
  type DashboardData,
} from "@/lib/game/repositories/game-repository";
import { getResumableGames, getLatestSave } from "@/lib/game/services/save-service";
import { db } from "@/lib/db";
import type { Difficulty } from "@/lib/bots/types";

// =============================================================================
// COOKIE HELPERS
// =============================================================================

const GAME_ID_COOKIE = "gameId";
const EMPIRE_ID_COOKIE = "empireId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function setGameCookies(gameId: string, empireId: string) {
  const cookieStore = await cookies();
  cookieStore.set(GAME_ID_COOKIE, gameId, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookieStore.set(EMPIRE_ID_COOKIE, empireId, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

async function getGameCookies(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    gameId: cookieStore.get(GAME_ID_COOKIE)?.value,
    empireId: cookieStore.get(EMPIRE_ID_COOKIE)?.value,
  };
}

async function clearGameCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(GAME_ID_COOKIE);
  cookieStore.delete(EMPIRE_ID_COOKIE);
}

// =============================================================================
// GAME ACTIONS
// =============================================================================

export interface StartGameResult {
  success: boolean;
  error?: string;
  gameId?: string;
  empireId?: string;
  botCount?: number;
  difficulty?: Difficulty;
}

/**
 * Start a new game with the given empire name and difficulty.
 * Sets cookies for game and empire IDs, then redirects to the game dashboard.
 * Creates 25 bot empires with random decision-making (M5).
 */
export async function startGameAction(formData: FormData): Promise<StartGameResult> {
  const empireName = formData.get("empireName") as string;
  const difficultyRaw = formData.get("difficulty") as string | null;

  // Validate difficulty
  const validDifficulties: Difficulty[] = ["easy", "normal", "hard", "nightmare"];
  const difficulty: Difficulty = validDifficulties.includes(difficultyRaw as Difficulty)
    ? (difficultyRaw as Difficulty)
    : "normal";

  if (!empireName || empireName.trim().length === 0) {
    return { success: false, error: "Empire name is required" };
  }

  if (empireName.length > 100) {
    return { success: false, error: "Empire name must be 100 characters or less" };
  }

  try {
    const { game, empire, bots } = await startNewGame(
      "New Game",
      empireName.trim(),
      undefined,
      difficulty,
      25 // Default bot count
    );

    await setGameCookies(game.id, empire.id);

    // Note: We don't redirect here because we want the client to handle it
    return {
      success: true,
      gameId: game.id,
      empireId: empire.id,
      botCount: bots.length,
      difficulty,
    };
  } catch (error) {
    console.error("Failed to start game:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start game",
    };
  }
}

/**
 * Fetch dashboard data for the current player's empire.
 */
export async function fetchDashboardDataAction(): Promise<DashboardData | null> {
  const { empireId } = await getGameCookies();

  if (!empireId) {
    return null;
  }

  try {
    return await getDashboardData(empireId);
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return null;
  }
}

/**
 * Check if there's an active game.
 */
export async function hasActiveGameAction(): Promise<boolean> {
  const { gameId, empireId } = await getGameCookies();
  return !!(gameId && empireId);
}

/**
 * Get the current game and empire IDs.
 */
export async function getCurrentGameAction(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  return getGameCookies();
}

/**
 * End the current game and clear cookies.
 */
export async function endGameAction(): Promise<void> {
  await clearGameCookies();
  redirect("/");
}

// =============================================================================
// RESUME GAME ACTIONS
// =============================================================================

export interface ResumableGame {
  gameId: string;
  gameName: string;
  empireName: string;
  empireId: string;
  turn: number;
  savedAt: Date;
  status: string;
}

/**
 * Get list of games that can be resumed (have saves and are still active).
 */
export async function getResumableGamesAction(): Promise<ResumableGame[]> {
  try {
    return await getResumableGames();
  } catch (error) {
    console.error("Failed to get resumable games:", error);
    return [];
  }
}

export interface ResumeGameResult {
  success: boolean;
  error?: string;
  gameId?: string;
  empireId?: string;
}

/**
 * Resume a saved game by setting cookies and returning game info.
 */
export async function resumeGameAction(gameId: string): Promise<ResumeGameResult> {
  try {
    // Get the latest save to verify it exists
    const save = await getLatestSave(gameId);
    if (!save) {
      return { success: false, error: "No save found for this game" };
    }

    // Find the player empire for this game
    const playerEmpire = await db.query.empires.findFirst({
      where: (e, { and, eq }) => and(
        eq(e.gameId, gameId),
        eq(e.type, "player")
      ),
    });

    if (!playerEmpire) {
      return { success: false, error: "No player empire found for this game" };
    }

    // Set cookies for the resumed game
    await setGameCookies(gameId, playerEmpire.id);

    return {
      success: true,
      gameId,
      empireId: playerEmpire.id,
    };
  } catch (error) {
    console.error("Failed to resume game:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resume game",
    };
  }
}

/**
 * Get the game result (victory/defeat status) for a completed game.
 */
export async function getGameResultAction(): Promise<{
  success: boolean;
  result?: {
    status: string;
    winnerId: string | null;
    winnerName: string | null;
    victoryType: string | null;
    turn: number;
    playerEmpireName: string;
    playerDefeated: boolean;
    defeatType: string | null;
  };
  error?: string;
}> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return { success: false, error: "No active game" };
  }

  try {
    const game = await db.query.games.findFirst({
      where: (g, { eq }) => eq(g.id, gameId),
      with: {
        empires: {
          with: {
            planets: true,
          },
        },
      },
    });

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const playerEmpire = game.empires.find((e) => e.id === empireId);

    if (!playerEmpire) {
      return { success: false, error: "Empire not found" };
    }

    // Find the winner (highest networth active empire) if game is completed
    let winnerId: string | null = null;
    let winnerName: string | null = null;
    let victoryType: string | null = null;

    if (game.status === "completed") {
      // Find empires with planets (still alive)
      const activeEmpires = game.empires.filter(
        (e) => e.planets.length > 0
      );

      if (activeEmpires.length > 0) {
        // Sort by networth (credits + planets as proxy)
        const sorted = activeEmpires.sort(
          (a, b) => b.credits - a.credits
        );
        const winner = sorted[0];
        if (winner) {
          winnerId = winner.id;
          winnerName = winner.name;

          // Determine victory type based on game state
          const totalPlanets = game.empires.reduce(
            (sum, e) => sum + e.planets.length,
            0
          );
          const winnerPlanets = winner.planets.length;

          if (winnerPlanets / totalPlanets >= 0.6) {
            victoryType = "conquest";
          } else if (game.currentTurn >= 200) {
            victoryType = "survival";
          } else {
            victoryType = "economic";
          }
        }
      }
    }

    // Determine if player was defeated based on game state
    // Player is defeated if they have 0 planets or negative credits
    const playerDefeated =
      playerEmpire.planets.length === 0 || playerEmpire.credits < 0;
    let defeatType: string | null = null;
    if (playerDefeated) {
      // Check defeat reason based on empire state
      if (playerEmpire.planets.length === 0) {
        defeatType = "elimination";
      } else if (playerEmpire.credits < 0) {
        defeatType = "bankruptcy";
      } else {
        defeatType = "civil_collapse";
      }
    }

    return {
      success: true,
      result: {
        status: game.status,
        winnerId,
        winnerName,
        victoryType,
        turn: game.currentTurn,
        playerEmpireName: playerEmpire.name,
        playerDefeated,
        defeatType,
      },
    };
  } catch (error) {
    console.error("Failed to get game result:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get game result",
    };
  }
}
