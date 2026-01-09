/**
 * Server-Sent Events (SSE) Stream API
 *
 * Provides real-time game state updates to connected clients.
 * Replaces 30-second polling for better performance and lower latency.
 *
 * Features:
 * - Heartbeat every 15 seconds to keep connection alive
 * - Game state updates when state version changes
 * - Automatic cleanup on client disconnect
 *
 * Client usage:
 * const eventSource = new EventSource('/api/game/stream?gameId=xxx&empireId=yyy');
 * eventSource.onmessage = (event) => { const data = JSON.parse(event.data); };
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { games, empires } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyEmpireOwnership } from "@/lib/security/validation";
import { getGameSession } from "@/lib/session";

// Heartbeat interval (15 seconds)
const HEARTBEAT_INTERVAL_MS = 15000;

// State check interval (5 seconds) - checks if game state changed
const STATE_CHECK_INTERVAL_MS = 5000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get("gameId");
  const empireId = searchParams.get("empireId");

  // Validate required parameters
  if (!gameId || !empireId) {
    return new Response("Missing gameId or empireId", { status: 400 });
  }

  // SECURITY: Verify request matches authenticated session
  const session = await getGameSession();
  const sessionGameId = session.gameId;
  const sessionEmpireId = session.empireId;

  if (gameId !== sessionGameId || empireId !== sessionEmpireId) {
    return new Response("Unauthorized - session mismatch", { status: 401 });
  }

  // SECURITY: Verify ownership via auth system
  const ownership = await verifyEmpireOwnership(empireId, gameId);
  if (!ownership.valid) {
    return new Response(ownership.error ?? "Unauthorized", { status: 403 });
  }

  // Verify game and empire exist
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  const empire = await db.query.empires.findFirst({
    where: and(eq(empires.id, empireId), eq(empires.gameId, gameId)),
  });

  if (!game || !empire) {
    return new Response("Game or empire not found", { status: 404 });
  }

  // Track the last known state version for change detection
  let lastTurn = game.currentTurn;
  let lastUpdatedAt = game.updatedAt?.getTime() ?? 0;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE message
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial connection message
      sendEvent("connected", {
        gameId,
        empireId,
        currentTurn: game.currentTurn,
        timestamp: Date.now(),
      });

      // Heartbeat interval to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          sendEvent("heartbeat", { timestamp: Date.now() });
        } catch {
          // Connection closed, will be cleaned up
        }
      }, HEARTBEAT_INTERVAL_MS);

      // State check interval to detect game state changes
      const stateCheckInterval = setInterval(async () => {
        try {
          const currentGame = await db.query.games.findFirst({
            where: eq(games.id, gameId),
          });

          if (!currentGame) {
            sendEvent("error", { message: "Game not found" });
            return;
          }

          const currentUpdatedAt = currentGame.updatedAt?.getTime() ?? 0;

          // Check if game state has changed
          if (
            currentGame.currentTurn !== lastTurn ||
            currentUpdatedAt > lastUpdatedAt
          ) {
            lastTurn = currentGame.currentTurn;
            lastUpdatedAt = currentUpdatedAt;

            // Fetch updated empire data
            const updatedEmpire = await db.query.empires.findFirst({
              where: and(eq(empires.id, empireId), eq(empires.gameId, gameId)),
            });

            if (updatedEmpire) {
              sendEvent("gameStateUpdate", {
                currentTurn: currentGame.currentTurn,
                turnLimit: currentGame.turnLimit,
                gameStatus: currentGame.status,
                credits: updatedEmpire.credits,
                food: updatedEmpire.food,
                ore: updatedEmpire.ore ?? 0,
                petroleum: updatedEmpire.petroleum ?? 0,
                population: updatedEmpire.population,
                networth: updatedEmpire.networth,
                timestamp: Date.now(),
              });
            }
          }

          // Check if game ended
          if (currentGame.status !== "active") {
            sendEvent("gameEnded", {
              status: currentGame.status,
              finalTurn: currentGame.currentTurn,
            });
          }
        } catch (error) {
          console.error("SSE state check error:", error);
        }
      }, STATE_CHECK_INTERVAL_MS);

      // Cleanup function when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        clearInterval(stateCheckInterval);
        controller.close();
      });
    },
  });

  // Return SSE response with appropriate headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
