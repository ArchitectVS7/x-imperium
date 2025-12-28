---
argument-hint: [file-path] [task-group]
description: Automate a task group from any file. Usage: /automate docs/milestones.md "Milestone 9"
---

# Automate Task Group

Automate all tasks in a task group with mandatory quality gates, adversarial review, and E2E testing.

## Parameters

- **File**: `$1` (e.g., `docs/milestones.md`, `docs/backlog.md`)
- **Task Group**: `$2` (e.g., "Milestone 9", "Phase 1", "M9")

## Pre-Flight

Current git status: !`git status --short`
Current branch: !`git branch --show-current`

## Workflow

For each incomplete task in `$2` from file `$1`:

### 1. Parse & Identify

- Read the task file `$1`
- Find the task group matching `$2`
- Identify the first incomplete task (unchecked `- [ ]` item)
- Report: "Working on: {group} - Task: {description}"

### 2. Gather Context

- Read the task file for requirements
- Check for related docs (PRD, README, etc.)
- Examine existing code patterns in the codebase
- Load session notes from previous runs if they exist

### 3. Implement

Following `.claude/prompts/developer.md`:
- Write clean TypeScript (strict mode, no `any`)
- Follow existing patterns in src/lib/
- Add data-testid to all UI elements
- Check formulas match specs exactly

### 4. Adversarial Code Review (SPAWN AGENT)

**MANDATORY**: Spawn a code-reviewer agent for every implementation:

```
Task({
  subagent_type: "code-reviewer",
  prompt: "Review the following changes for bugs, security issues, PRD violations, and logic errors. Files changed: {list files}. Check against docs/PRD.md for formula accuracy.",
  description: "Adversarial code review"
})
```

**Review Response Handling:**
- **CRITICAL issues**: STOP. Fix immediately before proceeding.
- **HIGH issues**: Fix before proceeding to tests.
- **MEDIUM issues**: Document for follow-up, may proceed.
- **LOW issues**: Note and continue.

Log review findings in session notes:
```
## Review Findings - {task}
- CRITICAL: {count}
- HIGH: {count}
- MEDIUM: {count}
- Issues found: {list}
```

### 5. Unit Test Gate

Run and verify all pass:
```bash
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

If any fail:
1. Fix the issue
2. Re-run the failing command
3. Maximum 3 attempts before stopping

### 6. E2E Test Gate (MANDATORY)

**This gate is NOT optional. Every task must pass E2E before commit.**

```bash
npm run test:e2e -- --project=chromium
```

**If E2E tests PASS**: Proceed to step 7.

**If E2E tests FAIL**:

1. **DO NOT proceed to commit**
2. Follow `.claude/prompts/root-cause-analysis.md`
3. Spawn debugger agent if needed:
   ```
   Task({
     subagent_type: "debugger",
     prompt: "E2E test failed: {test name}. Error: {error message}. Investigate root cause.",
     description: "Debug E2E failure"
   })
   ```
4. Fix the root cause (not just the symptom)
5. Re-run E2E tests
6. Loop until 100% pass
7. Document the fix in session notes

### 7. Update Task File

- Mark the task complete: `- [ ]` → `- [x]`
- Add implementation notes if significant

### 8. Commit

```
{GroupID}: {Task description}

- Specific changes made
- Files created/modified
- Review findings addressed: {count}

Implements: {task from file}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 9. Update Session Notes

Append to `.claude/session-notes.md`:
```markdown
### Task: {task description}
- Status: Complete
- Files changed: {list}
- Review findings: {CRITICAL}/{HIGH}/{MEDIUM}
- E2E iterations: {count}
- Root causes fixed: {list if any}
```

### 10. Next Task

Move to the next incomplete task in the group and repeat.

## Stop Conditions

- All tasks in the group are complete
- CRITICAL review issue cannot be resolved after 2 attempts
- E2E tests fail after 3 fix attempts
- Unit tests fail after 3 fix attempts
- User interrupts

## Milestone Completion Gate

When ALL tasks in a milestone are complete:

1. Run full E2E suite:
   ```bash
   npm run test:e2e
   ```

2. Verify milestone E2E test exists and passes:
   ```bash
   npm run test:e2e -- -g "Milestone {N}"
   ```

3. Update milestone status in task file to `COMPLETE`

4. Create milestone summary in session notes

## Metrics Tracking

Track these metrics in session notes for post-run analysis:

| Metric | Value |
|--------|-------|
| Tasks completed | {count} |
| Agent calls (code-reviewer) | {count} |
| Agent calls (debugger) | {count} |
| Review findings (CRITICAL) | {count} |
| Review findings (HIGH) | {count} |
| E2E failures encountered | {count} |
| Root causes documented | {count} |
| Total iterations to green | {count} |

## Examples

```
/automate docs/milestones.md "Milestone 9"
/automate docs/milestones.md "M9"
/automate docs/milestones.md "Phase 1"
/automate docs/backlog.md "Epic 12"
```
