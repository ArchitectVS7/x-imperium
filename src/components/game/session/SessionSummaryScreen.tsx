"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getSessionDataAction,
  type SessionData,
  type EmpireRanking,
} from "@/app/actions/session-actions";
import { type SessionEvent } from "@/lib/game/services/session-service";

// =============================================================================
// TYPES
// =============================================================================

interface SessionSummaryScreenProps {
  onContinue: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format milliseconds into a readable duration string.
 */
function formatDuration(ms: number | null): string {
  if (!ms) return "Unknown";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get icon for event type.
 */
function getEventIcon(type: string): string {
  switch (type) {
    case "elimination":
      return "💀";
    case "combat_victory":
      return "⚔️";
    case "combat_defeat":
      return "🛡️";
    case "alliance_formed":
      return "🤝";
    case "alliance_broken":
      return "💔";
    case "boss_emergence":
      return "👑";
    case "milestone":
      return "🎯";
    case "turn_start":
      return "🔄";
    default:
      return "📌";
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({
  label,
  value,
  icon,
  color = "text-lcars-amber",
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
    </div>
  );
}

function EventRow({ event }: { event: SessionEvent }) {
  return (
    <div
      className="flex items-start gap-3 p-2 rounded bg-gray-900/30 hover:bg-gray-900/50 transition-colors"
      data-testid={`session-event-${event.type}`}
    >
      <span className="text-xl flex-shrink-0">{getEventIcon(event.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200">{event.description}</div>
        {event.turn > 0 && (
          <div className="text-xs text-gray-500 mt-0.5">Turn {event.turn}</div>
        )}
      </div>
    </div>
  );
}

function RankingRow({
  rank,
  empire,
  isCurrentPlayer,
}: {
  rank: number;
  empire: EmpireRanking;
  isCurrentPlayer: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded transition-colors",
        isCurrentPlayer && "bg-blue-900/30 border border-blue-700",
        !isCurrentPlayer && "bg-gray-900/30",
        empire.isEliminated && "opacity-50"
      )}
      data-testid={`empire-rank-${rank}`}
    >
      <div
        className={cn(
          "text-lg font-bold w-8 text-center flex-shrink-0",
          rank === 1 && "text-yellow-400",
          rank === 2 && "text-gray-400",
          rank === 3 && "text-orange-600",
          rank > 3 && "text-gray-500"
        )}
      >
        {rank === 1 && "🥇"}
        {rank === 2 && "🥈"}
        {rank === 3 && "🥉"}
        {rank > 3 && `#${rank}`}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium truncate", isCurrentPlayer && "text-blue-400")}>
            {empire.name}
          </span>
          {isCurrentPlayer && (
            <span className="text-xs bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded">
              YOU
            </span>
          )}
          {empire.isEliminated && (
            <span className="text-xs bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded">
              ELIMINATED
            </span>
          )}
        </div>
        {empire.emperorName && (
          <div className="text-xs text-gray-500">{empire.emperorName}</div>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-mono text-lcars-amber">
          {empire.networth.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">{empire.sectorCount} sectors</div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SessionSummaryScreen({ onContinue }: SessionSummaryScreenProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessionData() {
      try {
        const data = await getSessionDataAction();
        if (data) {
          setSessionData(data);
          setError(null);
        } else {
          setError("Failed to load session data");
        }
      } catch (err) {
        setError("Failed to load session data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSessionData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading session summary...</div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || "No session data available"}</div>
          <button
            onClick={onContinue}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    );
  }

  const { summary, empireRankings, currentTurn } = sessionData;
  const playerEmpireId = empireRankings.find((e) => e.isPlayer)?.id;

  return (
    <div
      className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8"
      data-testid="session-summary-screen"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-lcars-amber mb-2">
            Session #{summary.sessionNumber} Complete
          </h1>
          <div className="text-lg text-gray-400">
            Turns {summary.startTurn} - {summary.endTurn ?? currentTurn}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Turns Played"
            value={summary.turnsPlayed}
            icon="🔄"
            color="text-lcars-amber"
          />
          <StatCard
            label="Duration"
            value={formatDuration(summary.duration)}
            icon="⏱️"
            color="text-blue-400"
          />
          <StatCard
            label="Eliminations"
            value={summary.empiresEliminated}
            icon="💀"
            color="text-red-400"
          />
          <StatCard
            label="Current Turn"
            value={currentTurn}
            icon="📍"
            color="text-green-400"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Power Rankings */}
          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-lcars-lavender mb-4 flex items-center gap-2">
              <span>👑</span>
              Power Rankings
            </h2>
            <div className="space-y-2">
              {empireRankings.map((empire, index) => (
                <RankingRow
                  key={empire.id}
                  rank={index + 1}
                  empire={empire}
                  isCurrentPlayer={empire.id === playerEmpireId}
                />
              ))}
            </div>
          </div>

          {/* Notable Events */}
          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-lcars-lavender mb-4 flex items-center gap-2">
              <span>📰</span>
              Notable Events
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {summary.notableEvents.length > 0 ? (
                summary.notableEvents.map((event, index) => (
                  <EventRow key={index} event={event} />
                ))
              ) : (
                <div className="text-gray-500 text-center py-8">
                  No notable events this session
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className="px-8 py-4 bg-lcars-amber hover:bg-yellow-500 text-gray-900 font-bold text-xl rounded-lg transition-colors shadow-lg hover:shadow-xl"
            data-testid="continue-button"
          >
            Continue Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionSummaryScreen;
