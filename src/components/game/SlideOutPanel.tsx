"use client";

/**
 * Slide-Out Panel
 *
 * A panel that slides in from the left side of the screen.
 * Used for quick access to detailed views without full page navigation.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
}

const WIDTH_CLASSES = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[32rem]",
};

export function SlideOutPanel({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
}: SlideOutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Animate in/out
  useEffect(() => {
    if (!panelRef.current || !backdropRef.current) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (isOpen) {
      // Animate in
      if (prefersReducedMotion) {
        gsap.set(panelRef.current, { x: 0 });
        gsap.set(backdropRef.current, { opacity: 1 });
      } else {
        gsap.fromTo(
          panelRef.current,
          { x: "-100%" },
          { x: 0, duration: 0.3, ease: "power2.out" }
        );
        gsap.fromTo(
          backdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.2 }
        );
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40" data-testid="slide-out-panel">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`absolute left-0 top-0 h-full ${WIDTH_CLASSES[width]} bg-gray-900 border-r border-lcars-amber/30 shadow-2xl flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-display text-lcars-amber">{title}</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default SlideOutPanel;
