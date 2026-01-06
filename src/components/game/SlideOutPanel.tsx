"use client";

/**
 * Slide-Out Panel
 *
 * A panel that slides in from either side of the screen.
 * Used for quick access to detailed views without full page navigation.
 * Supports variants for different contexts (combat, urgent).
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  side?: "left" | "right";
  variant?: "default" | "combat" | "urgent";
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  loading?: boolean;
}

const WIDTH_CLASSES = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[32rem]",
  xl: "w-[40rem]",
};

const VARIANT_STYLES = {
  default: {
    border: "border-lcars-amber/30",
    header: "text-lcars-amber",
    headerBg: "",
  },
  combat: {
    border: "border-red-500/50",
    header: "text-red-400",
    headerBg: "bg-red-950/20",
  },
  urgent: {
    border: "border-yellow-500/50",
    header: "text-yellow-400",
    headerBg: "bg-yellow-950/20",
  },
};

export function SlideOutPanel({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  side = "left",
  variant = "default",
  footer,
  headerActions,
  loading = false,
}: SlideOutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const styles = VARIANT_STYLES[variant];

  // Animate in/out
  useEffect(() => {
    if (!panelRef.current || !backdropRef.current) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const startX = side === "left" ? "-100%" : "100%";

    if (isOpen) {
      // Animate in with spring physics
      if (prefersReducedMotion) {
        gsap.set(panelRef.current, { x: 0 });
        gsap.set(backdropRef.current, { opacity: 1 });
      } else {
        gsap.fromTo(
          panelRef.current,
          { x: startX },
          { x: 0, duration: 0.4, ease: "back.out(1.2)" }
        );
        gsap.fromTo(
          backdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.2 }
        );
      }
    }
  }, [isOpen, side]);

  // ACCESSIBILITY: Keyboard handling and focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: cycle Tab within panel
      if (event.key === "Tab" && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements);

        // If no focusable elements, do nothing
        if (focusableArray.length === 0) return;

        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          // Shift+Tab on first element -> go to last
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          // Tab on last element -> go to first
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Save previously focused element to restore on close
    const previouslyFocused = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClass = side === "left" ? "left-0" : "right-0";
  const borderClass = side === "left" ? "border-r" : "border-l";

  return (
    <div className="fixed inset-0 z-40" data-testid="slide-out-panel">
      {/* Backdrop with blur */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-out-panel-title"
        className={`absolute ${positionClass} top-0 h-full ${WIDTH_CLASSES[width]} bg-gray-900 ${borderClass} ${styles.border} shadow-2xl flex flex-col`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-800 ${styles.headerBg}`}>
          <h2 id="slide-out-panel-title" className={`text-lg font-display ${styles.header}`}>{title}</h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-800 rounded w-3/4" />
              <div className="h-4 bg-gray-800 rounded w-1/2" />
              <div className="h-32 bg-gray-800 rounded" />
              <div className="h-4 bg-gray-800 rounded w-2/3" />
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-800 p-4 bg-gray-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default SlideOutPanel;
