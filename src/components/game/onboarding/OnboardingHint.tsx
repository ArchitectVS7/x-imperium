"use client";

/**
 * Onboarding Hint Component
 *
 * Shows contextual, dismissible hints during the first few turns.
 * Non-intrusive - players can dismiss individual hints or all hints.
 */

import { useState, useEffect } from "react";

export interface OnboardingHintProps {
  hintId: string;
  title: string;
  message: string;
  turnToShow: number; // Show this hint on this turn
  currentTurn: number;
  position?: "top" | "bottom" | "inline";
  icon?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const STORAGE_KEY = "x-imperium-dismissed-hints";

function getDismissedHints(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissHint(hintId: string) {
  const dismissed = getDismissedHints();
  dismissed.add(hintId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dismissed)));
}

export function OnboardingHint({
  hintId,
  title,
  message,
  turnToShow,
  currentTurn,
  position = "inline",
  icon = "💡",
  action,
}: OnboardingHintProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if hint should be shown
    const dismissed = getDismissedHints();
    const shouldShow = currentTurn === turnToShow && !dismissed.has(hintId);
    setIsDismissed(!shouldShow);

    // Animate in after a short delay
    if (shouldShow) {
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentTurn, turnToShow, hintId]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissHint(hintId);
      setIsDismissed(true);
    }, 200);
  };

  if (isDismissed) return null;

  const positionStyles = {
    top: "fixed top-20 left-1/2 -translate-x-1/2 z-50",
    bottom: "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
    inline: "relative",
  };

  return (
    <div
      className={`
        ${positionStyles[position]}
        transition-all duration-300
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
      `}
    >
      <div className="bg-gradient-to-r from-blue-900/90 to-indigo-900/90 border border-blue-500/50 rounded-lg p-4 max-w-md shadow-lg backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h3 className="font-semibold text-blue-200">{title}</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss hint"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <p className="mt-2 text-sm text-gray-300 leading-relaxed">{message}</p>

        {/* Action Button */}
        {action && (
          <div className="mt-3 flex items-center gap-2">
            {action.href ? (
              <a
                href={action.href}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                onClick={handleDismiss}
              >
                {action.label}
              </a>
            ) : (
              <button
                onClick={() => {
                  action.onClick?.();
                  handleDismiss();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
              >
                {action.label}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingHint;
