# X-Imperium Development Automation

This document describes the automated development workflow for working through milestones efficiently.

## Quick Start

```bash
# Check current milestone status
npm run milestone:status

# Start a development cycle (shows next task)
npm run milestone:cycle

# After implementing, validate and commit
npm run milestone:validate
```

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATED DEVELOPMENT CYCLE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. IDENTIFY TASK                                               │
│     npm run milestone:status                                    │
│     └── Parses milestones.md, finds next incomplete task        │
│                                                                 │
│  2. IMPLEMENT (Claude Code)                                     │
│     /milestone                                                  │
│     └── Developer agent writes code following PRD               │
│                                                                 │
│  3. REVIEW (Adversarial)                                        │
│     Built into /milestone skill                                 │
│     └── Checks PRD compliance, security, edge cases             │
│                                                                 │
│  4. VALIDATE                                                    │
│     npm run milestone:validate                                  │
│     └── Runs typecheck, lint, tests, build, E2E                 │
│                                                                 │
│  5. COMMIT                                                      │
│     Automatic after validation passes                           │
│     └── Updates milestones.md, creates commit                   │
│                                                                 │
│  6. REPEAT                                                      │
│     npm run milestone:cycle                                     │
│     └── Selects next task, continues loop                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Using the /milestone Skill

The `/milestone` skill in Claude Code orchestrates a complete task cycle:

```
/milestone                    # Work on next incomplete task
/milestone --dry-run          # Preview what would be done
/milestone --task=M6-1        # Work on specific task
```

### What It Does

1. **Reads milestones.md** - Finds the current milestone and next incomplete deliverable
2. **Loads PRD context** - Understands the requirements for the task
3. **Implements the feature** - Writes code following existing patterns
4. **Self-reviews** - Checks for PRD violations, security issues, bugs
5. **Runs quality gates** - typecheck, lint, test, build
6. **Updates documentation** - Marks task complete in milestones.md
7. **Creates commit** - With proper format and attribution

## Agent System

Three specialized agents handle different aspects:

### Developer Agent (`.claude/prompts/developer.md`)
- Implements features following PRD specifications
- Uses existing code patterns
- Adds data-testid attributes for testability
- Ensures TypeScript compiles

### Reviewer Agent (`.claude/prompts/reviewer.md`)
- Adversarial code review
- PRD compliance checking
- Security vulnerability detection
- Edge case identification
- Performance considerations

### QA Agent (`.claude/prompts/qa.md`)
- Runs quality gates
- Validates E2E tests
- Audits PRD compliance
- Updates documentation
- Creates commits

## Quality Gates

All must pass before a task is considered complete:

| Gate | Command | Requirement |
|------|---------|-------------|
| TypeScript | `npm run typecheck` | Zero errors |
| ESLint | `npm run lint` | Zero errors (warnings OK) |
| Unit Tests | `npm run test` | All passing |
| Build | `npm run build` | Successful |
| E2E Tests | `npm run test:e2e` | All passing |

## State Tracking

Progress is tracked in `.claude/state.json`:

```json
{
  "currentMilestone": 6,
  "currentTask": "M6-1",
  "taskHistory": [...],
  "sessionStats": {
    "tasksCompleted": 5,
    "testsRun": 127,
    "testsPassed": 127,
    "commitsCreated": 5
  }
}
```

## Hooks (Automatic Validation)

Configured in `.claude/settings.json`:

- **PostToolUse on Edit/Write**: Runs typecheck after file changes
- **PostToolUse on Edit/Write**: Runs lint after file changes

These catch errors immediately during development.

## Manual Workflow (Alternative)

If you prefer manual control:

```bash
# 1. Check what's next
npm run milestone:status

# 2. Implement the task manually or with Claude Code

# 3. Validate your changes
npm run typecheck
npm run lint
npm run test
npm run build

# 4. Run E2E tests
npm run test:e2e

# 5. Update milestones.md manually (change [ ] to [x])

# 6. Commit
git add -A
git commit -m "M6: Implement victory conditions"
```

## Playwright E2E Tests

Each milestone has a corresponding E2E test file:

```
e2e/
├── milestone-1.spec.ts    # Static Empire View
├── milestone-3.spec.ts    # Planet, Units & Research
├── milestone-4.spec.ts    # Combat System
├── milestone-5.spec.ts    # Random Bots
└── fixtures/
    └── game.fixture.ts    # Shared test utilities
```

### Writing E2E Tests

For new milestones, create `e2e/milestone-{N}.spec.ts`:

```typescript
import { test, expect } from "./fixtures/game.fixture";

test.describe("Milestone {N}: {Name}", () => {
  test("core game loop works", async ({ gamePage }) => {
    // Navigate to relevant page
    await gamePage.click('[data-testid="relevant-link"]');

    // Perform actions
    await gamePage.click('[data-testid="action-button"]');

    // Verify state change
    await expect(gamePage.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

## Troubleshooting

### "TypeScript errors" during validation
Fix the errors shown, then re-run `npm run milestone:validate`.

### "E2E tests failing"
1. Check if dev server is running: `npm run dev`
2. Run tests with UI: `npm run test:e2e:ui`
3. Check screenshots in `playwright-report/`

### "No tasks found"
All tasks in the current milestone are complete. Check if the milestone status needs updating in milestones.md.

### State file corrupted
Delete `.claude/state.json` and run `npm run milestone:cycle` to recreate it.

## Extending the System

### Adding New Agents

Create a new prompt file in `.claude/prompts/`:

```markdown
# Agent Name

Your role description...

## Instructions
...
```

### Adding New Hooks

Edit `.claude/settings.json`:

```json
{
  "hooks": [
    {
      "name": "NewHook",
      "matcher": {
        "event": "PostToolUse",
        "tools": ["Edit"]
      },
      "hooks": [
        {
          "type": "command",
          "command": "your-command-here"
        }
      ]
    }
  ]
}
```

### Custom Orchestration

For more complex workflows, extend `scripts/orchestrator/run-cycle.ts` or create new scripts using the Anthropic SDK (already installed).

## Future: Agent SDK Integration

For fully autonomous operation without interactive prompts, the Agent SDK can be used to:

1. Run multiple agents in parallel
2. Implement conditional routing
3. Add retry logic and error recovery
4. Enable webhook triggers from CI/CD

See the Agent SDK documentation for building custom agent pipelines.
