"use client";

/**
 * Turn Order Panel
 *
 * Boardgame-style sidebar showing:
 * - Current turn prominently
 * - Checklist of available actions
 * - Quick status indicators
 * - End Turn button
 *
 * Designed to give players the "did I do everything?" feeling
 * of a physical boardgame reference sheet.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UI_LABELS, GAME_TERMS, RESOURCE_NAMES } from "@/lib/theme/names";
import { ActionIcons } from "@/lib/theme/icons";
import { Shield, Mail, Check, AlertCircle, AlertTriangle, Eye, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PanelType } from "./EmpireStatusBar";

export interface TurnOrderPanelProps {
  currentTurn: number;
  turnLimit: number;
  // Quick status
  foodStatus: "surplus" | "stable" | "deficit" | "critical";
  armyStrength: "strong" | "moderate" | "weak" | "critical";
  threatCount: number;
  // Unread messages
  unreadMessages?: number;
  // Protection period
  protectionTurnsLeft?: number;
  // Callback when End Turn clicked
  onEndTurn?: () => void;
  isProcessing?: boolean;
  // Panel trigger callback (starmap-centric UI)
  onOpenPanel?: (panel: PanelType) => void;
}

interface ActionItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  description: string;
  panelType?: PanelType;
}

const ACTIONS: ActionItem[] = [
  { id: "military", label: UI_LABELS.military, href: "/game/military", icon: "military", description: "Build units, manage forces", panelType: "military" },
  { id: "sectors", label: UI_LABELS.sectors, href: "/game/sectors", icon: "sectors", description: "Colonize or release sectors", panelType: "sectors" },
  { id: "combat", label: UI_LABELS.combat, href: "/game/combat", icon: "combat", description: "Launch attacks", panelType: "combat" },
  { id: "diplomacy", label: UI_LABELS.diplomacy, href: "/game/diplomacy", icon: "diplomacy", description: "Treaties and alliances", panelType: "diplomacy" },
  { id: "market", label: UI_LABELS.market, href: "/game/market", icon: "market", description: "Buy and sell resources", panelType: "market" },
  { id: "covert", label: UI_LABELS.covert, href: "/game/covert", icon: "covert", description: "Spy operations", panelType: "covert" },
  { id: "research", label: UI_LABELS.research, href: "/game/research", icon: "research", description: "Advance technology", panelType: "research" },
  { id: "starmap", label: "Starmap", href: "/game/starmap", icon: "starmap", description: "View galaxy map" },
];

const STATUS_STYLES = {
  surplus: { color: "text-green-400", bg: "bg-green-900/30", label: "Surplus" },
  stable: { color: "text-blue-400", bg: "bg-blue-900/30", label: "Stable" },
  deficit: { color: "text-yellow-400", bg: "bg-yellow-900/30", label: "Deficit" },
  critical: { color: "text-red-400", bg: "bg-red-900/30", label: "Critical" },
  strong: { color: "text-green-400", bg: "bg-green-900/30", label: "Strong" },
  moderate: { color: "text-blue-400", bg: "bg-blue-900/30", label: "Moderate" },
  weak: { color: "text-yellow-400", bg: "bg-yellow-900/30", label: "Weak" },
};

export function TurnOrderPanel({
  currentTurn,
  turnLimit,
  foodStatus,
  armyStrength,
  threatCount,
  unreadMessages = 0,
  protectionTurnsLeft,
  onEndTurn,
  isProcessing = false,
  onOpenPanel,
}: TurnOrderPanelProps) {
  const pathname = usePathname();
  const [visitedActions, setVisitedActions] = useState<Set<string>>(new Set());

  // Use panel mode when onOpenPanel is provided
  const usePanelMode = !!onOpenPanel;

  // Track which pages the player has visited this turn
  useEffect(() => {
    const actionId = ACTIONS.find((a) => pathname.startsWith(a.href))?.id;
    if (actionId) {
      setVisitedActions((prev) => new Set([...Array.from(prev), actionId]));
    }
  }, [pathname]);

  // Reset visited actions when turn changes
  useEffect(() => {
    setVisitedActions(new Set());
  }, [currentTurn]);

  const foodStyle = STATUS_STYLES[foodStatus];
  const armyStyle = STATUS_STYLES[armyStrength];

  // Calculate turn progress for visual indicator
  const turnProgress = Math.min(100, (currentTurn / turnLimit) * 100);
  const isEndgame = currentTurn >= 180;
  const isFinalStretch = currentTurn >= turnLimit - 20;

  return (
    <div
      className="hidden lg:flex w-72 bg-gray-900 border-l border-lcars-amber/30 flex-col h-full"
      data-testid="turn-order-panel"
    >
      {/* Turn Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Turn</div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-4xl font-display font-bold ${
              isEndgame ? "text-lcars-salmon" : isFinalStretch ? "text-yellow-400" : "text-lcars-amber"
            }`}
          >
            {currentTurn}
          </span>
          <span className="text-gray-500">of {turnLimit}</span>
        </div>
        {/* Turn progress bar */}
        <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isEndgame ? "bg-lcars-salmon" : isFinalStretch ? "bg-yellow-400" : "bg-lcars-amber"
            }`}
            style={{ width: `${turnProgress}%` }}
          />
        </div>
        {/* Current Phase Indicator */}
        <div className="mt-3 px-3 py-2 bg-lcars-amber/10 border-l-2 border-lcars-amber rounded">
          <div className="text-xs text-gray-500 uppercase">Current Phase</div>
          <div className="text-sm font-display text-lcars-amber mt-0.5">
            {isProcessing ? "Processing Turn..." : "Your Actions"}
          </div>
        </div>
        {/* Protection period notice */}
        {protectionTurnsLeft && protectionTurnsLeft > 0 && (
          <div className="mt-2 text-xs text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Protected for {protectionTurnsLeft} more turns
          </div>
        )}
      </div>

      {/* Actions Checklist */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Your Actions</div>
        <div className="space-y-1">
          {ACTIONS.map((action) => {
            const isVisited = visitedActions.has(action.id);
            const isCurrent = pathname.startsWith(action.href);

            const IconComponent = ActionIcons[action.icon as keyof typeof ActionIcons];

            // In panel mode, use buttons that trigger panels
            if (usePanelMode && action.panelType) {
              return (
                <button
                  key={action.id}
                  onClick={() => onOpenPanel(action.panelType!)}
                  className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${
                    isVisited
                      ? "bg-gray-800/50 hover:bg-gray-800"
                      : "hover:bg-gray-800/50"
                  }`}
                >
                  <IconComponent className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">
                        {action.label}
                      </span>
                      {isVisited && (
                        <Check className="w-3 h-3 text-green-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            }

            // Fallback to Link for items without panelType (like starmap)
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`flex items-center gap-3 p-2 rounded transition-colors ${
                  isCurrent
                    ? "bg-lcars-amber/20 border border-lcars-amber/50"
                    : isVisited
                    ? "bg-gray-800/50 hover:bg-gray-800"
                    : "hover:bg-gray-800/50"
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isCurrent ? "text-lcars-amber" : "text-gray-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isCurrent ? "text-lcars-amber" : "text-gray-300"}`}>
                      {action.label}
                    </span>
                    {isVisited && !isCurrent && (
                      <Check className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Messages link/button with badge */}
        {usePanelMode ? (
          <button
            onClick={() => onOpenPanel("messages")}
            className="w-full flex items-center gap-3 p-2 rounded mt-2 transition-colors hover:bg-gray-800/50"
          >
            <Mail className="w-4 h-4 text-gray-400" />
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-300">
                {UI_LABELS.messages}
              </span>
            </div>
            {unreadMessages > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {unreadMessages}
              </span>
            )}
          </button>
        ) : (
          <Link
            href="/game/messages"
            className={`flex items-center gap-3 p-2 rounded mt-2 transition-colors ${
              pathname === "/game/messages"
                ? "bg-lcars-amber/20 border border-lcars-amber/50"
                : "hover:bg-gray-800/50"
            }`}
          >
            <Mail className={`w-4 h-4 ${pathname === "/game/messages" ? "text-lcars-amber" : "text-gray-400"}`} />
            <div className="flex-1">
              <span className={`text-sm ${pathname === "/game/messages" ? "text-lcars-amber" : "text-gray-300"}`}>
                {UI_LABELS.messages}
              </span>
            </div>
            {unreadMessages > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {unreadMessages}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Quick Status */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Quick Status</div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{RESOURCE_NAMES.food}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${foodStyle.bg} ${foodStyle.color}`}>
            {foodStyle.label}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{UI_LABELS.military}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${armyStyle.bg} ${armyStyle.color}`}>
            {armyStyle.label}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Threats</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            threatCount > 3
              ? "bg-red-900/30 text-red-400"
              : threatCount > 0
              ? "bg-yellow-900/30 text-yellow-400"
              : "bg-gray-800 text-gray-400"
          }`}>
            {threatCount} {threatCount === 1 ? GAME_TERMS.empire : GAME_TERMS.empires}
          </span>
        </div>
      </div>

      {/* Contextual Suggestions */}
      <SuggestionsPanel
        foodStatus={foodStatus}
        armyStrength={armyStrength}
        threatCount={threatCount}
        protectionTurnsLeft={protectionTurnsLeft}
        currentTurn={currentTurn}
      />

      {/* End Turn Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onEndTurn}
          disabled={isProcessing}
          className={`w-full py-3 px-4 rounded-lg font-display text-lg transition-all ${
            isProcessing
              ? "bg-gray-700 text-gray-400 cursor-wait animate-pulse"
              : "bg-lcars-amber text-gray-900 hover:bg-lcars-amber/90 hover:scale-[1.02]"
          }`}
          data-testid="turn-order-end-turn"
        >
          {isProcessing ? "PROCESSING..." : UI_LABELS.endTurn.toUpperCase()}
        </button>
        <div className="mt-2 text-center">
          <Link
            href="/game/starmap"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to Star Map
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Suggestions Panel
 *
 * Shows contextual suggestions based on game state.
 * Helps players know what to focus on.
 */
function SuggestionsPanel({
  foodStatus,
  armyStrength,
  threatCount,
  protectionTurnsLeft,
  currentTurn,
}: {
  foodStatus: "surplus" | "stable" | "deficit" | "critical";
  armyStrength: "strong" | "moderate" | "weak" | "critical";
  threatCount: number;
  protectionTurnsLeft?: number;
  currentTurn: number;
}) {
  const suggestions: Array<{ icon: LucideIcon; message: string; priority: "high" | "medium" | "low" }> = [];

  // High priority: Critical issues
  if (foodStatus === "critical") {
    suggestions.push({
      icon: AlertCircle,
      message: "Food critical! Buy Agriculture sectors",
      priority: "high",
    });
  } else if (foodStatus === "deficit") {
    suggestions.push({
      icon: AlertTriangle,
      message: "Food deficit - expand Agriculture",
      priority: "medium",
    });
  }

  if (armyStrength === "critical") {
    suggestions.push({
      icon: AlertCircle,
      message: "Military critical! Build units now",
      priority: "high",
    });
  } else if (armyStrength === "weak") {
    suggestions.push({
      icon: AlertTriangle,
      message: "Military weak - consider building units",
      priority: "medium",
    });
  }

  // Protection ending warning
  if (protectionTurnsLeft && protectionTurnsLeft > 0 && protectionTurnsLeft <= 5) {
    suggestions.push({
      icon: Shield,
      message: `Protection ends in ${protectionTurnsLeft} turns!`,
      priority: "high",
    });
  }

  // Threat warnings
  if (threatCount >= 5) {
    suggestions.push({
      icon: Eye,
      message: "Many threats - consider diplomacy",
      priority: "medium",
    });
  }

  // Early game tips
  if (currentTurn <= 5) {
    suggestions.push({
      icon: Lightbulb,
      message: "Early game: focus on expansion",
      priority: "low",
    });
  }

  // Don't show if no suggestions
  if (suggestions.length === 0) {
    return null;
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Only show top 3
  const topSuggestions = suggestions.slice(0, 3);

  return (
    <div className="px-4 py-3 border-t border-yellow-600/30 bg-yellow-900/10">
      <div className="text-xs text-yellow-400 uppercase tracking-wider mb-2">Suggested</div>
      <div className="space-y-1">
        {topSuggestions.map((suggestion, i) => {
          const IconComponent = suggestion.icon;
          return (
            <div
              key={i}
              className={`text-xs flex items-start gap-2 ${
                suggestion.priority === "high"
                  ? "text-red-400"
                  : suggestion.priority === "medium"
                  ? "text-yellow-400"
                  : "text-gray-400"
              }`}
            >
              <IconComponent className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{suggestion.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TurnOrderPanel;
