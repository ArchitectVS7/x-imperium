/**
 * Generic SDK Orchestrator - Main Orchestrator
 *
 * Runs multi-agent workflows for task automation.
 */

import * as fs from "fs";
import { execSync } from "child_process";
import type {
  OrchestratorConfig,
  ExecutionState,
  ExecutionResult,
  Task,
  TaskGroup,
  WorkflowStep,
  AgentStepConfig,
  GateStepConfig,
  CommitStepConfig,
} from "./types";
import { createParser, getNextTask, getGroupProgress } from "./parsers";
import { runAgent, resolveTemplate, analyzeReview, analyzeQA } from "./agents";

// =============================================================================
// ORCHESTRATOR
// =============================================================================

export async function runOrchestrator(config: OrchestratorConfig): Promise<ExecutionResult> {
  const startTime = Date.now();
  const errors: ExecutionResult["errors"] = [];
  const learnings: string[] = [];

  // Initialize state
  const state: ExecutionState = {
    config,
    currentGroup: null,
    currentTask: null,
    completedTasks: [],
    context: {},
    outputs: {},
    transcript: [],
    startTime: new Date(),
    errors: [],
  };

  // Load context documents
  log("Loading context documents...", "info");
  for (const docPath of config.contextDocs) {
    if (fs.existsSync(docPath)) {
      const key = docPath.replace(/[^a-zA-Z0-9]/g, "_");
      state.context[key] = fs.readFileSync(docPath, "utf-8");
      log(`  Loaded: ${docPath}`, "success");
    } else {
      log(`  Not found: ${docPath}`, "warning");
    }
  }

  // Parse task file and find target group
  log("\nParsing task file...", "info");
  const content = fs.readFileSync(config.taskFile, "utf-8");
  const parser = createParser(config.taskFormat, config.customPattern);
  const groups = parser.parse(content);
  const group = parser.findGroup(groups, config.targetGroup);

  if (!group) {
    log(`Group not found: ${config.targetGroup}`, "error");
    return {
      success: false,
      groupId: config.targetGroup,
      tasksCompleted: 0,
      tasksFailed: 0,
      duration: Date.now() - startTime,
      transcript: state.transcript.join("\n"),
      errors: [{ taskId: "", stepId: "", error: "Group not found", timestamp: new Date(), recoverable: false }],
      learnings,
    };
  }

  state.currentGroup = group;
  const progress = getGroupProgress(group);
  log(`Found: ${group.id} - ${group.name}`, "success");
  log(`Progress: ${progress.completed}/${progress.total} tasks complete`, "info");

  // Process tasks
  let tasksCompleted = 0;
  let tasksFailed = 0;

  for (const task of group.tasks) {
    if (task.completed) {
      log(`\nSkipping completed: ${task.id}`, "info");
      continue;
    }

    log(`\n${"=".repeat(60)}`, "info");
    log(`TASK: ${task.id} - ${task.description}`, "info");
    log("=".repeat(60), "info");

    state.currentTask = task;
    state.outputs = {}; // Reset per task

    try {
      // Run workflow for this task
      await runWorkflow(config.workflow, task, group, state, config);

      // Mark complete
      task.completed = true;
      state.completedTasks.push(task.id);
      tasksCompleted++;

      log(`\n✅ Task ${task.id} complete`, "success");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`\n❌ Task ${task.id} failed: ${errorMsg}`, "error");

      tasksFailed++;
      errors.push({
        taskId: task.id,
        stepId: "unknown",
        error: errorMsg,
        timestamp: new Date(),
        recoverable: true,
      });

      if (config.stopOnFailure) {
        log("Stopping due to failure (stopOnFailure=true)", "warning");
        break;
      }
    }
  }

  // Update knowledge base
  if (config.knowledgeBase && fs.existsSync(config.knowledgeBase)) {
    log("\nUpdating knowledge base...", "info");
    appendToKnowledgeBase(config.knowledgeBase, group, tasksCompleted, tasksFailed, learnings);
  }

  const result: ExecutionResult = {
    success: tasksFailed === 0,
    groupId: group.id,
    tasksCompleted,
    tasksFailed,
    duration: Date.now() - startTime,
    transcript: state.transcript.join("\n"),
    errors,
    learnings,
  };

  // Final summary
  log("\n" + "=".repeat(60), "info");
  log("SUMMARY", "info");
  log("=".repeat(60), "info");
  log(`Group: ${group.id} - ${group.name}`, "info");
  log(`Completed: ${tasksCompleted}`, "success");
  log(`Failed: ${tasksFailed}`, tasksFailed > 0 ? "error" : "info");
  log(`Duration: ${(result.duration / 1000).toFixed(1)}s`, "info");

  return result;
}

// =============================================================================
// WORKFLOW EXECUTION
// =============================================================================

async function runWorkflow(
  steps: WorkflowStep[],
  task: Task,
  group: TaskGroup,
  state: ExecutionState,
  config: OrchestratorConfig
): Promise<void> {
  let currentStepIndex = 0;
  const stepMap = new Map(steps.map((s, i) => [s.id, i]));

  while (currentStepIndex < steps.length) {
    const step = steps[currentStepIndex];
    if (!step) break;

    log(`\n[Step: ${step.name}]`, "info");

    try {
      const nextStep = await executeStep(step, task, group, state, config);

      if (nextStep && stepMap.has(nextStep)) {
        currentStepIndex = stepMap.get(nextStep)!;
      } else {
        currentStepIndex++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Step failed: ${errorMsg}`, "error");
      throw error;
    }
  }
}

async function executeStep(
  step: WorkflowStep,
  task: Task,
  group: TaskGroup,
  state: ExecutionState,
  config: OrchestratorConfig
): Promise<string | null> {
  switch (step.type) {
    case "agent":
      return await executeAgentStep(step, task, group, state, config);
    case "gate":
      return await executeGateStep(step, task, group, state, config);
    case "decision":
      return executeDecisionStep(step, task, group, state);
    case "commit":
      return executeCommitStep(step, task, group, state, config);
    case "notify":
      return executeNotifyStep(step);
    default:
      log(`Unknown step type: ${step.type}`, "warning");
      return null;
  }
}

async function executeAgentStep(
  step: WorkflowStep,
  task: Task,
  group: TaskGroup,
  state: ExecutionState,
  config: OrchestratorConfig
): Promise<string | null> {
  const stepConfig = step.config as AgentStepConfig;
  const agent = config.agents.find((a) => a.id === stepConfig.agentId);

  if (!agent) {
    throw new Error(`Agent not found: ${stepConfig.agentId}`);
  }

  // Resolve prompt template
  const prompt = resolveTemplate(stepConfig.taskPrompt, task, group, state);

  if (config.dryRun) {
    log(`[DRY RUN] Would run agent: ${agent.name}`, "info");
    state.outputs[stepConfig.outputKey] = "[DRY RUN OUTPUT]";
    return null;
  }

  const result = await runAgent(agent, prompt, state);
  state.outputs[stepConfig.outputKey] = result.output;
  state.transcript.push(`## ${step.name}\n\n${result.output}\n`);

  log(`Agent ${agent.name} responded (${result.usage.output} tokens)`, "success");

  return null;
}

async function executeGateStep(
  step: WorkflowStep,
  task: Task,
  group: TaskGroup,
  state: ExecutionState,
  config: OrchestratorConfig
): Promise<string | null> {
  const stepConfig = step.config as GateStepConfig;
  let attempts = 0;
  const maxAttempts = (stepConfig.maxRetries || 0) + 1;

  while (attempts < maxAttempts) {
    attempts++;
    let allPassed = true;

    for (const cmd of stepConfig.commands) {
      log(`  Running: ${cmd}`, "info");

      if (config.dryRun) {
        log(`  [DRY RUN] Would run: ${cmd}`, "info");
        continue;
      }

      try {
        execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
        log(`  ✓ ${cmd}`, "success");
      } catch (error) {
        log(`  ✗ ${cmd}`, "error");
        allPassed = false;

        if (stepConfig.failAction === "stop") {
          throw new Error(`Quality gate failed: ${cmd}`);
        }
      }
    }

    if (allPassed) {
      return null;
    }

    if (attempts < maxAttempts) {
      log(`  Retrying (${attempts}/${maxAttempts})...`, "warning");
    }
  }

  if (stepConfig.failAction === "stop") {
    throw new Error("Quality gates failed after retries");
  }

  return null;
}

function executeDecisionStep(
  step: WorkflowStep,
  task: Task,
  group: TaskGroup,
  state: ExecutionState
): string | null {
  const stepConfig = step.config as { condition: string; onTrue: string; onFalse: string };

  // Simple condition evaluation
  const condition = resolveTemplate(stepConfig.condition, task, group, state);
  const result = evaluateCondition(condition, state);

  log(`  Condition: ${result ? "TRUE" : "FALSE"}`, "info");

  return result ? stepConfig.onTrue : stepConfig.onFalse;
}

function executeCommitStep(
  step: WorkflowStep,
  task: Task,
  group: TaskGroup,
  state: ExecutionState,
  config: OrchestratorConfig
): string | null {
  const stepConfig = step.config as CommitStepConfig;

  if (!config.commitPerTask) {
    log("Skipping commit (commitPerTask=false)", "info");
    return null;
  }

  const message = resolveTemplate(stepConfig.messageTemplate, task, group, state);
  const fullMessage = stepConfig.includeCoAuthor
    ? `${message}\n\n🤖 Generated with Claude SDK Orchestrator\n\nCo-Authored-By: Claude <noreply@anthropic.com>`
    : message;

  if (config.dryRun) {
    log(`[DRY RUN] Would commit: ${message}`, "info");
    return null;
  }

  try {
    execSync("git add -A", { encoding: "utf-8" });
    execSync(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
    log(`Committed: ${message}`, "success");
  } catch (error) {
    log("No changes to commit", "info");
  }

  return null;
}

function executeNotifyStep(step: WorkflowStep): string | null {
  const stepConfig = step.config as { message: string; level: string };
  log(stepConfig.message, stepConfig.level as "info" | "success" | "warning" | "error");
  return null;
}

// =============================================================================
// HELPERS
// =============================================================================

function evaluateCondition(condition: string, state: ExecutionState): boolean {
  // Handle common patterns
  if (condition.includes(".includes(")) {
    const match = condition.match(/(.+)\.includes\(['"](.+)['"]\)/);
    if (match) {
      const value = String(state.outputs[match[1].replace("outputs.", "")] || "");
      return value.includes(match[2]);
    }
  }

  // Direct boolean
  return condition === "true";
}

function appendToKnowledgeBase(
  path: string,
  group: TaskGroup,
  completed: number,
  failed: number,
  learnings: string[]
): void {
  const entry = `
### Run: ${group.id} - ${new Date().toISOString()}
- Completed: ${completed}
- Failed: ${failed}
- Learnings: ${learnings.length > 0 ? learnings.join(", ") : "TBD"}
`;

  const content = fs.readFileSync(path, "utf-8");
  const updatedContent = content.replace(
    /^(### Run Log\n)/m,
    `$1\n${entry}`
  );
  fs.writeFileSync(path, updatedContent);
}

function log(message: string, level: "info" | "success" | "warning" | "error" = "info"): void {
  const icons = {
    info: ".",
    success: "+",
    warning: "!",
    error: "x",
  };
  console.log(`[${icons[level]}] ${message}`);
}
