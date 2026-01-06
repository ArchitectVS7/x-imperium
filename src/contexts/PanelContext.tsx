"use client";

/**
 * Panel Context
 *
 * Provides panel controls to any component in the game.
 * Used by starmap and other pages to trigger slide-out panels
 * with optional context (e.g., target empire for combat).
 */

import { createContext, useContext, type ReactNode } from "react";
import type { PanelType } from "@/components/game/EmpireStatusBar";

export interface PanelContextData {
  /** Target empire ID for context-aware panels (combat, covert, messages) */
  targetEmpireId?: string;
}

interface PanelContextValue {
  /** Currently active panel */
  activePanel: PanelType;
  /** Context data for the active panel */
  panelContext: PanelContextData | null;
  /** Open a panel with optional context */
  openPanel: (panel: PanelType, context?: PanelContextData) => void;
  /** Close the current panel */
  closePanel: () => void;
}

const PanelContext = createContext<PanelContextValue | null>(null);

interface PanelProviderProps {
  children: ReactNode;
  activePanel: PanelType;
  panelContext: PanelContextData | null;
  openPanel: (panel: PanelType, context?: PanelContextData) => void;
  closePanel: () => void;
}

/**
 * PanelProvider wraps children and exposes panel controls via context.
 * The actual panel state is managed by GameShell.
 */
export function PanelProvider({
  children,
  activePanel,
  panelContext,
  openPanel,
  closePanel,
}: PanelProviderProps) {
  return (
    <PanelContext.Provider value={{ activePanel, panelContext, openPanel, closePanel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanelContext() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error("usePanelContext must be used within a PanelProvider");
  }
  return context;
}

/**
 * Safe version that returns undefined if not in provider.
 * Useful for components that may be used outside GameShell.
 */
export function usePanelContextSafe(): PanelContextValue | null {
  return useContext(PanelContext);
}

export default PanelContext;
