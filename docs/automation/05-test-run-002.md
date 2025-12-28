Automation Assessment

  What You Have (Solid Foundation)

  | Document      | Purpose                   | Readiness                                 |
  |---------------|---------------------------|-------------------------------------------|
  | /automate     | Generic task group runner | ⚠️ 70% - Good workflow, no agent spawning |
  | /milestone    | Milestone-specific runner | ⚠️ 70% - Same issue                       |
  | developer.md  | Coding standards          | ✅ 90% - Clear, actionable                |
  | reviewer.md   | Adversarial review        | ✅ 85% - Good checklist                   |
  | qa.md         | QA gates                  | ⚠️ 75% - Missing E2E enforcement          |
  | settings.json | Auto-hooks                | ✅ 95% - TypeCheck + lint on save         |

  Critical Gaps for "Yolo" Mode

  Gap 1: No Explicit Sub-Agent Spawning
  The prompts describe roles but don't invoke Task tool with agent types. The workflow says "using reviewer agent" but doesn't spawn one.

  # Current (just describes)
  Review your own code using the reviewer checklist...

  # Needed (actually spawns agent)
  Spawn a Task with subagent_type="code-reviewer" to perform adversarial review

  Gap 2: No Hard E2E Gate
  E2E is mentioned as optional ("if UI changes"). For your requirements, it must be mandatory with stop-on-failure.

  Gap 3: No Root Cause Workflow
  When E2E fails, there's no documented process for:
  - Isolating the failing test
  - Tracing to source
  - Fixing and re-running
  - Documenting the fix

  Gap 4: No Success Metrics
  No way to measure:
  - How many issues did the review catch?
  - What was the E2E pass rate?
  - How many iterations to green?

  ---
  Recommended Enhancements

  1. Add to /automate.md - Mandatory Gates

  ### 5.5. E2E Test Gate (MANDATORY)
  After all unit tests pass:

  ```bash
  npm run test:e2e -- --project=chromium

  STOP CONDITIONS:
  - If ANY E2E test fails, DO NOT proceed to commit
  - Spawn Task with subagent_type="debugger" to investigate
  - Document root cause and fix
  - Re-run E2E until 100% pass

  ### 2. Add Agent Spawning to Workflow

  ```markdown
  ### 4. Adversarial Review (SPAWN AGENT)
  ```typescript
  // Spawn code-reviewer agent
  Task({
    subagent_type: "code-reviewer",
    prompt: "Review the following files for bugs, security issues, and PRD violations: {files_changed}"
  })
  Wait for agent response. If CRITICAL or HIGH issues found, fix before proceeding.

  ### 3. Create `root-cause-analysis.md` Prompt

  ```markdown
  # Root Cause Analysis for E2E Failures

  When an E2E test fails:

  1. **Isolate**: Run the single failing test
     ```bash
     npm run test:e2e -- -g "test name" --debug

  2. Trace: Identify the assertion that failed
    - What was expected?
    - What was actual?
    - What DOM element or state was wrong?
  3. Diagnose: Spawn exploration agent
    - Trace data flow from source to UI
    - Check if it's test bug vs code bug
  4. Fix: Apply minimal fix to code or test
  5. Verify: Re-run failing test
  6. Document: Add to session notes
    - What broke
    - Why it broke
    - How it was fixed

  ---

  ## Success Metrics for Phase 1-2 Trial

  ### Quantitative Metrics

  | Metric | How to Measure | Target |
  |--------|----------------|--------|
  | **Agent Calls** | Count `Task` tool invocations in transcript | ≥ 2 per major task (dev + reviewer) |
  | **Review Findings** | Parse agent output for CRITICAL/HIGH/MEDIUM | Should find 1-3 issues per task |
  | **E2E Pass Rate** | `npm run test:e2e` exit code | 100% before commit |
  | **Iteration Count** | Times quality gate loop repeated | ≤ 3 per task |
  | **Root Cause Docs** | Check commit messages for "Fixes:" | 1 per E2E failure |

  ### Qualitative Assessment

  After Phase 1-2, review:
  1. **Did the reviewer agent catch real bugs?** (Read its output)
  2. **Were commits atomic and meaningful?** (Review git log)
  3. **Did E2E failures get root-caused?** (Check for debugging traces)
  4. **Was context preserved across tasks?** (Look for handoff notes)

  ---

  ## Recommended Trial Approach

  ### Phase 1-2 as Test Run

  ┌─────────────────────────────────────────────────────────────────┐
  │  /automate docs/milestones.md "Phase 1"                         │
  │                                                                 │
  │  For each task:                                                 │
  │    1. Developer implements                                      │
  │    2. SPAWN code-reviewer agent → Log findings                  │
  │    3. Fix any CRITICAL/HIGH                                     │
  │    4. Run unit tests → npm run test                             │
  │    5. Run E2E tests → npm run test:e2e                          │
  │    6. If E2E fails:                                             │
  │       - SPAWN debugger agent → Root cause                       │
  │       - Fix → Re-run E2E                                        │
  │       - Loop until green                                        │
  │    7. Commit with structured message                            │
  │    8. Record metrics in session notes                           │
  │                                                                 │
  │  After Phase 1:                                                 │
  │    - Human reviews transcript                                   │
  │    - Counts agent calls, review findings, E2E iterations        │
  │    - Adjusts prompts based on gaps                              │
  │                                                                 │
  │  Then Phase 2...                                                │
  └─────────────────────────────────────────────────────────────────┘

  ### What to Watch For

  | Signal | Meaning | Adjustment |
  |--------|---------|------------|
  | Reviewer finds 0 issues | Prompt too weak or code too simple | Strengthen reviewer prompt |
  | E2E fails repeatedly | Tests brittle or fixes incomplete | Improve test fixtures |
  | Agent not called | Prompt not explicit enough | Add explicit Task invocations |
  | Context lost mid-session | No handoff notes | Add session state tracking |

  ---

  ## Immediate Action Items

  To make the automation ready for Phase 1-2 trial:

  1. **Update `/automate.md`** - Add mandatory E2E gate and agent spawning
  2. **Create `root-cause-analysis.md`** - Document the debugging workflow
  3. **Add metrics section to `/milestone.md`** - Track success indicators
  4. **Create `session-notes.md` template** - For context preservation

  Would you like me to make these updates to the automation documents now?