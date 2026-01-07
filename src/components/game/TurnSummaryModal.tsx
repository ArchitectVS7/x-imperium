"use client";

/**
 * Turn Summary Modal
 *
 * The "payoff" moment at the end of each turn.
 * Shows everything that happened in a clear, digestible format.
 *
 * This is what makes the player feel connected to the simulation.
 */

import { useEffect, useCallback, useRef } from "react";
import type { TurnEvent, ResourceDelta } from "@/lib/game/types/turn-types";
import { RESOURCE_NAMES, GAME_TERMS, UI_LABELS } from "@/lib/theme/names";
import { ResourceIcons } from "@/lib/theme/icons";
import { TrendingUp, Users, Swords, Mail, Map, AlertTriangle, Trophy, Skull, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TurnSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  turn: number;
  processingMs: number;
  // Resource changes
  resourceChanges?: ResourceDelta;
  // Population
  populationBefore?: number;
  populationAfter?: number;
  // Events grouped by category
  events: TurnEvent[];
  // Messages received this turn
  messagesReceived?: number;
  // Bot activity
  botBattles?: number;
  empiresEliminated?: string[];
  // Victory/defeat
  victoryResult?: {
    type: string;
    message: string;
  };
}

const CATEGORY_CONFIG: Record<string, { title: string; icon: LucideIcon; bgColor: string; borderColor: string }> = {
  income: {
    title: "Income & Production",
    icon: TrendingUp,
    bgColor: "bg-green-900/20",
    borderColor: "border-green-600/30",
  },
  population: {
    title: RESOURCE_NAMES.population,
    icon: Users,
    bgColor: "bg-blue-900/20",
    borderColor: "border-blue-600/30",
  },
  military: {
    title: UI_LABELS.military,
    icon: Swords,
    bgColor: "bg-red-900/20",
    borderColor: "border-red-600/30",
  },
  diplomacy: {
    title: `${UI_LABELS.diplomacy} & ${UI_LABELS.messages}`,
    icon: Mail,
    bgColor: "bg-purple-900/20",
    borderColor: "border-purple-600/30",
  },
  galaxy: {
    title: `${GAME_TERMS.galaxy} Activity`,
    icon: Map,
    bgColor: "bg-indigo-900/20",
    borderColor: "border-indigo-600/30",
  },
  alerts: {
    title: "Alerts",
    icon: AlertTriangle,
    bgColor: "bg-yellow-900/20",
    borderColor: "border-yellow-600/30",
  },
};

export function TurnSummaryModal({
  isOpen,
  onClose,
  turn,
  processingMs,
  resourceChanges,
  populationBefore,
  populationAfter,
  events,
  messagesReceived = 0,
  botBattles = 0,
  empiresEliminated = [],
  victoryResult,
}: TurnSummaryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  // ACCESSIBILITY: Focus trap - prevents Tab from escaping the modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: cycle Tab within modal
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements);

        // If no focusable elements, do nothing
        if (focusableArray.length === 0) return;

        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          // Shift+Tab on first element -> go to last
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          // Tab on last element -> go to first
          e.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Save currently focused element to restore later
      const previouslyFocused = document.activeElement as HTMLElement;

      // Add keyboard listeners
      document.addEventListener("keydown", handleKeyDown);

      // ACCESSIBILITY: Focus the Continue button when modal opens
      // Use setTimeout to ensure DOM is ready
      const focusTimeout = setTimeout(() => {
        continueButtonRef.current?.focus();
      }, 0);

      // Restore focus when modal closes
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        clearTimeout(focusTimeout);
        previouslyFocused?.focus();
      };
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Categorize events
  const populationEvents = events.filter((e) =>
    ["population_change", "starvation"].includes(e.type)
  );
  const militaryEvents = events.filter((e) =>
    ["other"].includes(e.type) && e.message.toLowerCase().includes("completed")
  );
  const alertEvents = events.filter((e) =>
    ["civil_status_change", "bankruptcy", "revolt_consequences", "defeat"].includes(e.type)
  );

  const populationChange = (populationAfter ?? 0) - (populationBefore ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="turn-summary-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="turn-summary-title"
        aria-describedby="turn-summary-content"
        className="relative bg-gray-900 border border-lcars-amber/50 rounded-lg shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="turn-summary-title" className="text-2xl font-display text-lcars-amber">
                {GAME_TERMS.turn} {turn} Complete
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Processed in {processingMs}ms
              </p>
            </div>
            <BarChart3 className="w-10 h-10 text-lcars-amber" />
          </div>
        </div>

        {/* Content - Scrollable */}
        <div
          id="turn-summary-content"
          className="flex-1 overflow-y-auto p-6 space-y-4"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Turn results"
        >
          {/* Victory/Defeat Alert with ARIA live region for urgent announcements */}
          {victoryResult && (
            <div
              className="p-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-600/50 rounded-lg"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className="flex items-center gap-3">
                {victoryResult.type === "defeat" ? (
                  <Skull className="w-8 h-8 text-red-400" />
                ) : (
                  <Trophy className="w-8 h-8 text-yellow-400" />
                )}
                <div>
                  <div className="text-lg font-bold text-yellow-400">
                    {victoryResult.type === "defeat" ? "Defeat!" : "Victory!"}
                  </div>
                  <p className="text-sm text-gray-300">{victoryResult.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Income Section */}
          {resourceChanges && (
            <SummarySection category="income">
              <div className="grid grid-cols-2 gap-3">
                <ResourceChange label={RESOURCE_NAMES.credits} value={resourceChanges.credits} icon={ResourceIcons.credits} />
                <ResourceChange label={RESOURCE_NAMES.food} value={resourceChanges.food} icon={ResourceIcons.food} />
                <ResourceChange label={RESOURCE_NAMES.ore} value={resourceChanges.ore} icon={ResourceIcons.ore} />
                <ResourceChange label={RESOURCE_NAMES.petroleum} value={resourceChanges.petroleum} icon={ResourceIcons.petroleum} />
                {resourceChanges.researchPoints > 0 && (
                  <ResourceChange
                    label={RESOURCE_NAMES.researchPoints}
                    value={resourceChanges.researchPoints}
                    icon={ResourceIcons.researchPoints}
                  />
                )}
              </div>
            </SummarySection>
          )}

          {/* Population Section */}
          {populationBefore !== undefined && populationAfter !== undefined && (
            <SummarySection category="population">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">{RESOURCE_NAMES.population}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    {populationBefore.toLocaleString()}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="text-white font-semibold">
                    {populationAfter.toLocaleString()}
                  </span>
                  {populationChange !== 0 && (
                    <span
                      className={`text-sm ${
                        populationChange > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      ({populationChange > 0 ? "+" : ""}
                      {populationChange.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
              {/* Population events */}
              {populationEvents.map((event, i) => (
                <EventLine key={i} event={event} />
              ))}
            </SummarySection>
          )}

          {/* Military Section */}
          {militaryEvents.length > 0 && (
            <SummarySection category="military">
              {militaryEvents.map((event, i) => (
                <EventLine key={i} event={event} />
              ))}
            </SummarySection>
          )}

          {/* Messages/Diplomacy Section */}
          {(messagesReceived > 0 || events.some((e) => e.message.includes("message"))) && (
            <SummarySection category="diplomacy">
              {messagesReceived > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{UI_LABELS.messages} received</span>
                  <span className="text-purple-400 font-semibold">
                    {messagesReceived} new
                  </span>
                </div>
              )}
            </SummarySection>
          )}

          {/* Galaxy Activity Section */}
          {(botBattles > 0 || empiresEliminated.length > 0) && (
            <SummarySection category="galaxy">
              {botBattles > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Battles this {GAME_TERMS.turn.toLowerCase()}</span>
                  <span className="text-indigo-400">{botBattles}</span>
                </div>
              )}
              {empiresEliminated.length > 0 && (
                <div className="text-sm text-red-400 flex items-center gap-2">
                  <Skull className="w-4 h-4" />
                  <span>Eliminated: {empiresEliminated.join(", ")}</span>
                </div>
              )}
            </SummarySection>
          )}

          {/* Alerts Section */}
          {alertEvents.length > 0 && (
            <SummarySection category="alerts">
              {alertEvents.map((event, i) => (
                <EventLine key={i} event={event} highlight />
              ))}
            </SummarySection>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <button
            ref={continueButtonRef}
            onClick={onClose}
            className="w-full py-3 bg-lcars-amber text-gray-900 font-display text-lg rounded-lg hover:bg-lcars-amber/90 transition-colors"
            data-testid="turn-summary-continue"
          >
            CONTINUE
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Press Enter or Escape to continue
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function SummarySection({
  category,
  children,
}: {
  category: keyof typeof CATEGORY_CONFIG;
  children: React.ReactNode;
}) {
  const config = CATEGORY_CONFIG[category];
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <IconComponent className="w-4 h-4" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          {config.title}
        </h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ResourceChange({
  label,
  value,
  icon: IconComponent,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  const isPositive = value >= 0;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400 flex items-center gap-1">
        <IconComponent className="w-4 h-4" /> {label}
      </span>
      <span className={isPositive ? "text-green-400" : "text-red-400"}>
        {isPositive ? "+" : ""}
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function EventLine({ event, highlight = false }: { event: TurnEvent; highlight?: boolean }) {
  const severityColor =
    event.severity === "error"
      ? "text-red-400"
      : event.severity === "warning"
      ? "text-yellow-400"
      : "text-gray-300";

  return (
    <div
      className={`text-sm ${severityColor} ${
        highlight ? "font-semibold" : ""
      }`}
    >
      {event.message}
    </div>
  );
}

export default TurnSummaryModal;
