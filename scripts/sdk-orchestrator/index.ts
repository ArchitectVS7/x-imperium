/**
 * Generic SDK Orchestrator
 *
 * A repo-agnostic multi-agent automation system using the Anthropic SDK.
 *
 * Features:
 * - Supports multiple task formats (milestones, epics, phases, stories, sprints)
 * - Multi-agent workflow (developer, reviewer, QA, custom)
 * - Panel discussions (multiple agents debate)
 * - Quality gates integration
 * - Interactive or config-based setup
 *
 * Usage:
 *   npm run orchestrate                    # Interactive setup
 *   npm run orchestrate:quick "M8"         # Quick run
 *   npm run orchestrate:dry "Phase 2"      # Dry run preview
 */

export * from "./types";
export * from "./parsers";
export * from "./agents";
export * from "./config";
export * from "./orchestrator";
