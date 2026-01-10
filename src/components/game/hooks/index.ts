/**
 * GameShell-specific hooks for managing game UI state.
 *
 * These hooks were extracted from GameShell.tsx to improve
 * maintainability and testability (P2-14).
 */

export { useTutorialState } from "./useTutorialState";
export { usePanelState } from "./usePanelState";
export type { UsePanelStateOptions } from "./usePanelState";
export { useMobileSheet } from "./useMobileSheet";
export { useWelcomeModal } from "./useWelcomeModal";
export type { UseWelcomeModalOptions } from "./useWelcomeModal";
