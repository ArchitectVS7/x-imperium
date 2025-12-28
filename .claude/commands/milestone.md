# Milestone Automation Skill

Execute an automated development cycle for the current milestone task with mandatory quality gates.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Parse milestones.md → Find next incomplete task            │
│                            ↓                                │
│  Implement (developer agent guidelines)                     │
│                            ↓                                │
│  SPAWN code-reviewer agent → Adversarial review             │
│                            ↓                                │
│  Fix CRITICAL/HIGH issues                                   │
│                            ↓                                │
│  Unit tests (typecheck, lint, test, build)                  │
│                            ↓                                │
│  E2E tests (MANDATORY - must pass)                          │
│          ↓ FAIL                    ↓ PASS                   │
│  Root cause analysis        Update docs, commit             │
│  Fix, retry E2E                    ↓                        │
│          ↑_______________________|                          │
│                                                             │
│  Loop until all tasks complete or stop condition            │
└─────────────────────────────────────────────────────────────┘
```

## Instructions

When this skill is invoked, follow this exact sequence:

### Step 1: Identify Current Task

Read `docs/milestones.md` and find:
- The current milestone (first one not marked COMPLETE)
- The next incomplete deliverable (first `- [ ]` checkbox)

Report what you're working on:
```
Working on: M{N} - {Milestone Name}
Task: {Task description}
```

### Step 2: Implement the Task

Using the developer agent guidelines from `.claude/prompts/developer.md`:

1. Read the PRD section relevant to this task
2. Examine existing code patterns in the codebase
3. Implement the feature/fix
4. Add data-testid attributes to all new UI elements
5. Ensure TypeScript compiles

### Step 3: Adversarial Review (SPAWN AGENT)

**MANDATORY**: Spawn a code-reviewer agent:

```
Task({
  subagent_type: "code-reviewer",
  prompt: "Review these changes for: 1) PRD compliance (check docs/PRD.md), 2) Security issues, 3) TypeScript quality, 4) Logic bugs, 5) Testability. Files: {list}",
  description: "Adversarial code review"
})
```

Review agent will return findings with severity levels.

**Response Handling:**
- **CRITICAL**: Stop. Fix immediately.
- **HIGH**: Fix before proceeding to tests.
- **MEDIUM**: Document, may proceed.
- **LOW**: Note and continue.

Log all findings in session notes.

### Step 4: Run Quality Gates

Execute these commands and verify they pass:

```bash
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

If any fail:
- Fix the issues
- Re-run the checks
- Maximum 3 attempts before stopping
- DO NOT proceed until all pass

### Step 5: E2E Validation (MANDATORY)

**This step is NOT optional. Every task must pass E2E.**

```bash
npm run test:e2e -- --project=chromium
```

**If tests PASS**: Proceed to Step 6.

**If tests FAIL**:
1. DO NOT proceed to commit
2. Follow `.claude/prompts/root-cause-analysis.md`
3. Spawn debugger agent if needed:
   ```
   Task({
     subagent_type: "debugger",
     prompt: "E2E failure: {test}. Error: {message}. Find root cause.",
     description: "Debug E2E failure"
   })
   ```
4. Fix root cause (not symptom)
5. Re-run E2E
6. Loop until 100% pass
7. Document fix in session notes

### Step 6: Update Documentation

1. In `docs/milestones.md`, change the task from `- [ ]` to `- [x]`
2. Add implementation notes if significant
3. If all deliverables in milestone complete, update status to `COMPLETE`

### Step 7: Commit Changes

Create a commit with format:
```
M{N}: {Brief description}

- {Specific change 1}
- {Specific change 2}
- Review findings addressed: {count}

Implements: {deliverable from milestones.md}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 8: Update Session Notes

Append to `.claude/session-notes.md`:

```markdown
### Task: {description}
- Status: Complete
- Files: {list}
- Review: {CRITICAL}/{HIGH}/{MEDIUM} findings
- E2E iterations: {count}
- Root causes: {list if any}
```

### Step 9: Milestone Completion Check

If all tasks in the milestone are complete:

1. Run full E2E suite
2. Verify milestone-specific E2E test passes
3. Update milestone status to COMPLETE
4. Write milestone summary to session notes

## Metrics Tracking

Track these metrics during the session:

| Metric | Description |
|--------|-------------|
| `agent_calls_reviewer` | Times code-reviewer agent spawned |
| `agent_calls_debugger` | Times debugger agent spawned |
| `findings_critical` | CRITICAL issues found by reviewer |
| `findings_high` | HIGH issues found by reviewer |
| `findings_medium` | MEDIUM issues found by reviewer |
| `e2e_failures` | E2E test failures encountered |
| `e2e_iterations` | Times E2E suite was run |
| `root_causes_fixed` | Distinct root causes identified and fixed |
| `tasks_completed` | Tasks marked complete |

## Stop Conditions

- All tasks in the milestone are complete
- CRITICAL issue cannot be resolved after 2 attempts
- E2E tests fail after 3 fix attempts
- Unit tests fail after 3 fix attempts
- User interrupts

## Success Criteria

A task is successfully complete when:
1. Code implements the requirement
2. Code review found no CRITICAL or HIGH issues (or they were fixed)
3. All unit tests pass
4. All E2E tests pass
5. Documentation updated
6. Commit created

## Arguments

- `--dry-run`: Show what would be done without making changes
- `--skip-review`: Skip adversarial review (NOT RECOMMENDED)
- `--task={id}`: Work on specific task instead of next one

## Example Usage

```
/milestone                    # Work on next task
/milestone --dry-run          # Preview next task without changes
/milestone --task=M9-1        # Work on specific task
```

## Post-Milestone Analysis

After completing a milestone, review session notes:

1. **Review Effectiveness**: Did the reviewer catch real bugs?
2. **E2E Coverage**: Were failures due to missing tests or code bugs?
3. **Root Cause Patterns**: Are there recurring issues?
4. **Process Improvements**: What could be automated better?

Document findings in `docs/automation/` for process improvement.
