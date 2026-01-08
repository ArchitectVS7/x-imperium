"use client";

/**
 * Bot Gallery Modal
 *
 * Shows a scrollable list of opponent bots at game start.
 * Displays name, archetype, tagline, and difficulty tier.
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import { Users, X, Swords, Handshake, Coins, Eye, Shield, Zap, FlaskConical, Target, Crown } from "lucide-react";

export interface BotInfo {
  id: string;
  name: string;
  emperorName: string;
  archetype: string;
  tier: number;
  catchphrase?: string;
}

export interface BotGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bots: BotInfo[];
  gameMode?: string;
}

// Archetype display configuration
const ARCHETYPE_CONFIG: Record<string, { icon: typeof Swords; color: string; label: string }> = {
  warlord: { icon: Swords, color: "text-red-400", label: "Warlord" },
  diplomat: { icon: Handshake, color: "text-purple-400", label: "Diplomat" },
  merchant: { icon: Coins, color: "text-yellow-400", label: "Merchant" },
  schemer: { icon: Eye, color: "text-indigo-400", label: "Schemer" },
  turtle: { icon: Shield, color: "text-blue-400", label: "Turtle" },
  blitzkrieg: { icon: Zap, color: "text-orange-400", label: "Blitzkrieg" },
  "tech rush": { icon: FlaskConical, color: "text-cyan-400", label: "Tech Rush" },
  "tech-rush": { icon: FlaskConical, color: "text-cyan-400", label: "Tech Rush" },
  opportunist: { icon: Target, color: "text-green-400", label: "Opportunist" },
};

// Tier display configuration
const TIER_CONFIG: Record<number, { label: string; color: string; description: string }> = {
  1: { label: "Elite", color: "text-yellow-400", description: "LLM-powered AI" },
  2: { label: "Strategic", color: "text-purple-400", description: "Decision tree AI" },
  3: { label: "Simple", color: "text-blue-400", description: "Basic rules AI" },
  4: { label: "Random", color: "text-gray-400", description: "Weighted random" },
};

export function BotGalleryModal({ isOpen, onClose, bots, gameMode = "Campaign" }: BotGalleryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Group bots by archetype
  const botsByArchetype = useMemo(() => {
    const grouped: Record<string, BotInfo[]> = {};
    bots.forEach(bot => {
      const archetype = bot.archetype.toLowerCase();
      if (!grouped[archetype]) grouped[archetype] = [];
      grouped[archetype].push(bot);
    });
    return grouped;
  }, [bots]);

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
      setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="bot-gallery-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bot-gallery-title"
        className="relative bg-gray-900 border border-lcars-amber/50 rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-lcars-amber/20 rounded-full">
                <Crown className="w-6 h-6 text-lcars-amber" />
              </div>
              <div>
                <h2 id="bot-gallery-title" className="text-xl font-display text-lcars-amber">
                  Your Opponents
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {gameMode} Mode • {bots.length} AI Empires
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Archetype Legend */}
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Archetype Legend
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(ARCHETYPE_CONFIG).slice(0, 8).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-gray-300">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bot List */}
          <div className="space-y-6">
            {Object.entries(botsByArchetype).map(([archetype, archetypeBots]) => {
              const config = ARCHETYPE_CONFIG[archetype] ?? ARCHETYPE_CONFIG["warlord"]!;
              const Icon = config.icon;

              return (
                <div key={archetype}>
                  <h3 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    {config.label}s ({archetypeBots.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {archetypeBots.map(bot => {
                      const tierConfig = TIER_CONFIG[bot.tier] ?? TIER_CONFIG[4]!;
                      return (
                        <div
                          key={bot.id}
                          className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:border-gray-600/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-white">{bot.name}</div>
                              <div className="text-xs text-gray-500">{bot.emperorName}</div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${tierConfig.color} bg-gray-900/50`}>
                              {tierConfig.label}
                            </span>
                          </div>
                          {bot.catchphrase && (
                            <p className="mt-2 text-xs text-gray-400 italic">
                              &ldquo;{bot.catchphrase}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tier Legend */}
          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Difficulty Tiers
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(TIER_CONFIG).map(([tier, config]) => (
                <div key={tier} className="text-center">
                  <div className={`text-sm font-semibold ${config.color}`}>
                    Tier {tier}: {config.label}
                  </div>
                  <div className="text-xs text-gray-500">{config.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-lcars-amber text-gray-900 font-display text-lg rounded-lg hover:bg-lcars-amber/90 transition-colors"
          >
            BEGIN CAMPAIGN
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Press Escape to close
          </p>
        </div>
      </div>
    </div>
  );
}

export default BotGalleryModal;
