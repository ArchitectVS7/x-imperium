"use client";

/**
 * Quick Reference Modal
 *
 * Shows keyboard shortcuts, victory conditions, and quick tips.
 * Activated by pressing the ? key.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import {
  Keyboard,
  Trophy,
  Lightbulb,
  X,
  Map,
  Swords,
  FlaskConical,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
  Target,
  GraduationCap,
  RotateCcw,
} from "lucide-react";
import { clearTutorialState, hasSkippedTutorial } from "@/lib/tutorial/tutorial-service";

export interface QuickReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KEYBOARD_SHORTCUTS = [
  { key: "M", action: "Military panel", icon: Swords },
  { key: "S", action: "Sectors panel", icon: Map },
  { key: "C", action: "Combat panel", icon: Target },
  { key: "T", action: "Market/Trade panel", icon: TrendingUp },
  { key: "R", action: "Research panel", icon: FlaskConical },
  { key: "D", action: "Diplomacy panel", icon: Users },
  { key: "O", action: "Covert Ops panel", icon: Shield },
  { key: "I", action: "Messages/Inbox", icon: MessageSquare },
  { key: "Space", action: "End Turn", icon: Keyboard },
  { key: "Esc", action: "Close panel", icon: X },
  { key: "?", action: "This help screen", icon: Lightbulb },
];

const VICTORY_CONDITIONS = [
  { name: "Conquest", description: "Control 60% of all sectors", color: "text-red-400" },
  { name: "Economic", description: "Have 1.5x networth of 2nd place", color: "text-yellow-400" },
  { name: "Survival", description: "Highest score at final turn", color: "text-blue-400" },
  { name: "Coalition", description: "Lead a victorious alliance", color: "text-purple-400" },
  { name: "Technological", description: "Reach Research Level 10", color: "text-cyan-400" },
  { name: "Domination", description: "Eliminate all opponents", color: "text-orange-400" },
];

const QUICK_TIPS = [
  "Keep your population fed to prevent civil unrest",
  "Use the 20-turn protection to build your economy",
  "Diverse unit types get combat bonuses",
  "Watch bot messages for diplomacy opportunities",
  "Research unlocks advanced military units",
];

export function QuickReferenceModal({ isOpen, onClose }: QuickReferenceModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [tutorialWasSkipped, setTutorialWasSkipped] = useState(false);
  const [tutorialReset, setTutorialReset] = useState(false);

  // Check tutorial status when modal opens
  useEffect(() => {
    if (isOpen) {
      setTutorialWasSkipped(hasSkippedTutorial());
      setTutorialReset(false);
    }
  }, [isOpen]);

  // Handle restart tutorial
  const handleRestartTutorial = useCallback(() => {
    clearTutorialState();
    setTutorialReset(true);
    setTutorialWasSkipped(false);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements);
        if (focusableArray.length === 0) return;

        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus the close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="quick-reference-modal"
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
        aria-labelledby="quick-reference-title"
        className="relative bg-gray-900 border border-lcars-amber/50 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-lcars-amber" />
            <h2 id="quick-reference-title" className="text-xl font-display text-lcars-amber">
              Quick Reference
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            aria-label="Close quick reference"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {KEYBOARD_SHORTCUTS.map(({ key, action, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-2 rounded bg-gray-800/50"
                >
                  <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-lcars-amber min-w-[40px] text-center">
                    {key}
                  </kbd>
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-300">{action}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Victory Conditions */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <Trophy className="w-4 h-4" />
              Victory Conditions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {VICTORY_CONDITIONS.map(({ name, description, color }) => (
                <div
                  key={name}
                  className="p-2 rounded bg-gray-800/50 border border-gray-700/50"
                >
                  <div className={`font-semibold text-sm ${color}`}>{name}</div>
                  <div className="text-xs text-gray-400">{description}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Tips */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <Lightbulb className="w-4 h-4" />
              Quick Tips
            </h3>
            <ul className="space-y-2">
              {QUICK_TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-lcars-amber">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          {/* Tutorial Settings */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <GraduationCap className="w-4 h-4" />
              Tutorial
            </h3>
            <div className="p-3 rounded bg-gray-800/50 border border-gray-700/50">
              {tutorialReset ? (
                <div className="flex items-center gap-2 text-sm text-lcars-green">
                  <span>Tutorial will restart on next turn. Close this modal and continue playing.</span>
                </div>
              ) : tutorialWasSkipped ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    Tutorial was skipped. Want to see it again?
                  </span>
                  <button
                    onClick={handleRestartTutorial}
                    className="flex items-center gap-2 px-3 py-1.5 bg-lcars-amber/20 hover:bg-lcars-amber/30 text-lcars-amber rounded transition-colors text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart Tutorial
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Tutorial is active. Complete the steps or press Skip to hide it.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-gray-900/50 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs font-mono">?</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

export default QuickReferenceModal;
