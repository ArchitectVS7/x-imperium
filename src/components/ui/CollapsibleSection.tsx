"use client";

/**
 * Collapsible Section Component
 *
 * A reusable collapsible/expandable section for dashboard UI.
 * Remembers collapsed state in localStorage.
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollapsibleSectionProps {
  /** Unique ID for localStorage persistence */
  id: string;
  /** Section title */
  title: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Icon color class */
  iconColor?: string;
  /** Whether section is collapsed by default */
  defaultCollapsed?: boolean;
  /** Section content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Header background color */
  headerBg?: string;
  /** Badge to show in header (e.g., count) */
  badge?: string | number;
  /** Badge color class */
  badgeColor?: string;
}

const STORAGE_KEY_PREFIX = "collapsible-section-";

export function CollapsibleSection({
  id,
  title,
  icon: Icon,
  iconColor = "text-lcars-amber",
  defaultCollapsed = false,
  children,
  className,
  headerBg = "bg-gray-800/50",
  badge,
  badgeColor = "bg-lcars-amber text-gray-900",
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
    setIsHydrated(true);
  }, [id]);

  // Save collapsed state to localStorage
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, String(newValue));
      return newValue;
    });
  }, [id]);

  // Don't render with animation until hydrated to avoid flash
  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <div className={cn("rounded-lg border border-gray-700/50 overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-700/50",
          headerBg
        )}
        aria-expanded={!isCollapsed}
        aria-controls={`collapsible-content-${id}`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={cn("w-5 h-5", iconColor)} />}
          <span className="font-semibold text-gray-200">{title}</span>
          {badge !== undefined && (
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badgeColor)}>
              {badge}
            </span>
          )}
        </div>
        <ChevronIcon className="w-5 h-5 text-gray-400 transition-transform" />
      </button>

      {/* Content */}
      <div
        id={`collapsible-content-${id}`}
        className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100",
          !isHydrated && defaultCollapsed && "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 border-t border-gray-700/30 bg-gray-900/30">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible Section Group
 *
 * Wrapper for multiple collapsible sections with consistent styling.
 */
export interface CollapsibleGroupProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleGroup({ children, className }: CollapsibleGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {children}
    </div>
  );
}

export default CollapsibleSection;
