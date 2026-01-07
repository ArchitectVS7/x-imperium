/**
 * useGameStateStream Hook
 *
 * Provides real-time game state updates via Server-Sent Events (SSE).
 * Falls back to polling if SSE is not available or fails.
 *
 * @example
 * ```tsx
 * const { isConnected, lastUpdate, error } = useGameStateStream({
 *   gameId: 'xxx',
 *   empireId: 'yyy',
 *   onUpdate: (data) => setLayoutData(data),
 *   enabled: true,
 * });
 * ```
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface GameStateUpdate {
  currentTurn: number;
  turnLimit: number;
  gameStatus: string;
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  population: number;
  networth: number;
  timestamp: number;
}

interface UseGameStateStreamOptions {
  gameId: string | null;
  empireId: string | null;
  onUpdate?: (data: GameStateUpdate) => void;
  onGameEnded?: (status: string, finalTurn: number) => void;
  enabled?: boolean;
  fallbackPollingInterval?: number;
}

interface UseGameStateStreamResult {
  isConnected: boolean;
  lastUpdate: GameStateUpdate | null;
  error: string | null;
  reconnect: () => void;
}

// Reconnection delay with exponential backoff
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useGameStateStream({
  gameId,
  empireId,
  onUpdate,
  onGameEnded,
  enabled = true,
  fallbackPollingInterval = 30000,
}: UseGameStateStreamOptions): UseGameStateStreamResult {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<GameStateUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
      MAX_RECONNECT_DELAY_MS
    );
    return delay;
  }, []);

  // Start fallback polling
  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) return;

    console.log("[SSE] Starting fallback polling");

    fallbackIntervalRef.current = setInterval(async () => {
      try {
        // Fallback: Call the layout data action directly
        // This would need to be imported from the actions file
        // For now, we'll trigger a custom event that GameShell can listen to
        window.dispatchEvent(new CustomEvent("game-state-poll-needed"));
      } catch (err) {
        console.error("[SSE] Fallback polling error:", err);
      }
    }, fallbackPollingInterval);
  }, [fallbackPollingInterval]);

  // Stop fallback polling
  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!gameId || !empireId || !enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/game/stream?gameId=${encodeURIComponent(gameId)}&empireId=${encodeURIComponent(empireId)}`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", () => {
        console.log("[SSE] Connected to game state stream");
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        stopFallbackPolling();
      });

      eventSource.addEventListener("gameStateUpdate", (event) => {
        try {
          const data = JSON.parse(event.data) as GameStateUpdate;
          setLastUpdate(data);
          onUpdate?.(data);
        } catch (err) {
          console.error("[SSE] Failed to parse game state update:", err);
        }
      });

      eventSource.addEventListener("gameEnded", (event) => {
        try {
          const data = JSON.parse(event.data);
          onGameEnded?.(data.status, data.finalTurn);
        } catch (err) {
          console.error("[SSE] Failed to parse game ended event:", err);
        }
      });

      eventSource.addEventListener("heartbeat", () => {
        // Heartbeat received - connection is healthy
      });

      eventSource.addEventListener("error", () => {
        console.error("[SSE] Connection error");
        setIsConnected(false);

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptRef.current++;
          const delay = getReconnectDelay();
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError("Failed to connect to game state stream. Using polling fallback.");
          startFallbackPolling();
        }
      });

      eventSource.onerror = () => {
        // Error handled by the error event listener
      };
    } catch (err) {
      console.error("[SSE] Failed to create EventSource:", err);
      setError("SSE not supported. Using polling fallback.");
      startFallbackPolling();
    }
  }, [gameId, empireId, enabled, onUpdate, onGameEnded, getReconnectDelay, startFallbackPolling, stopFallbackPolling]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setError(null);
    stopFallbackPolling();
    connect();
  }, [connect, stopFallbackPolling]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && gameId && empireId) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stopFallbackPolling();
    };
  }, [enabled, gameId, empireId, connect, stopFallbackPolling]);

  return {
    isConnected,
    lastUpdate,
    error,
    reconnect,
  };
}

export default useGameStateStream;
