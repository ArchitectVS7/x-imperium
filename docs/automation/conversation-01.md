Skills alone won't do it. You need the Agent SDK for multi-agent orchestration, but it's not a huge effort - we're talking ~300 lines of TypeScript to build what you described.

  Why Skills Hit a Wall

  | What you want                  | Skills can do | Skills can't do                |
  |--------------------------------|---------------|--------------------------------|
  | Orchestrator selects next task | ❌            | Needs stateful loop            |
  | Agent 1 writes code            | ✅            | -                              |
  | Agent 2 adversarial review     | ❌            | Needs separate context/persona |
  | Loop back if issues            | ❌            | Needs conditional routing      |
  | Auto-commit on success         | ✅            | -                              |
  | Auto-advance to next task      | ❌            | Needs persistence              |

  What the Agent SDK Gives You

  Your Vision                           Agent SDK Implementation
  ─────────────────────────────────────────────────────────────
  Orchestrator selects next item   →    Parse milestones.md, loop
  Agent 1 writes code              →    query() with dev system prompt
  Agent 2 adversarial review       →    query() with reviewer persona
  Tests + Playwright               →    QA agent with Bash tool access
  Update docs, commit              →    Finalize agent with Edit/Bash
  Move to next task                →    Loop continues automatically

  Minimal-Effort Path

  Phase 1: Right now - I can build a working orchestrator skeleton today:

  orchestrator.ts          # Main loop (~150 lines)
  agents/
    developer.ts           # Code writing agent
    reviewer.ts            # Adversarial reviewer
    qa.ts                  # Tests + E2E + coverage
  .claude/
    prompts/
      developer.md         # System prompt for dev agent
      reviewer.md          # System prompt for reviewer
      qa.md                # System prompt for QA
  state.json               # Tracks completed tasks

  Phase 2: Hooks for validation - These run automatically during agent work:
  - PostToolUse on Edit → runs lint/type-check
  - PreToolUse on Bash → blocks dangerous commands
  - Fail fast without human intervention

  The Context Drift Problem You Mentioned

  This is actually solved by the Agent SDK pattern:

  - Each agent gets a fresh context per task
  - Orchestrator holds minimal state (just task tracking)
  - No single context window accumulates debt
  - If one task fails, next task starts clean

 