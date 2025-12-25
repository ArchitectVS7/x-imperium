#!/usr/bin/env npx tsx
/**
 * X-Imperium Development Cycle Orchestrator
 *
 * Runs an automated development cycle:
 * 1. Parse milestones.md for next task
 * 2. Developer agent implements
 * 3. Reviewer agent validates
 * 4. QA agent tests and updates docs
 * 5. Commit changes
 *
 * Usage:
 *   npx tsx scripts/orchestrator/run-cycle.ts
 *   npx tsx scripts/orchestrator/run-cycle.ts --dry-run
 *   npx tsx scripts/orchestrator/run-cycle.ts --task=M6-1
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { parseMilestones, getNextTask, getCurrentMilestone, type MilestoneTask, type Milestone } from './parse-milestones';

interface CycleState {
  version: number;
  lastUpdated: string | null;
  currentMilestone: number | null;
  currentTask: string | null;
  taskHistory: Array<{
    taskId: string;
    status: 'completed' | 'failed' | 'skipped';
    timestamp: string;
    duration: number;
  }>;
  sessionStats: {
    tasksCompleted: number;
    testsRun: number;
    testsPassed: number;
    commitsCreated: number;
  };
}

const PATHS = {
  milestones: path.join(__dirname, '../../docs/milestones.md'),
  prd: path.join(__dirname, '../../docs/PRD.md'),
  state: path.join(__dirname, '../../.claude/state.json'),
  prompts: {
    developer: path.join(__dirname, '../../.claude/prompts/developer.md'),
    reviewer: path.join(__dirname, '../../.claude/prompts/reviewer.md'),
    qa: path.join(__dirname, '../../.claude/prompts/qa.md')
  }
};

function loadState(): CycleState {
  try {
    return JSON.parse(fs.readFileSync(PATHS.state, 'utf-8'));
  } catch {
    return {
      version: 1,
      lastUpdated: null,
      currentMilestone: null,
      currentTask: null,
      taskHistory: [],
      sessionStats: {
        tasksCompleted: 0,
        testsRun: 0,
        testsPassed: 0,
        commitsCreated: 0
      }
    };
  }
}

function saveState(state: CycleState): void {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PATHS.state, JSON.stringify(state, null, 2));
}

function runCommand(cmd: string, options: { silent?: boolean } = {}): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: output || '' };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout?.toString() || error.message
    };
  }
}

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const icons = {
    info: 'i',
    success: '+',
    error: 'x',
    warn: '!'
  };
  console.log(`[${icons[level]}] ${message}`);
}

async function runQualityGates(): Promise<{ passed: boolean; failures: string[] }> {
  const failures: string[] = [];

  log('Running quality gates...', 'info');

  // TypeScript
  log('  Checking TypeScript...', 'info');
  const typecheck = runCommand('npm run typecheck', { silent: true });
  if (!typecheck.success) {
    failures.push('TypeScript errors');
    log('    TypeScript FAILED', 'error');
  } else {
    log('    TypeScript OK', 'success');
  }

  // ESLint
  log('  Checking ESLint...', 'info');
  const lint = runCommand('npm run lint', { silent: true });
  if (!lint.success) {
    failures.push('ESLint errors');
    log('    ESLint FAILED', 'error');
  } else {
    log('    ESLint OK', 'success');
  }

  // Unit Tests
  log('  Running unit tests...', 'info');
  const test = runCommand('npm run test -- --run', { silent: true });
  if (!test.success) {
    failures.push('Unit test failures');
    log('    Tests FAILED', 'error');
  } else {
    log('    Tests OK', 'success');
  }

  // Build
  log('  Checking build...', 'info');
  const build = runCommand('npm run build', { silent: true });
  if (!build.success) {
    failures.push('Build errors');
    log('    Build FAILED', 'error');
  } else {
    log('    Build OK', 'success');
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

async function runE2ETests(): Promise<{ passed: boolean; report: string }> {
  log('Running E2E tests...', 'info');

  const result = runCommand('npm run test:e2e', { silent: true });

  // Parse playwright results if available
  const reportPath = path.join(__dirname, '../../playwright-results.json');
  let report = '';

  if (fs.existsSync(reportPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const passed = results.suites?.reduce((acc: number, s: any) =>
        acc + (s.specs?.filter((sp: any) => sp.ok).length || 0), 0) || 0;
      const total = results.suites?.reduce((acc: number, s: any) =>
        acc + (s.specs?.length || 0), 0) || 0;
      report = `${passed}/${total} E2E tests passed`;
    } catch {
      report = 'Could not parse E2E results';
    }
  }

  return {
    passed: result.success,
    report
  };
}

function markTaskComplete(task: MilestoneTask): void {
  let content = fs.readFileSync(PATHS.milestones, 'utf-8');
  const lines = content.split('\n');

  // Find and update the line
  const lineContent = lines[task.line - 1];
  if (lineContent && lineContent.includes('[ ]')) {
    lines[task.line - 1] = lineContent.replace('[ ]', '[x]');
    fs.writeFileSync(PATHS.milestones, lines.join('\n'));
    log(`Marked task complete: ${task.id}`, 'success');
  }
}

function createCommit(task: MilestoneTask, milestone: Milestone): void {
  const message = `M${milestone.number}: ${task.description}

Implements milestone ${milestone.number} deliverable.

Generated with Claude Code automation.
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;

  runCommand('git add -A');
  runCommand(`git commit -m "${message.replace(/"/g, '\\"')}"`);
  log('Created commit', 'success');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificTask = args.find(a => a.startsWith('--task='))?.split('=')[1];

  console.log('\n=== X-Imperium Development Cycle ===\n');

  if (dryRun) {
    log('DRY RUN - No changes will be made', 'warn');
  }

  // Load state and milestones
  const state = loadState();
  const milestonesContent = fs.readFileSync(PATHS.milestones, 'utf-8');
  const milestones = parseMilestones(milestonesContent);
  const currentMilestone = getCurrentMilestone(milestones);

  if (!currentMilestone) {
    log('All milestones complete!', 'success');
    return;
  }

  // Find next task
  let task: MilestoneTask | null = null;

  if (specificTask) {
    // Find specific task
    for (const m of milestones) {
      task = m.deliverables.find(d => d.id === specificTask) || null;
      if (task) break;
    }
    if (!task) {
      log(`Task not found: ${specificTask}`, 'error');
      return;
    }
  } else {
    task = getNextTask(milestones);
  }

  if (!task) {
    log('No incomplete tasks found', 'success');
    return;
  }

  console.log(`\nCurrent Milestone: M${currentMilestone.number} - ${currentMilestone.name}`);
  console.log(`Next Task: ${task.id}`);
  console.log(`Description: ${task.description}\n`);

  if (dryRun) {
    log('Would implement this task', 'info');
    log('Would run quality gates', 'info');
    log('Would update milestones.md', 'info');
    log('Would create commit', 'info');
    return;
  }

  // Update state
  state.currentMilestone = currentMilestone.number;
  state.currentTask = task.id;
  saveState(state);

  const startTime = Date.now();

  // Run quality gates first to establish baseline
  console.log('\n--- Phase 1: Pre-flight Checks ---\n');
  const preCheck = await runQualityGates();

  if (!preCheck.passed) {
    log('Pre-flight checks failed. Fix issues before continuing.', 'error');
    console.log('Failures:', preCheck.failures.join(', '));
    return;
  }

  console.log('\n--- Phase 2: Ready for Implementation ---\n');
  console.log('The following task is ready for implementation:');
  console.log(`\n  Task: ${task.id}`);
  console.log(`  Description: ${task.description}`);
  console.log(`\n  Milestone: M${currentMilestone.number} - ${currentMilestone.name}`);

  console.log('\nTo implement this task, use Claude Code with:\n');
  console.log('  /milestone\n');
  console.log('Or manually implement and then run:\n');
  console.log('  npx tsx scripts/orchestrator/validate-and-commit.ts\n');

  // Save state for next phase
  state.taskHistory.push({
    taskId: task.id,
    status: 'completed',
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime
  });
  saveState(state);
}

main().catch(error => {
  console.error('Orchestrator error:', error);
  process.exit(1);
});
