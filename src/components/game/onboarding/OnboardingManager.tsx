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
import { Rocket, ClipboardList, Coins, Swords, Globe, Eye, FlaskConical, Settings, Drama } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface OnboardingManagerProps {
  currentTurn: number;
}

// Define all onboarding hints
interface OnboardingHintConfig {
  id: string;
  turnToShow: number;
  title: string;
  message: string;
  icon: LucideIcon;
  position: "top" | "bottom" | "inline";
  action?: { label: string; href: string };
}

const ONBOARDING_HINTS: OnboardingHintConfig[] = [
  // Turn 1: Welcome and orientation
  {
    id: "welcome",
    turnToShow: 1,
    title: `Welcome to ${THEME_INFO.name}!`,
    message:
      `You command a fledgling ${GAME_TERMS.empire.toLowerCase()}. Your goal: survive, expand, and dominate. Start by exploring the menu to see your resources and ${UI_LABELS.military.toLowerCase()}.`,
    icon: Rocket,
    position: "top",
    action: { label: "Show me around", href: "/game" },
  },
  {
    id: "turn-panel",
    turnToShow: 1,
    title: `Your ${GAME_TERMS.turn} Order`,
    message:
      `The panel on the right tracks your ${GAME_TERMS.turn.toLowerCase()}. Visit different sections to take actions, then click ${UI_LABELS.endTurn.toUpperCase()} when ready. You're protected from attacks for the first 20 ${GAME_TERMS.turn.toLowerCase()}s.`,
    icon: ClipboardList,
    position: "bottom",
  },

  // Turn 2: Resources and growth
  {
    id: "resources",
    turnToShow: 2,
    title: "Understanding Resources",
    message:
      `${RESOURCE_NAMES.credits} fund everything. ${RESOURCE_NAMES.food} feeds your ${RESOURCE_NAMES.population.toLowerCase()}. ${RESOURCE_NAMES.ore} and ${RESOURCE_NAMES.petroleum} are for advanced units. Watch your ${RESOURCE_NAMES.food.toLowerCase()} - starving ${RESOURCE_NAMES.population.toLowerCase()} rebel!`,
    icon: Coins,
    position: "top",
    action: { label: "View Resources", href: "/game" },
  },

  // Turn 3: Military and defense
  {
    id: "military",
    turnToShow: 3,
    title: "Build Your Defenses",
    message:
      `Protection ends at ${GAME_TERMS.turn} 20. Start building units now. Visit ${UI_LABELS.military} to queue construction. Units cost ${RESOURCE_NAMES.credits.toLowerCase()} but provide security.`,
    icon: Swords,
    position: "top",
    action: { label: `Go to ${UI_LABELS.military}`, href: "/game/military" },
  },

  // Turn 4: Expansion
  {
    id: "expansion",
    turnToShow: 4,
    title: `Grow Your ${GAME_TERMS.empire}`,
    message:
      `More ${UI_LABELS.sectors.toLowerCase()} = more resources. Visit ${UI_LABELS.sectors} to colonize new territories. Different types produce different resources. Balance is key!`,
    icon: Globe,
    position: "top",
    action: { label: `Colonize ${UI_LABELS.sectors}`, href: "/game/sectors" },
  },

  // Turn 5: Rivals and strategy
  {
    id: "rivals",
    turnToShow: 5,
    title: `Know Your ${GAME_TERMS.bots}`,
    message:
      `25 AI ${GAME_TERMS.empires.toLowerCase()} compete with you. Check ${UI_LABELS.messages} for communications. Watch the ${UI_LABELS.galaxyMap} for threats. Some ${GAME_TERMS.empires.toLowerCase()} are friendly, others... not so much.`,
    icon: Eye,
    position: "top",
    action: { label: `View ${UI_LABELS.galaxyMap}`, href: "/game/starmap" },
  },

  // Turn 10: Research system
  {
    id: "research",
    turnToShow: 10,
    title: "Unlock Advanced Technology",
    message:
      `Research unlocks powerful units and systems. Visit ${UI_LABELS.research} to invest in tech branches. Higher research levels enable Heavy Cruisers, Defense Stations, and more. Progress takes time - start now!`,
    icon: FlaskConical,
    position: "top",
    action: { label: `View ${UI_LABELS.research}`, href: "/game/research" },
  },

  // Turn 15: Crafting system
  {
    id: "crafting",
    turnToShow: 15,
    title: "Craft Advanced Components",
    message:
      `Advanced ships require crafted components. Visit Crafting to turn raw resources into Electronics, Armor Plating, and Reactor Cores. Queue items for future turns - they take time to build!`,
    icon: Settings,
    position: "top",
    action: { label: "Visit Crafting", href: "/game/crafting" },
  },

  // Turn 20: Black Market / Syndicate (protection ends!)
  {
    id: "syndicate",
    turnToShow: 20,
    title: "Protection Ends - New Opportunities",
    message:
      `Your protection period is over! Attacks are now possible. The Galactic Syndicate offers contracts, components, and... forbidden weapons. Visit the Syndicate to build trust and access the Black Market.`,
    icon: Drama,
    position: "top",
    action: { label: "Visit Syndicate", href: "/game/syndicate" },
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

  // Only show hints for turns 1-20 (extended onboarding)
  if (currentTurn > 20) return null;

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
