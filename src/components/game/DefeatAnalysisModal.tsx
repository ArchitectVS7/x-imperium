"use client";

/**
 * Defeat Analysis Modal
 *
 * Shows detailed analysis of why the player lost, with contributing factors
 * and actionable tips for improvement.
 */

import { useEffect, useCallback, useRef } from "react";
import { Skull, AlertTriangle, Lightbulb, X, TrendingDown, Swords, Users, Coins } from "lucide-react";
import Link from "next/link";
import type { DefeatCause, DefeatFactor, DefeatAnalysis } from "@/lib/game/types/turn-types";

export interface DefeatAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DefeatAnalysis | null;
}

const DEFEAT_CAUSE_INFO: Record<DefeatCause, { title: string; description: string; icon: typeof Skull }> = {
  bankruptcy: {
    title: "Bankruptcy",
    description: "Your empire ran out of credits and couldn't maintain operations.",
    icon: Coins,
  },
  conquest: {
    title: "Conquered",
    description: "You lost all your sectors to enemy forces.",
    icon: Swords,
  },
  elimination: {
    title: "Eliminated",
    description: "Your empire was destroyed by enemy attacks.",
    icon: Skull,
  },
  starvation: {
    title: "Mass Starvation",
    description: "Your population starved due to food shortage.",
    icon: Users,
  },
  revolt: {
    title: "Civil Revolt",
    description: "Your unhappy citizens overthrew the government.",
    icon: AlertTriangle,
  },
  unknown: {
    title: "Defeat",
    description: "Your empire has fallen.",
    icon: Skull,
  },
};

const IMPROVEMENT_TIPS: Record<DefeatCause, string[]> = {
  bankruptcy: [
    "Maintain a credit buffer of at least 3 turns of expenses",
    "Reduce military spending when not actively at war",
    "Build more commercial and residential sectors early",
    "Watch your maintenance costs as your army grows",
  ],
  conquest: [
    "Build defense stations to protect key sectors",
    "Form alliances with neighboring empires",
    "Diversify sector locations to avoid total loss",
    "Maintain a standing defense force at all times",
  ],
  elimination: [
    "Don't overextend your military on attacks",
    "Keep defensive forces at home",
    "Monitor enemy strength before engaging",
    "Use diplomacy to avoid multi-front wars",
  ],
  starvation: [
    "Keep food production ahead of population growth",
    "Build food sectors before expanding population",
    "Monitor food status indicator in the header",
    "Sell other resources to buy food in emergencies",
  ],
  revolt: [
    "Keep your civil status above 'Discontent'",
    "Feed your population consistently",
    "Avoid bankruptcy which tanks civil status",
    "Win battles to boost morale",
  ],
  unknown: [
    "Learn the game mechanics through the tutorial",
    "Start with a defensive strategy",
    "Watch the turn summary for important events",
  ],
};

const FACTOR_ICONS: Record<DefeatFactor["type"], typeof Coins> = {
  economic: Coins,
  military: Swords,
  population: Users,
  diplomatic: AlertTriangle,
};

export function DefeatAnalysisModal({ isOpen, onClose, data }: DefeatAnalysisModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const newGameButtonRef = useRef<HTMLAnchorElement>(null);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => newGameButtonRef.current?.focus(), 0);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !data) return null;

  const causeInfo = DEFEAT_CAUSE_INFO[data.cause];
  const tips = IMPROVEMENT_TIPS[data.cause];
  const CauseIcon = causeInfo.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="defeat-analysis-modal"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="defeat-analysis-title"
        className="relative bg-gray-900 border border-red-600/50 rounded-lg shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-red-900/50 bg-gradient-to-r from-red-950/50 to-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-900/30 rounded-full">
                <CauseIcon className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 id="defeat-analysis-title" className="text-2xl font-display text-red-400">
                  {causeInfo.title}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Turn {data.finalTurn} • {data.turnsPlayed} turns played
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cause Description */}
          <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
            <p className="text-gray-300">{causeInfo.description}</p>
          </div>

          {/* Final Stats */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Final State
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-lg font-mono text-red-400">
                  {data.finalCredits.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Credits</div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-lg font-mono text-red-400">
                  {data.finalSectors}
                </div>
                <div className="text-xs text-gray-500">Sectors</div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-lg font-mono text-red-400">
                  {data.finalPopulation.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Population</div>
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          {data.factors.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                <TrendingDown className="w-4 h-4" />
                Contributing Factors
              </h3>
              <ul className="space-y-2">
                {data.factors.map((factor, i) => {
                  const FactorIcon = FACTOR_ICONS[factor.type];
                  const severityColor = factor.severity === "high"
                    ? "text-red-400 border-red-800/50"
                    : factor.severity === "medium"
                    ? "text-yellow-400 border-yellow-800/50"
                    : "text-gray-400 border-gray-700/50";
                  return (
                    <li
                      key={i}
                      className={`flex items-start gap-3 p-3 bg-gray-800/30 border rounded-lg ${severityColor}`}
                    >
                      <FactorIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{factor.description}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Improvement Tips */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Tips for Next Time
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex gap-3">
          <Link
            ref={newGameButtonRef}
            href="/game"
            className="flex-1 py-3 bg-lcars-amber text-gray-900 font-display text-center rounded-lg hover:bg-lcars-amber/90 transition-colors"
          >
            NEW GAME
          </Link>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-800 text-gray-300 font-display rounded-lg hover:bg-gray-700 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

export default DefeatAnalysisModal;
