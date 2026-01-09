"use server";

import { redirect } from "next/navigation";
import {
  startNewGame,
  getDashboardData,
  type DashboardData,
} from "@/lib/game/repositories/game-repository";
import { getResumableGames, getLatestSave, startSession, endSession } from "@/lib/game/services/core";
import { db } from "@/lib/db";
import type { Difficulty } from "@/lib/bots/types";
import { triggerGreetings, type TriggerContext } from "@/lib/messages";
import { GAME_MODE_PRESETS, type GameMode } from "@/lib/game/constants";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import {
  setGameSession,
  getGameSession,
  clearGameSession,
  getRateLimitIdentifier,
} from "@/lib/session";

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
  gameMode?: GameMode;
}

/**
 * Start a new game with the given empire name and difficulty.
 * Sets session for game and empire IDs, then redirects to the game dashboard.
 * Creates 25 bot empires with random decision-making (M5).
 */
export async function startGameAction(formData: FormData): Promise<StartGameResult> {
  // Rate limit check for auth-like actions
  const identifier = await getRateLimitIdentifier();
  const rateLimitResult = checkRateLimit(identifier, "AUTH_ACTION");
  if (!rateLimitResult.allowed) {
    const waitSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many attempts. Please wait ${waitSeconds} seconds before trying again.`,
    };
  }

  const empireName = formData.get("empireName") as string;
  const difficultyRaw = formData.get("difficulty") as string | null;
  const botCountRaw = formData.get("botCount") as string | null;
  const gameModeRaw = formData.get("gameMode") as string | null;

  // Validate game mode
  const validGameModes: GameMode[] = ["oneshot", "campaign"];
  const gameMode: GameMode = validGameModes.includes(gameModeRaw as GameMode)
    ? (gameModeRaw as GameMode)
    : "oneshot";

  // Get preset for selected game mode
  const preset = GAME_MODE_PRESETS[gameMode];

  // Validate difficulty
  const validDifficulties: Difficulty[] = ["easy", "normal", "hard", "nightmare"];
  const difficulty: Difficulty = validDifficulties.includes(difficultyRaw as Difficulty)
    ? (difficultyRaw as Difficulty)
    : "normal";

  // Validate bot count against game mode constraints
  const botCountNum = parseInt(botCountRaw ?? String(preset.defaultBots), 10);
  const botCount = Math.min(Math.max(botCountNum, preset.minBots), preset.maxBots);

  if (!empireName || empireName.trim().length === 0) {
    return { success: false, error: "Empire name is required" };
  }

  if (empireName.length > 100) {
    return { success: false, error: "Empire name must be 100 characters or less" };
  }

  try {
    // Auto-generate game name from empire name + timestamp
    const gameName = `${empireName.trim()}'s Galaxy`;

    const { game, empire, bots } = await startNewGame(
      gameName,
      empireName.trim(),
      undefined,
      difficulty,
      botCount,
      gameMode
    );

    await setGameSession(game.id, empire.id);

    // Start session tracking for campaign games
    if (gameMode === "campaign") {
      await startSession(game.id);
    }

    // Trigger greeting messages from bots (M8)
    const msgCtx: TriggerContext = {
      gameId: game.id,
      currentTurn: 1,
      playerId: empire.id,
      playerEmpireName: empire.name,
    };
    await triggerGreetings(msgCtx);

    // Note: We don't redirect here because we want the client to handle it
    return {
      success: true,
      gameId: game.id,
      empireId: empire.id,
      botCount: bots.length,
      difficulty,
      gameMode,
    };
  } catch (error) {
    console.error("Failed to start game:", error);
    // Don't expose raw database errors to users
    const errorMessage = error instanceof Error && error.message.includes("database")
      ? "Unable to connect to game server. Please try again later."
      : error instanceof Error && error.message.length < 100 && !error.message.includes("query")
        ? error.message
        : "Failed to start game. Please try again.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fetch dashboard data for the current player's empire.
 */
export async function fetchDashboardDataAction(): Promise<DashboardData | null> {
  const { empireId } = await getGameSession();

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
  const { gameId, empireId } = await getGameSession();
  return !!(gameId && empireId);
}

/**
 * Get the current game and empire IDs.
 */
export async function getCurrentGameAction(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  const session = await getGameSession();
  return {
    gameId: session.gameId,
    empireId: session.empireId,
  };
}

/**
 * End the current game and clear session.
 * Ends any active session before clearing.
 */
export async function endGameAction(): Promise<void> {
  const { gameId } = await getGameSession();

  // End active session if exists
  if (gameId) {
    await endSession(gameId);
  }

  await clearGameSession();
  redirect("/");
}

// =============================================================================
// CAMPAIGN RESUME ACTIONS
// =============================================================================

export interface ResumableCampaign {
  gameId: string;
  gameName: string;
  empireName: string;
  empireId: string;
  currentTurn: number;
  turnLimit: number;
  sessionCount: number;
  lastSessionAt: Date | null;
  empireCount: number;
  playerNetworth: number;
}

/**
 * Get resumable campaign games.
 * Returns campaigns that are still active (not completed).
 */
export async function getResumableCampaignsAction(): Promise<ResumableCampaign[]> {
  try {
    // Find all active campaign games
    const campaigns = await db.query.games.findMany({
      where: (g, { and, eq }) => and(
        eq(g.gameMode, "campaign"),
        eq(g.status, "active")
      ),
      with: {
        empires: {
          columns: {
            id: true,
            name: true,
            type: true,
            credits: true,
          },
          with: {
            sectors: {
              columns: { id: true },
            },
          },
        },
      },
    });

    return campaigns.map((game) => {
      const playerEmpire = game.empires.find((e) => e.type === "player");
      const activeEmpires = game.empires.filter((e) => e.sectors.length > 0);

      return {
        gameId: game.id,
        gameName: game.name,
        empireName: playerEmpire?.name ?? "Unknown",
        empireId: playerEmpire?.id ?? "",
        currentTurn: game.currentTurn,
        turnLimit: game.turnLimit,
        sessionCount: game.sessionCount,
        lastSessionAt: game.lastSessionAt,
        empireCount: activeEmpires.length,
        playerNetworth: playerEmpire?.credits ?? 0,
      };
    });
  } catch (error) {
    console.error("Failed to get resumable campaigns:", error);
    return [];
  }
}

/**
 * Resume a campaign game by setting session.
 */
export async function resumeCampaignAction(gameId: string): Promise<ResumeGameResult> {
  // Rate limit check for auth-like actions
  const identifier = await getRateLimitIdentifier();
  const rateLimitResult = checkRateLimit(identifier, "AUTH_ACTION");
  if (!rateLimitResult.allowed) {
    const waitSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many attempts. Please wait ${waitSeconds} seconds before trying again.`,
    };
  }

  try {
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

    // Set session for the resumed game
    await setGameSession(gameId, playerEmpire.id);

    // Start/resume session tracking for campaign
    await startSession(gameId);

    return {
      success: true,
      gameId,
      empireId: playerEmpire.id,
    };
  } catch (error) {
    console.error("Failed to resume campaign:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resume campaign",
    };
  }
}

// =============================================================================
// RESUME GAME ACTIONS (LEGACY)
// These functions supported the multi-galaxy feature which has been removed
// to simplify onboarding. Kept for potential future use.
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
 * @deprecated Multi-galaxy feature removed. Single active game per session.
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
 * Resume a saved game by setting session and returning game info.
 * @deprecated Multi-galaxy feature removed. Single active game per session.
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

    // Set session for the resumed game
    await setGameSession(gameId, playerEmpire.id);

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
  const { gameId, empireId } = await getGameSession();

  if (!gameId || !empireId) {
    return { success: false, error: "No active game" };
  }

  try {
    const game = await db.query.games.findFirst({
      where: (g, { eq }) => eq(g.id, gameId),
      with: {
        empires: {
          with: {
            sectors: true,
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
      // Find empires with sectors (still alive)
      const activeEmpires = game.empires.filter(
        (e) => e.sectors.length > 0
      );

      if (activeEmpires.length > 0) {
        // Sort by networth (credits + sectors as proxy)
        const sorted = activeEmpires.sort(
          (a, b) => b.credits - a.credits
        );
        const winner = sorted[0];
        if (winner) {
          winnerId = winner.id;
          winnerName = winner.name;

          // Determine victory type based on game state
          const totalSectors = game.empires.reduce(
            (sum, e) => sum + e.sectors.length,
            0
          );
          const winnerSectors = winner.sectors.length;

          if (winnerSectors / totalSectors >= 0.6) {
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
    // Player is defeated if they have 0 sectors or negative credits
    const playerDefeated =
      playerEmpire.sectors.length === 0 || playerEmpire.credits < 0;
    let defeatType: string | null = null;
    if (playerDefeated) {
      // Check defeat reason based on empire state
      if (playerEmpire.sectors.length === 0) {
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
