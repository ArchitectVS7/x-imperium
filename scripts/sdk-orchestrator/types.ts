/**
 * Generic SDK Orchestrator - Type Definitions
 *
 * Repo-agnostic types for multi-agent automation workflows.
 */

// =============================================================================
// TASK CONFIGURATION
// =============================================================================

export type TaskFormat =
  | "milestone"   // ## MILESTONE 7: Name
  | "epic"        // ## EPIC-123: Name
  | "phase"       // ## Phase 1: Name
  | "story"       // ## STORY-456: Name
  | "sprint"      // ## Sprint 5: Name
  | "custom";     // User-defined regex

export interface TaskGroup {
  id: string;           // "M7", "EPIC-123", "Phase-1"
  name: string;         // "Market & Diplomacy"
  status: "pending" | "in_progress" | "complete";
  tasks: Task[];
}

export interface Task {
  id: string;           // "M7-1", "EPIC-123-1"
  groupId: string;      // Parent group
  description: string;
  completed: boolean;
  line: number;         // Line in source file
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ORCHESTRATOR CONFIGURATION
// =============================================================================

export interface OrchestratorConfig {
  // Source files
  taskFile: string;              // "docs/milestones.md"
  contextDocs: string[];         // ["docs/PRD.md", "docs/TROUBLESHOOTING.md"]

  // Task parsing
  taskFormat: TaskFormat;
  targetGroup: string;           // "Milestone 8", "Epic 17", "Phase 2"
  customPattern?: string;        // For custom format: "## TASK-\\d+: (.+)"

  // Agent configuration
  agents: AgentConfig[];

  // Workflow
  workflow: WorkflowStep[];

  // Quality gates
  qualityGates: QualityGate[];

  // Output
  outputDir?: string;            // Where to save transcripts
  knowledgeBase?: string;        // "docs/AUTOMATION_KNOWLEDGE_BASE.md"

  // Behavior
  stopOnFailure: boolean;
  commitPerTask: boolean;
  dryRun: boolean;
}

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

export type AgentRole =
  | "developer"
  | "reviewer"
  | "qa"
  | "architect"
  | "security"
  | "product"
  | "ux"
  | "devops"
  | "custom";

export interface AgentConfig {
  id: string;                    // "dev-agent"
  role: AgentRole;
  name: string;                  // "Senior Developer"
  systemPrompt: string;          // Full prompt or path to .md file
  model?: string;                // "claude-sonnet-4-20250514" default
  temperature?: number;          // 0-1, default 0.7
}

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

export type WorkflowStepType =
  | "agent"          // Run an agent
  | "gate"           // Quality gate check
  | "decision"       // Branch based on condition
  | "parallel"       // Run steps in parallel
  | "panel"          // Multi-agent discussion
  | "commit"         // Git commit
  | "notify";        // Log/notify

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  config: WorkflowStepConfig;
}

export type WorkflowStepConfig =
  | AgentStepConfig
  | GateStepConfig
  | DecisionStepConfig
  | ParallelStepConfig
  | PanelStepConfig
  | CommitStepConfig
  | NotifyStepConfig;

export interface AgentStepConfig {
  agentId: string;
  taskPrompt: string;            // Template: "Implement: {{task.description}}"
  contextKeys?: string[];        // Which context docs to include
  outputKey: string;             // Store result as this key
}

export interface GateStepConfig {
  commands: string[];            // ["npm run typecheck", "npm run test"]
  failAction: "stop" | "continue" | "retry";
  maxRetries?: number;
}

export interface DecisionStepConfig {
  condition: string;             // "{{review.hasCriticalIssues}}"
  onTrue: string;                // Step ID to jump to
  onFalse: string;               // Step ID to jump to
}

export interface ParallelStepConfig {
  steps: string[];               // Step IDs to run in parallel
}

export interface PanelStepConfig {
  agentIds: string[];            // Which agents participate
  topic: string;                 // "Review implementation of {{task.description}}"
  rounds: number;                // Discussion rounds
  outputKey: string;
}

export interface CommitStepConfig {
  messageTemplate: string;       // "{{group.id}}: {{task.description}}"
  includeCoAuthor: boolean;
}

export interface NotifyStepConfig {
  message: string;
  level: "info" | "success" | "warning" | "error";
}

// =============================================================================
// QUALITY GATES
// =============================================================================

export interface QualityGate {
  id: string;
  name: string;
  command: string;
  required: boolean;
  timeout?: number;              // ms
}

// =============================================================================
// EXECUTION STATE
// =============================================================================

export interface ExecutionState {
  config: OrchestratorConfig;
  currentGroup: TaskGroup | null;
  currentTask: Task | null;
  completedTasks: string[];
  context: Record<string, string>;  // Loaded docs
  outputs: Record<string, unknown>; // Agent outputs
  transcript: string[];
  startTime: Date;
  errors: ExecutionError[];
}

export interface ExecutionError {
  taskId: string;
  stepId: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}

// =============================================================================
// RESULTS
// =============================================================================

export interface ExecutionResult {
  success: boolean;
  groupId: string;
  tasksCompleted: number;
  tasksFailed: number;
  duration: number;              // ms
  transcript: string;
  errors: ExecutionError[];
  learnings: string[];           // Auto-extracted insights
}
