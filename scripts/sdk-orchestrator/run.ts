#!/usr/bin/env npx tsx
/**
 * Generic SDK Orchestrator - CLI Entry Point
 *
 * Usage:
 *   npx tsx scripts/sdk-orchestrator/run.ts                    # Interactive setup
 *   npx tsx scripts/sdk-orchestrator/run.ts --config config.json  # Use config file
 *   npx tsx scripts/sdk-orchestrator/run.ts --quick "M8"       # Quick run with defaults
 *
 * Examples:
 *   npx tsx scripts/sdk-orchestrator/run.ts
 *   npx tsx scripts/sdk-orchestrator/run.ts --quick "Milestone 8"
 *   npx tsx scripts/sdk-orchestrator/run.ts --config .orchestrator-config.json
 *   npx tsx scripts/sdk-orchestrator/run.ts --dry-run --quick "Phase 2"
 */

import * as fs from "fs";
import { buildConfig, loadConfig } from "./config";
import { runOrchestrator } from "./orchestrator";
import type { OrchestratorConfig } from "./types";
import { createParser, summarizeGroups } from "./parsers";

// =============================================================================
// CLI
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║           SDK ORCHESTRATOR - Multi-Agent Automation         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  let config: OrchestratorConfig;

  // Parse arguments
  const configIndex = args.indexOf("--config");
  const quickIndex = args.indexOf("--quick");
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help") || args.includes("-h");

  if (help) {
    showHelp();
    return;
  }

  if (configIndex !== -1 && args[configIndex + 1]) {
    // Load from config file
    const configPath = args[configIndex + 1];
    console.log(`Loading config from: ${configPath}\n`);
    config = loadConfig(configPath);
  } else if (quickIndex !== -1 && args[quickIndex + 1]) {
    // Quick mode with defaults
    const target = args[quickIndex + 1];
    console.log(`Quick mode: ${target}\n`);
    config = await quickConfig(target);
  } else {
    // Interactive setup
    config = await buildConfig();
  }

  // Apply dry-run override
  if (dryRun) {
    config.dryRun = true;
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Confirm before running
  console.log("\n────────────────────────────────────────────");
  console.log("Configuration Summary:");
  console.log("────────────────────────────────────────────");
  console.log(`Task File:    ${config.taskFile}`);
  console.log(`Target:       ${config.targetGroup}`);
  console.log(`Format:       ${config.taskFormat}`);
  console.log(`Context Docs: ${config.contextDocs.length}`);
  console.log(`Agents:       ${config.agents.map((a) => a.name).join(", ")}`);
  console.log(`Dry Run:      ${config.dryRun}`);
  console.log("────────────────────────────────────────────\n");

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("⚠️  ANTHROPIC_API_KEY not set in environment");
    console.log("Export it or add to .env file:\n");
    console.log("  export ANTHROPIC_API_KEY=sk-ant-...\n");
    process.exit(1);
  }

  // Run orchestrator
  console.log("Starting orchestration...\n");
  const result = await runOrchestrator(config);

  // Final report
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                      FINAL REPORT                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  console.log(`Status:    ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`Group:     ${result.groupId}`);
  console.log(`Completed: ${result.tasksCompleted}`);
  console.log(`Failed:    ${result.tasksFailed}`);
  console.log(`Duration:  ${(result.duration / 1000 / 60).toFixed(1)} minutes`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach((e) => {
      console.log(`  - ${e.taskId}: ${e.error}`);
    });
  }

  if (result.learnings.length > 0) {
    console.log("\nLearnings:");
    result.learnings.forEach((l) => {
      console.log(`  - ${l}`);
    });
  }

  console.log("\n");

  process.exit(result.success ? 0 : 1);
}

// =============================================================================
// QUICK CONFIG
// =============================================================================

async function quickConfig(target: string): Promise<OrchestratorConfig> {
  // Detect task file
  const possibleFiles = [
    "docs/milestones.md",
    "docs/MILESTONES.md",
    "MILESTONES.md",
    "docs/backlog.md",
    "docs/BACKLOG.md",
    "docs/epics.md",
  ];

  let taskFile = possibleFiles.find((f) => fs.existsSync(f));
  if (!taskFile) {
    console.log("❌ No task file found. Tried:", possibleFiles.join(", "));
    process.exit(1);
  }

  // Detect format from content
  const content = fs.readFileSync(taskFile, "utf-8");
  let taskFormat: OrchestratorConfig["taskFormat"] = "milestone";

  if (content.includes("## EPIC")) taskFormat = "epic";
  else if (content.includes("## Phase")) taskFormat = "phase";
  else if (content.includes("## STORY")) taskFormat = "story";
  else if (content.includes("## Sprint")) taskFormat = "sprint";

  // Detect context docs
  const contextDocs: string[] = [];
  const possibleContext = ["docs/PRD.md", "docs/prd.md", "README.md", "docs/README.md"];
  possibleContext.forEach((f) => {
    if (fs.existsSync(f)) contextDocs.push(f);
  });

  // Verify target exists
  const parser = createParser(taskFormat);
  const groups = parser.parse(content);
  const group = parser.findGroup(groups, target);

  if (!group) {
    console.log(`❌ Group not found: ${target}`);
    console.log("\nAvailable groups:\n");
    console.log(summarizeGroups(groups));
    process.exit(1);
  }

  console.log(`Found: ${group.id} - ${group.name}`);

  // Return default config
  const { loadConfig } = await import("./config");
  return {
    taskFile,
    contextDocs,
    taskFormat,
    targetGroup: group.id,
    agents: [
      {
        id: "developer",
        role: "developer",
        name: "Developer",
        systemPrompt: "You are a senior developer. Implement features according to specs. Use TypeScript strict mode. Add data-testid to UI elements.",
      },
      {
        id: "reviewer",
        role: "reviewer",
        name: "Reviewer",
        systemPrompt: "You are an adversarial code reviewer. Find bugs, security issues, spec violations. Mark issues as CRITICAL/HIGH/MEDIUM/LOW.",
      },
      {
        id: "qa",
        role: "qa",
        name: "QA",
        systemPrompt: "You are a QA engineer. Validate implementations. Check test coverage. Provide PASS or FAIL verdict.",
      },
    ],
    workflow: [
      {
        id: "implement",
        type: "agent",
        name: "Implement",
        config: { agentId: "developer", taskPrompt: "Implement: {{task.description}}\n\nContext:\n{{context}}", outputKey: "implementation" },
      },
      {
        id: "review",
        type: "agent",
        name: "Review",
        config: { agentId: "reviewer", taskPrompt: "Review:\n\n{{outputs.implementation}}", outputKey: "review" },
      },
      {
        id: "gates",
        type: "gate",
        name: "Quality Gates",
        config: { commands: ["npm run typecheck", "npm run lint", "npm run test -- --run"], failAction: "continue" },
      },
      {
        id: "commit",
        type: "commit",
        name: "Commit",
        config: { messageTemplate: "{{group.id}}: {{task.description}}", includeCoAuthor: true },
      },
    ],
    qualityGates: [
      { id: "typecheck", name: "TypeScript", command: "npm run typecheck", required: true },
      { id: "lint", name: "ESLint", command: "npm run lint", required: true },
      { id: "test", name: "Tests", command: "npm run test -- --run", required: true },
    ],
    stopOnFailure: false,
    commitPerTask: true,
    dryRun: false,
  };
}

// =============================================================================
// HELP
// =============================================================================

function showHelp(): void {
  console.log(`
SDK Orchestrator - Multi-Agent Task Automation

USAGE:
  npx tsx scripts/sdk-orchestrator/run.ts [OPTIONS]

OPTIONS:
  --config <path>    Load configuration from JSON file
  --quick <target>   Quick run with defaults (e.g., "M8", "Phase 2")
  --dry-run          Preview without making changes
  --help, -h         Show this help

EXAMPLES:
  # Interactive setup
  npx tsx scripts/sdk-orchestrator/run.ts

  # Quick run for Milestone 8
  npx tsx scripts/sdk-orchestrator/run.ts --quick "M8"

  # Dry run to preview
  npx tsx scripts/sdk-orchestrator/run.ts --dry-run --quick "Phase 2"

  # Use saved config
  npx tsx scripts/sdk-orchestrator/run.ts --config .orchestrator-config.json

ENVIRONMENT:
  ANTHROPIC_API_KEY  Required. Your Anthropic API key.

CONFIG FILE FORMAT:
  {
    "taskFile": "docs/milestones.md",
    "contextDocs": ["docs/PRD.md"],
    "taskFormat": "milestone",
    "targetGroup": "M8",
    "agents": [...],
    "workflow": [...],
    "qualityGates": [...],
    "stopOnFailure": true,
    "commitPerTask": true,
    "dryRun": false
  }
`);
}

// =============================================================================
// RUN
// =============================================================================

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
