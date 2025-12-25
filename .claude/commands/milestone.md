# Milestone Automation Skill

Execute an automated development cycle for the current milestone task.

## Workflow

This skill automates the development workflow for X-Imperium milestones:

1. **Parse milestones.md** - Find the next incomplete task
2. **Implement** - Write code for the task (developer agent)
3. **Review** - Adversarial code review (reviewer agent)
4. **Fix Issues** - Address any review findings
5. **Test** - Run all quality gates (QA agent)
6. **Update Docs** - Mark task complete in milestones.md
7. **Commit** - Create a meaningful commit

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

### Step 3: Adversarial Review

Review your own code using the reviewer checklist from `.claude/prompts/reviewer.md`:

1. Check PRD compliance (formulas, constants, logic)
2. Look for security issues
3. Verify TypeScript quality
4. Hunt for logic bugs
5. Confirm testability

If issues found:
- Fix CRITICAL and HIGH issues immediately
- Note MEDIUM issues for follow-up
- Document any trade-offs

### Step 4: Run Quality Gates

Execute these commands and verify they pass:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If any fail:
- Fix the issues
- Re-run the checks
- Do NOT proceed until all pass

### Step 5: E2E Validation (if UI changes)

If the task involved UI changes:

```bash
npm run test:e2e
```

Verify:
- New features have test coverage
- Existing tests still pass
- No console errors during tests

### Step 6: Update Documentation

1. In `docs/milestones.md`, change the task from `- [ ]` to `- [x]`
2. Add implementation notes if significant (e.g., "— *File created: src/lib/x.ts*")
3. If all deliverables in milestone complete, update status to `COMPLETE`

### Step 7: Commit Changes

Create a commit with format:
```
M{N}: {Brief description}

- {Specific change 1}
- {Specific change 2}

Implements: {deliverable from milestones.md}
```

## Arguments

- `--dry-run`: Show what would be done without making changes
- `--skip-tests`: Skip test execution (use carefully)
- `--task={id}`: Work on specific task instead of next one

## Example Usage

```
/milestone                    # Work on next task
/milestone --dry-run          # Preview next task without changes
/milestone --task=M6-1        # Work on specific task
```
