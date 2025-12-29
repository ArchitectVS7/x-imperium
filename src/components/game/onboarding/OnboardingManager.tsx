"use client";

/**
 * Onboarding Manager
 *
 * Orchestrates the onboarding experience for new players.
 * Shows contextual hints during the first 5 turns.
 *
 * Philosophy: Non-intrusive, helpful, skippable.
 * - Hints appear once per trigger (turn or action)
 * - Players can dismiss individually or disable all
 * - Hints are saved in localStorage so they don't repeat
 */

import { useState, useEffect } from "react";
import { OnboardingHint } from "./OnboardingHint";
import { UI_LABELS, RESOURCE_NAMES, GAME_TERMS, THEME_INFO } from "@/lib/theme/names";

interface OnboardingManagerProps {
  currentTurn: number;
}

// Define all onboarding hints
const ONBOARDING_HINTS = [
  // Turn 1: Welcome and orientation
  {
    id: "welcome",
    turnToShow: 1,
    title: `Welcome to ${THEME_INFO.name}!`,
    message:
      `You command a fledgling ${GAME_TERMS.empire.toLowerCase()}. Your goal: survive, expand, and dominate. Start by exploring the menu to see your resources and ${UI_LABELS.military.toLowerCase()}.`,
    icon: "🚀",
    position: "top" as const,
    action: { label: "Show me around", href: "/game" },
  },
  {
    id: "turn-panel",
    turnToShow: 1,
    title: `Your ${GAME_TERMS.turn} Order`,
    message:
      `The panel on the right tracks your ${GAME_TERMS.turn.toLowerCase()}. Visit different sections to take actions, then click ${UI_LABELS.endTurn.toUpperCase()} when ready. You're protected from attacks for the first 20 ${GAME_TERMS.turn.toLowerCase()}s.`,
    icon: "📋",
    position: "bottom" as const,
  },

  // Turn 2: Resources and growth
  {
    id: "resources",
    turnToShow: 2,
    title: "Understanding Resources",
    message:
      `${RESOURCE_NAMES.credits} fund everything. ${RESOURCE_NAMES.food} feeds your ${RESOURCE_NAMES.population.toLowerCase()}. ${RESOURCE_NAMES.ore} and ${RESOURCE_NAMES.petroleum} are for advanced units. Watch your ${RESOURCE_NAMES.food.toLowerCase()} - starving ${RESOURCE_NAMES.population.toLowerCase()} rebel!`,
    icon: "💰",
    position: "top" as const,
    action: { label: "View Resources", href: "/game" },
  },

  // Turn 3: Military and defense
  {
    id: "military",
    turnToShow: 3,
    title: "Build Your Defenses",
    message:
      `Protection ends at ${GAME_TERMS.turn} 20. Start building units now. Visit ${UI_LABELS.military} to queue construction. Units cost ${RESOURCE_NAMES.credits.toLowerCase()} but provide security.`,
    icon: "⚔️",
    position: "top" as const,
    action: { label: `Go to ${UI_LABELS.military}`, href: "/game/military" },
  },

  // Turn 4: Expansion
  {
    id: "expansion",
    turnToShow: 4,
    title: `Grow Your ${GAME_TERMS.empire}`,
    message:
      `More ${UI_LABELS.planets.toLowerCase()} = more resources. Visit ${UI_LABELS.planets} to buy new territories. Different types produce different resources. Balance is key!`,
    icon: "🌍",
    position: "top" as const,
    action: { label: `Buy ${UI_LABELS.planets}`, href: "/game/planets" },
  },

  // Turn 5: Rivals and strategy
  {
    id: "rivals",
    turnToShow: 5,
    title: `Know Your ${GAME_TERMS.bots}`,
    message:
      `25 AI ${GAME_TERMS.empires.toLowerCase()} compete with you. Check ${UI_LABELS.messages} for communications. Watch the ${UI_LABELS.galaxyMap} for threats. Some ${GAME_TERMS.empires.toLowerCase()} are friendly, others... not so much.`,
    icon: "👁️",
    position: "top" as const,
    action: { label: `View ${UI_LABELS.galaxyMap}`, href: "/game/starmap" },
  },
];

const STORAGE_KEY_DISABLED = "x-imperium-onboarding-disabled";

export function OnboardingManager({ currentTurn }: OnboardingManagerProps) {
  const [isOnboardingDisabled, setIsOnboardingDisabled] = useState(false);

  useEffect(() => {
    // Check if onboarding is disabled
    const disabled = localStorage.getItem(STORAGE_KEY_DISABLED) === "true";
    setIsOnboardingDisabled(disabled);
  }, []);

  const handleDisableAll = () => {
    localStorage.setItem(STORAGE_KEY_DISABLED, "true");
    setIsOnboardingDisabled(true);
  };

  if (isOnboardingDisabled) return null;

  // Only show hints for turns 1-5
  if (currentTurn > 5) return null;

  // Get hints for current turn
  const currentHints = ONBOARDING_HINTS.filter((h) => h.turnToShow === currentTurn);

  if (currentHints.length === 0) return null;

  return (
    <>
      {/* Render hints */}
      {currentHints.map((hint) => (
        <OnboardingHint
          key={hint.id}
          hintId={hint.id}
          title={hint.title}
          message={hint.message}
          turnToShow={hint.turnToShow}
          currentTurn={currentTurn}
          position={hint.position}
          icon={hint.icon}
          action={hint.action}
        />
      ))}

      {/* Disable all option (shown on turn 1 only) */}
      {currentTurn === 1 && (
        <div className="fixed bottom-4 right-80 z-40">
          <button
            onClick={handleDisableAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors bg-gray-900/50 px-2 py-1 rounded"
          >
            Skip all tutorials
          </button>
        </div>
      )}
    </>
  );
}

export default OnboardingManager;
