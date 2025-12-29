"use client";

/**
 * Turn Summary Component
 *
 * Displays a detailed summary of what happened during turn processing.
 * Shows resource changes, events, and important notifications.
 */

import { useState } from "react";
import type { TurnEvent } from "@/lib/game/types/turn-types";

interface TurnSummaryProps {
  turn: number;
  processingMs: number;
  events: TurnEvent[];
  onDismiss?: () => void;
}

const EVENT_ICONS: Record<string, string> = {
  resource_production: "💰",
  population_change: "👥",
  civil_status_change: "🏛️",
  maintenance: "🔧",
  bankruptcy: "💸",
  starvation: "🍞",
  victory: "🏆",
  defeat: "💀",
  revolt_consequences: "⚔️",
  other: "📋",
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-l-blue-400 bg-blue-900/10",
  warning: "border-l-yellow-400 bg-yellow-900/10",
  error: "border-l-red-400 bg-red-900/10",
};

const SEVERITY_TEXT: Record<string, string> = {
  info: "text-blue-300",
  warning: "text-yellow-300",
  error: "text-red-300",
};

export function TurnSummary({ turn, processingMs, events, onDismiss }: TurnSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group events by severity
  const errorEvents = events.filter((e) => e.severity === "error");
  const warningEvents = events.filter((e) => e.severity === "warning");
  const infoEvents = events.filter((e) => e.severity === "info");

  const hasIssues = errorEvents.length > 0 || warningEvents.length > 0;

  if (events.length === 0) {
    return (
      <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">
            Turn {turn} completed in {processingMs}ms
          </span>
          <span className="text-gray-500 text-sm">No notable events</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-4 border rounded overflow-hidden ${
        hasIssues ? "border-yellow-700/50" : "border-gray-700"
      }`}
      data-testid="turn-summary"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 bg-gray-800/70 flex items-center justify-between hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📊</span>
          <span className="text-white font-semibold">Turn {turn} Summary</span>
          {hasIssues && (
            <span className="px-2 py-0.5 text-xs bg-yellow-900/50 text-yellow-400 rounded">
              {errorEvents.length + warningEvents.length} issues
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">{processingMs}ms</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Event List */}
      {isExpanded && (
        <div className="p-3 bg-gray-900/50 space-y-2 max-h-64 overflow-y-auto">
          {/* Error Events First */}
          {errorEvents.map((event, i) => (
            <EventItem key={`error-${i}`} event={event} />
          ))}

          {/* Warning Events */}
          {warningEvents.map((event, i) => (
            <EventItem key={`warning-${i}`} event={event} />
          ))}

          {/* Info Events */}
          {infoEvents.map((event, i) => (
            <EventItem key={`info-${i}`} event={event} />
          ))}

          {/* Dismiss Button */}
          {onDismiss && (
            <div className="pt-2 border-t border-gray-700/50 mt-2">
              <button
                onClick={onDismiss}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Dismiss summary
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventItem({ event }: { event: TurnEvent }) {
  const icon = EVENT_ICONS[event.type] || EVENT_ICONS.other;
  const severityStyle = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info;
  const textColor = SEVERITY_TEXT[event.severity] || SEVERITY_TEXT.info;

  return (
    <div
      className={`p-2 border-l-2 rounded-r ${severityStyle}`}
      data-testid={`turn-event-${event.type}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm">{icon}</span>
        <p className={`text-sm ${textColor}`}>{event.message}</p>
      </div>
    </div>
  );
}
