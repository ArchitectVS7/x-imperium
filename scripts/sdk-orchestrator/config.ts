/**
 * Generic SDK Orchestrator - Interactive Configuration
 *
 * Builds configuration through interactive prompts or config file.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import type {
  OrchestratorConfig,
  TaskFormat,
  AgentConfig,
  WorkflowStep,
  QualityGate,
} from "./types";
import { createParser, summarizeGroups } from "./parsers";

// =============================================================================
// INTERACTIVE BUILDER
// =============================================================================

export async function buildConfig(): Promise<OrchestratorConfig> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, resolve));

  const askWithDefault = async (question: string, defaultVal: string): Promise<string> => {
    const answer = await ask(`${question} [${defaultVal}]: `);
    return answer.trim() || defaultVal;
  };

  console.log("\n=== SDK Orchestrator Configuration ===\n");

  // Step 1: Task file
  console.log("STEP 1: Task Source\n");
  const taskFile = await askWithDefault(
    "Path to task file (milestones, backlog, etc.)",
    "docs/milestones.md"
  );

  if (!fs.existsSync(taskFile)) {
    console.log(`\n⚠️  File not found: ${taskFile}`);
    console.log("Please provide a valid path.\n");
    rl.close();
    process.exit(1);
  }

  // Step 2: Task format
  console.log("\nSTEP 2: Task Format\n");
  console.log("Supported formats:");
  console.log("  1. milestone  - ## MILESTONE 7: Name");
  console.log("  2. epic       - ## EPIC-123: Name");
  console.log("  3. phase      - ## Phase 1: Name");
  console.log("  4. story      - ## STORY-456: Name");
  console.log("  5. sprint     - ## Sprint 5: Name");
  console.log("  6. custom     - Your own regex pattern\n");

  const formatChoice = await askWithDefault("Select format (1-6)", "1");
  const formatMap: Record<string, TaskFormat> = {
    "1": "milestone",
    "2": "epic",
    "3": "phase",
    "4": "story",
    "5": "sprint",
    "6": "custom",
  };
  const taskFormat = formatMap[formatChoice] || "milestone";

  let customPattern: string | undefined;
  if (taskFormat === "custom") {
    customPattern = await ask("Enter regex pattern (e.g., ^## TASK-(\\d+): (.+)$): ");
  }

  // Parse and show available groups
  const content = fs.readFileSync(taskFile, "utf-8");
  const parser = createParser(taskFormat, customPattern);
  const groups = parser.parse(content);

  console.log("\nFound task groups:\n");
  console.log(summarizeGroups(groups));
  console.log();

  // Step 3: Target group
  console.log("STEP 3: Target Group\n");
  const targetGroup = await ask("Which group to automate (e.g., 8, M8, Milestone 8): ");

  const group = parser.findGroup(groups, targetGroup);
  if (!group) {
    console.log(`\n⚠️  Group not found: ${targetGroup}`);
    rl.close();
    process.exit(1);
  }

  console.log(`\nSelected: ${group.id} - ${group.name}`);
  console.log(`Tasks: ${group.tasks.length}`);
  console.log(`Status: ${group.status}\n`);

  // Step 4: Context documents
  console.log("STEP 4: Context Documents\n");
  console.log("Add documents to provide context (PRD, troubleshooting, etc.)");
  console.log("Enter paths separated by commas, or leave empty for none.\n");

  const contextInput = await askWithDefault("Context documents", "docs/PRD.md");
  const contextDocs = contextInput
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && fs.existsSync(p));

  console.log(`\nLoaded ${contextDocs.length} context documents.`);

  // Step 5: Quality gates
  console.log("\nSTEP 5: Quality Gates\n");
  const useDefaultGates = await askWithDefault("Use default quality gates? (y/n)", "y");

  let qualityGates: QualityGate[];
  if (useDefaultGates.toLowerCase() === "y") {
    qualityGates = DEFAULT_QUALITY_GATES;
    console.log("Using: typecheck, lint, test, build");
  } else {
    console.log("Enter commands separated by commas:");
    const gateInput = await ask("Quality gate commands: ");
    qualityGates = gateInput.split(",").map((cmd, i) => ({
      id: `gate-${i + 1}`,
      name: cmd.trim(),
      command: cmd.trim(),
      required: true,
    }));
  }

  // Step 6: Workflow options
  console.log("\nSTEP 6: Workflow Options\n");

  const commitPerTask = (await askWithDefault("Commit after each task? (y/n)", "y")).toLowerCase() === "y";
  const stopOnFailure = (await askWithDefault("Stop on test failure? (y/n)", "y")).toLowerCase() === "y";
  const dryRun = (await askWithDefault("Dry run (no commits)? (y/n)", "n")).toLowerCase() === "y";

  // Step 7: Agents
  console.log("\nSTEP 7: Agent Configuration\n");
  const useDefaultAgents = await askWithDefault("Use default agents (dev, reviewer, qa)? (y/n)", "y");

  let agents: AgentConfig[];
  if (useDefaultAgents.toLowerCase() === "y") {
    agents = DEFAULT_AGENTS;
    console.log("Using: developer, reviewer, qa");
  } else {
    console.log("Custom agent configuration not implemented yet.");
    console.log("Using defaults.");
    agents = DEFAULT_AGENTS;
  }

  rl.close();

  // Build config
  const config: OrchestratorConfig = {
    taskFile,
    contextDocs,
    taskFormat,
    targetGroup: group.id,
    customPattern,
    agents,
    workflow: DEFAULT_WORKFLOW,
    qualityGates,
    knowledgeBase: "docs/AUTOMATION_KNOWLEDGE_BASE.md",
    stopOnFailure,
    commitPerTask,
    dryRun,
  };

  // Save config
  const configPath = ".orchestrator-config.json";
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n✅ Configuration saved to ${configPath}`);
  console.log("You can edit this file and reuse it.\n");

  return config;
}

// =============================================================================
// LOAD FROM FILE
// =============================================================================

export function loadConfig(configPath: string): OrchestratorConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_QUALITY_GATES: QualityGate[] = [
  { id: "typecheck", name: "TypeScript", command: "npm run typecheck", required: true },
  { id: "lint", name: "ESLint", command: "npm run lint", required: true },
  { id: "test", name: "Unit Tests", command: "npm run test -- --run", required: true },
  { id: "build", name: "Build", command: "npm run build", required: true },
];

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: "developer",
    role: "developer",
    name: "Senior Developer",
    systemPrompt: `You are a senior developer. Your job is to implement features according to specifications.

## Rules
1. Follow existing code patterns in the codebase
2. Use TypeScript strict mode - no 'any' types
3. Add data-testid to all interactive UI elements
4. Write clean, maintainable code
5. Check specs before implementing

## Output
Provide the implementation plan, then the code changes needed.`,
  },
  {
    id: "reviewer",
    role: "reviewer",
    name: "Adversarial Reviewer",
    systemPrompt: `You are an adversarial code reviewer. Assume every line has a bug.

## Checklist
1. PRD/Spec Compliance - Do formulas and values match exactly?
2. Security - SQL injection, XSS, input validation?
3. TypeScript - Any 'any' types? Null handling?
4. Logic Bugs - Off-by-one? Race conditions? Edge cases?
5. Performance - N+1 queries? Unnecessary re-renders?

## Output Format
For each issue found:
- CRITICAL/HIGH/MEDIUM/LOW: Description
- Location: file:line
- Fix: Suggested resolution

If no issues: "APPROVED - No critical issues found."`,
  },
  {
    id: "qa",
    role: "qa",
    name: "QA Engineer",
    systemPrompt: `You are a QA engineer. Validate implementations against requirements.

## Responsibilities
1. Verify all acceptance criteria are met
2. Check test coverage for new code
3. Ensure quality gates pass
4. Validate documentation updates

## Output
Provide a QA report:
- Tests Run: list of test suites
- Coverage: new code coverage %
- Issues Found: any problems
- Verdict: PASS or FAIL with reasons`,
  },
];

const DEFAULT_WORKFLOW: WorkflowStep[] = [
  {
    id: "implement",
    type: "agent",
    name: "Implement Task",
    config: {
      agentId: "developer",
      taskPrompt: "Implement: {{task.description}}\n\nContext:\n{{context}}",
      contextKeys: ["prd"],
      outputKey: "implementation",
    },
  },
  {
    id: "review",
    type: "agent",
    name: "Code Review",
    config: {
      agentId: "reviewer",
      taskPrompt: "Review this implementation:\n\n{{outputs.implementation}}",
      outputKey: "review",
    },
  },
  {
    id: "check-review",
    type: "decision",
    name: "Check Review",
    config: {
      condition: "{{outputs.review.includes('CRITICAL')}}",
      onTrue: "fix-issues",
      onFalse: "quality-gates",
    },
  },
  {
    id: "fix-issues",
    type: "agent",
    name: "Fix Issues",
    config: {
      agentId: "developer",
      taskPrompt: "Fix these review issues:\n\n{{outputs.review}}",
      outputKey: "implementation",
    },
  },
  {
    id: "quality-gates",
    type: "gate",
    name: "Quality Gates",
    config: {
      commands: ["npm run typecheck", "npm run lint", "npm run test -- --run", "npm run build"],
      failAction: "retry",
      maxRetries: 2,
    },
  },
  {
    id: "qa-review",
    type: "agent",
    name: "QA Review",
    config: {
      agentId: "qa",
      taskPrompt: "Validate implementation:\n\nTask: {{task.description}}\n\nImplementation: {{outputs.implementation}}",
      outputKey: "qa",
    },
  },
  {
    id: "commit",
    type: "commit",
    name: "Commit Changes",
    config: {
      messageTemplate: "{{group.id}}: {{task.description}}",
      includeCoAuthor: true,
    },
  },
];
