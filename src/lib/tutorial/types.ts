/**
 * Tutorial System Types (M9.1)
 *
 * Defines the structure for the 5-step onboarding tutorial
 * and contextual UI progression.
 */

// =============================================================================
// TUTORIAL STEP DEFINITIONS
// =============================================================================

/**
 * The 5 tutorial steps as defined in Implementation Tracker.
 */
export type TutorialStep =
  | "welcome"
  | "neighbors"
  | "galaxy"
  | "interface"
  | "first_turn";

/**
 * Completed tutorial step with victory condition explanation (Step 6).
 */
export type TutorialStepWithVictory = TutorialStep | "victory";

/**
 * Navigation link for tutorial action guide.
 */
export interface TutorialActionLink {
  /** Label for the navigation button */
  label: string;
  /** URL path to navigate to */
  href?: string;
  /** Panel type to open (for slide-out panels) */
  panel?: string;
}

/**
 * Tutorial step metadata.
 */
export interface TutorialStepInfo {
  id: TutorialStep | "victory";
  title: string;
  description: string;
  targetElement?: string; // CSS selector for highlighting
  action?: string; // Action required to complete step
  nextStep: TutorialStep | "victory" | null;
  /** Specific CSS selector for element to highlight during this step */
  highlightSelector?: string;
  /** Action guidance text - tells player what to do */
  actionGuide?: string;
  /** Optional navigation link for direct action */
  actionLink?: TutorialActionLink;
}

/**
 * All tutorial steps in order.
 */
export const TUTORIAL_STEPS: TutorialStepInfo[] = [
  {
    id: "welcome",
    title: "Welcome to Nexus Dominion",
    description:
      "You are the ruler of a fledgling space empire. Your goal is to expand, " +
      "build your military, and achieve one of six victory conditions.\n\n" +
      "This quick tutorial will show you the basics. Let's get started!",
    nextStep: "neighbors",
    actionGuide: "Click 'Let's Go!' below to begin the tutorial",
    // No action link for welcome - just proceed with the tutorial
  },
  {
    id: "neighbors",
    title: "Your Neighbors",
    description:
      "Your empire starts in a sector with 7-9 other empires. These are your " +
      "immediate neighbors. You can attack them directly at 1.0x force cost.\n\n" +
      "The Sectors page shows your territory and nearby empires.",
    targetElement: "[data-testid='sector-box-current']",
    highlightSelector: "[data-testid='nav-sectors'], [data-testid='sectors-nav-button']",
    actionGuide: "Click 'View Sectors' below to see your territory",
    actionLink: {
      label: "View Sectors",
      href: "/game/sectors",
    },
    nextStep: "galaxy",
  },
  {
    id: "galaxy",
    title: "The Galaxy Map",
    description:
      "The galaxy has 10 sectors connected by borders and wormholes. " +
      "Adjacent sectors cost 1.2x forces to attack. Wormholes cost 1.5x but " +
      "let you reach distant sectors.\n\n" +
      "The Starmap shows the entire galaxy and all empires.",
    targetElement: "[data-testid='galaxy-view']",
    highlightSelector: "[data-testid='nav-starmap'], [data-testid='starmap-nav-button']",
    actionGuide: "Click 'View Starmap' below to explore the galaxy",
    actionLink: {
      label: "View Starmap",
      href: "/game/starmap",
    },
    nextStep: "interface",
  },
  {
    id: "interface",
    title: "Build Your Military",
    description:
      "A strong military is essential for both defense and expansion. " +
      "Start by building soldiers - they're cheap and effective early game.\n\n" +
      "The Military panel lets you queue units for production.",
    targetElement: "[data-testid='empire-status-bar']",
    highlightSelector: "[data-testid='turn-order-panel'], [data-testid='military-panel-button']",
    actionGuide: "Click 'Open Military' below to view your forces and build queue",
    actionLink: {
      label: "Open Military",
      panel: "military",
    },
    nextStep: "first_turn",
  },
  {
    id: "first_turn",
    title: "Your First Turn",
    description:
      "When you're ready, click 'End Turn' to advance the game. Each turn:\n" +
      "- Your sectors produce resources\n" +
      "- Your population grows (if fed)\n" +
      "- Queued units are built\n" +
      "- Other empires take their actions\n\n" +
      "You have 20 turns of protection before others can attack you.",
    targetElement: "[data-testid='end-turn-button']",
    highlightSelector: "[data-testid='end-turn-button']",
    actionGuide: "Click the 'End Turn' button in the sidebar to complete your first turn",
    action: "end_turn",
    nextStep: "victory",
  },
];

/**
 * Victory condition explanation (Step 6).
 */
export const VICTORY_STEP: TutorialStepInfo = {
  id: "victory",
  title: "Paths to Victory",
  description:
    "There are six ways to win:\n" +
    "- Conquest: Control 60% of all sectors\n" +
    "- Economic: Have 1.5x the networth of 2nd place\n" +
    "- Survival: Highest score at turn 200\n" +
    "- Coalition: Lead a victorious alliance\n" +
    "- Technological: Reach Research Level 10\n" +
    "- Domination: Eliminate all opponents",
  nextStep: null,
  actionGuide: "Click 'Start Playing!' to begin your conquest of the galaxy",
  // No action link for victory - tutorial complete after this
};

// =============================================================================
// TUTORIAL STATE
// =============================================================================

/**
 * Player's tutorial progress state.
 */
export interface TutorialState {
  /** Whether tutorial is active */
  isActive: boolean;
  /** Current step (null if completed) */
  currentStep: TutorialStep | "victory" | null;
  /** Completed steps */
  completedSteps: (TutorialStep | "victory")[];
  /** Whether player has skipped tutorial */
  skipped: boolean;
  /** When tutorial was started */
  startedAt: Date | null;
  /** When tutorial was completed */
  completedAt: Date | null;
}

/**
 * Default tutorial state for new players.
 */
export const DEFAULT_TUTORIAL_STATE: TutorialState = {
  isActive: true,
  currentStep: "welcome",
  completedSteps: [],
  skipped: false,
  startedAt: null,
  completedAt: null,
};

// =============================================================================
// CONTEXTUAL UI
// =============================================================================

/**
 * UI visibility levels based on turn progression.
 */
export type UIVisibilityLevel = "basic" | "intermediate" | "advanced" | "full";

/**
 * Turn thresholds for UI progression.
 */
export const UI_VISIBILITY_THRESHOLDS = {
  /** Turns 1-10: Basic UI (resources, sectors, basic combat) */
  basic: { minTurn: 1, maxTurn: 10 },
  /** Turns 11-20: Add threats, diplomacy basics */
  intermediate: { minTurn: 11, maxTurn: 20 },
  /** Turns 21-50: Add wormholes, alliances */
  advanced: { minTurn: 21, maxTurn: 50 },
  /** Turn 51+: Full UI */
  full: { minTurn: 51, maxTurn: Infinity },
} as const;

/**
 * Panels visible at each UI level.
 */
export const UI_PANELS_BY_LEVEL: Record<UIVisibilityLevel, string[]> = {
  basic: [
    "resource-panel",
    "sector-list",
    "military-overview",
    "turn-counter",
    "sector-view",
  ],
  intermediate: [
    "resource-panel",
    "sector-list",
    "military-overview",
    "turn-counter",
    "sector-view",
    "threat-panel",
    "diplomacy-basic",
    "message-inbox",
  ],
  advanced: [
    "resource-panel",
    "sector-list",
    "military-overview",
    "turn-counter",
    "sector-view",
    "threat-panel",
    "diplomacy-basic",
    "message-inbox",
    "galaxy-view",
    "wormhole-panel",
    "alliance-panel",
    "research-panel",
  ],
  full: [
    "resource-panel",
    "sector-list",
    "military-overview",
    "turn-counter",
    "sector-view",
    "threat-panel",
    "diplomacy-basic",
    "message-inbox",
    "galaxy-view",
    "wormhole-panel",
    "alliance-panel",
    "research-panel",
    "covert-panel",
    "market-panel",
    "coalition-panel",
    "crafting-panel",
    "syndicate-panel",
  ],
};

/**
 * Get UI visibility level for a given turn.
 */
export function getUIVisibilityLevel(turn: number): UIVisibilityLevel {
  if (turn <= UI_VISIBILITY_THRESHOLDS.basic.maxTurn) return "basic";
  if (turn <= UI_VISIBILITY_THRESHOLDS.intermediate.maxTurn) return "intermediate";
  if (turn <= UI_VISIBILITY_THRESHOLDS.advanced.maxTurn) return "advanced";
  return "full";
}

/**
 * Check if a panel should be visible at current turn.
 */
export function isPanelVisible(panelId: string, turn: number): boolean {
  const level = getUIVisibilityLevel(turn);
  return UI_PANELS_BY_LEVEL[level].includes(panelId);
}

// =============================================================================
// TURN GOALS
// =============================================================================

/**
 * Suggested goals for early game turns.
 */
export interface TurnGoal {
  turn: number;
  title: string;
  description: string;
  checkCondition: (state: TurnGoalState) => boolean;
}

/**
 * State needed to check turn goals.
 */
export interface TurnGoalState {
  soldiers: number;
  fighters: number;
  sectorCount: number;
  credits: number;
  food: number;
  researchLevel: number;
  hasNAP: boolean;
  hasAttacked: boolean;
}

/**
 * Early game turn goals.
 */
export const TURN_GOALS: TurnGoal[] = [
  {
    turn: 5,
    title: "Build Your Army",
    description: "Train at least 200 soldiers",
    checkCondition: (state) => state.soldiers >= 200,
  },
  {
    turn: 10,
    title: "Expand Your Economy",
    description: "Own at least 7 sectors",
    checkCondition: (state) => state.sectorCount >= 7,
  },
  {
    turn: 15,
    title: "Establish Diplomacy",
    description: "Form a NAP with another empire",
    checkCondition: (state) => state.hasNAP,
  },
  {
    turn: 20,
    title: "First Strike",
    description: "Launch your first attack (protection ends!)",
    checkCondition: (state) => state.hasAttacked,
  },
  {
    turn: 30,
    title: "Research Progress",
    description: "Reach Research Level 3",
    checkCondition: (state) => state.researchLevel >= 3,
  },
];

/**
 * Get current turn goal.
 */
export function getCurrentTurnGoal(turn: number): TurnGoal | null {
  // Find the next uncompleted goal
  return TURN_GOALS.find((goal) => goal.turn >= turn) ?? null;
}
