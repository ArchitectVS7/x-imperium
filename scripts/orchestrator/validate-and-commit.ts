#!/usr/bin/env npx tsx
/**
 * Validate and Commit Script
 *
 * Run after implementing a task to:
 * 1. Run all quality gates
 * 2. Run E2E tests
 * 3. Update milestones.md
 * 4. Create commit
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseMilestones, getCurrentMilestone, type Milestone } from './parse-milestones';

const PATHS = {
  milestones: path.join(__dirname, '../../docs/milestones.md'),
  state: path.join(__dirname, '../../.claude/state.json')
};

function runCommand(cmd: string, silent = false): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: output || '' };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout?.toString() || error.stderr?.toString() || error.message
    };
  }
}

function log(msg: string, type: 'info' | 'ok' | 'fail' | 'warn' = 'info') {
  const prefix = { info: '[.]', ok: '[+]', fail: '[x]', warn: '[!]' };
  console.log(`${prefix[type]} ${msg}`);
}

async function main() {
  console.log('\n=== Validate and Commit ===\n');

  // Load current state
  let state: any = {};
  try {
    state = JSON.parse(fs.readFileSync(PATHS.state, 'utf-8'));
  } catch {
    log('No state file found', 'warn');
  }

  const taskId = state.currentTask || 'unknown';
  log(`Validating task: ${taskId}`, 'info');

  // Quality gates
  console.log('\n--- Quality Gates ---\n');

  const gates = [
    { name: 'TypeScript', cmd: 'npm run typecheck' },
    { name: 'ESLint', cmd: 'npm run lint' },
    { name: 'Unit Tests', cmd: 'npm run test -- --run' },
    { name: 'Build', cmd: 'npm run build' }
  ];

  let allPassed = true;
  const results: { name: string; passed: boolean }[] = [];

  for (const gate of gates) {
    log(`Running ${gate.name}...`, 'info');
    const result = runCommand(gate.cmd, true);
    results.push({ name: gate.name, passed: result.success });

    if (result.success) {
      log(`  ${gate.name} passed`, 'ok');
    } else {
      log(`  ${gate.name} FAILED`, 'fail');
      allPassed = false;
    }
  }

  // Summary
  console.log('\n--- Results ---\n');
  for (const r of results) {
    log(`${r.name}: ${r.passed ? 'PASS' : 'FAIL'}`, r.passed ? 'ok' : 'fail');
  }

  if (!allPassed) {
    log('\nQuality gates failed. Fix issues before committing.', 'fail');
    process.exit(1);
  }

  // E2E tests (optional but recommended)
  console.log('\n--- E2E Tests ---\n');
  const skipE2E = process.argv.includes('--skip-e2e');

  if (skipE2E) {
    log('Skipping E2E tests (--skip-e2e flag)', 'warn');
  } else {
    log('Running E2E tests...', 'info');
    const e2e = runCommand('npm run test:e2e', true);
    if (e2e.success) {
      log('E2E tests passed', 'ok');
    } else {
      log('E2E tests failed', 'fail');
      log('Use --skip-e2e to skip E2E tests', 'info');
      process.exit(1);
    }
  }

  // Get milestone info
  const milestonesContent = fs.readFileSync(PATHS.milestones, 'utf-8');
  const milestones = parseMilestones(milestonesContent);
  const currentMilestone = getCurrentMilestone(milestones);

  if (!currentMilestone) {
    log('Could not determine current milestone', 'warn');
  }

  // Commit
  console.log('\n--- Creating Commit ---\n');

  const commitMessage = `M${currentMilestone?.number || '?'}: Task ${taskId} complete

Quality gates passed:
${results.map(r => `- ${r.name}: ${r.passed ? 'PASS' : 'FAIL'}`).join('\n')}

Generated with Claude Code automation.
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;

  runCommand('git add -A');

  // Check if there are changes to commit
  const status = runCommand('git status --porcelain', true);
  if (!status.output.trim()) {
    log('No changes to commit', 'info');
  } else {
    // Write commit message to temp file to handle special characters
    const tempFile = path.join(__dirname, '.commit-msg.tmp');
    fs.writeFileSync(tempFile, commitMessage);

    const commit = runCommand(`git commit -F "${tempFile}"`);
    fs.unlinkSync(tempFile);

    if (commit.success) {
      log('Commit created successfully', 'ok');
    } else {
      log('Commit failed', 'fail');
    }
  }

  // Update state
  state.currentTask = null;
  state.sessionStats = state.sessionStats || {};
  state.sessionStats.tasksCompleted = (state.sessionStats.tasksCompleted || 0) + 1;
  state.sessionStats.commitsCreated = (state.sessionStats.commitsCreated || 0) + 1;
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PATHS.state, JSON.stringify(state, null, 2));

  console.log('\n=== Done ===\n');
  log(`Task ${taskId} validated and committed`, 'ok');
  log('Run "npx tsx scripts/orchestrator/run-cycle.ts" for next task', 'info');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
