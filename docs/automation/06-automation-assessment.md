# Automation System Assessment & User Manual

**Date**: December 25, 2024
**Context**: Pre-Phase 1 evaluation of automation infrastructure for "yolo" mode development

---

## Executive Summary

The automation system was assessed for readiness to support autonomous development with mandatory quality gates. Key enhancements were made to enforce:

1. **Adversarial code review** after every implementation
2. **Mandatory E2E testing** with no exceptions
3. **Root cause analysis** for all E2E failures before proceeding

This document serves as both an assessment record and user manual for the enhanced automation system.

---

## Assessment Results

### Pre-Enhancement State

| Document | Purpose | Readiness | Gap |
|----------|---------|-----------|-----|
| `/automate.md` | Generic task runner | 70% | No agent spawning, optional E2E |
| `/milestone.md` | Milestone runner | 70% | No agent spawning, soft E2E |
| `developer.md` | Coding standards | 90% | Minor - complete |
| `reviewer.md` | Review checklist | 85% | Good checklist, not enforced |
| `qa.md` | QA gates | 75% | E2E mentioned but optional |
| `settings.json` | Auto-hooks | 95% | TypeCheck + lint on save |

### Critical Gaps Identified

1. **No explicit sub-agent spawning**: Prompts described roles but didn't invoke `Task` tool
2. **No hard E2E gate**: E2E was "if UI changes" - should be mandatory
3. **No root cause workflow**: When E2E fails, no systematic debugging process
4. **No success metrics**: No way to measure automation effectiveness

### Enhancements Applied

| File | Enhancement |
|------|-------------|
| `.claude/commands/automate.md` | Added mandatory E2E gate, explicit agent spawning, metrics tracking |
| `.claude/commands/milestone.md` | Added workflow diagram, agent spawning, stop conditions, success criteria |
| `.claude/prompts/root-cause-analysis.md` | Created systematic debugging workflow |
| `.claude/prompts/session-notes.md` | Created session tracking template |

---

## User Manual

### Quick Start

```bash
# Run automation on a milestone
/automate docs/milestones.md "Milestone 9"

# Or use the milestone skill
/milestone
```

### Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│  1. Parse task file → Find incomplete task                  │
│                            ↓                                │
│  2. Implement (developer.md guidelines)                     │
│                            ↓                                │
│  3. SPAWN code-reviewer agent → Adversarial review          │
│                            ↓                                │
│  4. Fix CRITICAL/HIGH issues found                          │
│                            ↓                                │
│  5. Unit tests (typecheck, lint, test, build)               │
│                            ↓                                │
│  6. E2E tests (MANDATORY)                                   │
│          ↓ FAIL                    ↓ PASS                   │
│  Root cause analysis        7. Update docs                  │
│  Spawn debugger agent       8. Commit                       │
│  Fix, retry E2E             9. Session notes                │
│          ↑_______________________|                          │
│                                                             │
│  10. Next task (loop until done)                            │
└─────────────────────────────────────────────────────────────┘
```

### Quality Gates

All gates are **mandatory** - automation will not proceed if any fail.

| Gate | Command | Max Retries |
|------|---------|-------------|
| TypeScript | `npm run typecheck` | 3 |
| Lint | `npm run lint` | 3 |
| Unit Tests | `npm run test -- --run` | 3 |
| Build | `npm run build` | 3 |
| E2E Tests | `npm run test:e2e` | 3 |

### Agent Spawning

The automation explicitly spawns specialized agents:

**Code Reviewer Agent** (after every implementation):
```
Task({
  subagent_type: "code-reviewer",
  prompt: "Review changes for bugs, security, PRD violations...",
  description: "Adversarial code review"
})
```

**Debugger Agent** (on E2E failure):
```
Task({
  subagent_type: "debugger",
  prompt: "E2E test failed: {test}. Error: {message}. Find root cause.",
  description: "Debug E2E failure"
})
```

### Stop Conditions

Automation will stop if:
- All tasks in the group are complete
- CRITICAL review issue cannot be resolved after 2 attempts
- E2E tests fail after 3 fix attempts
- Unit tests fail after 3 fix attempts
- User interrupts

### Session Notes

Track progress in `.claude/session-notes.md`:

```markdown
### Task: {description}
- Status: Complete
- Files: {list}
- Review: {CRITICAL}/{HIGH}/{MEDIUM} findings
- E2E iterations: {count}
- Root causes: {list if any}
```

---

## Metrics & Success Criteria

### Quantitative Metrics

Track these during automation runs:

| Metric | How to Measure | Target |
|--------|----------------|--------|
| Agent Calls (code-reviewer) | Count Task tool invocations | >= 1 per task |
| Agent Calls (debugger) | Count Task tool invocations | Only when needed |
| Review Findings (CRITICAL) | Parse agent output | 0 in final code |
| Review Findings (HIGH) | Parse agent output | 0 in final code |
| E2E Pass Rate | Final test result | 100% |
| E2E Iterations | Times suite ran | <= 3 per task |
| Root Causes Documented | Check session notes | 1 per E2E failure |

### Qualitative Assessment (Post-Run)

After each milestone, review:

1. **Review Effectiveness**: Did the code-reviewer agent catch real bugs?
   - Read the agent's output
   - Check if issues were substantive or trivial
   - Adjust reviewer prompt if findings are weak

2. **E2E Coverage**: Were failures due to missing tests or code bugs?
   - If tests are flaky, improve test infrastructure
   - If tests miss bugs, add more test cases

3. **Root Cause Quality**: Were fixes addressing symptoms or causes?
   - Check if same errors recur
   - Verify fixes match the documented root cause

4. **Context Preservation**: Was information lost between tasks?
   - Check session notes for completeness
   - Verify handoff notes are useful

### Success Criteria for Phase 1-2 Trial

| Criterion | Threshold | Measurement |
|-----------|-----------|-------------|
| Tasks completed | 100% of Phase 1-2 | Count completed checkboxes |
| Review agent called | >= 1 per task | Count in session notes |
| E2E passing | 100% at each commit | Final test result |
| Root causes documented | 1 per failure | Check session notes |
| No manual intervention | < 3 prompts per task | Count user messages |

---

## Trial Run: Phase 1-2

### Objective

Use Phase 1 (Shared Interface Contract) and Phase 2 (M9 start) as test cases for the enhanced automation.

### Process

1. **Run Phase 1**:
   ```
   /automate docs/milestones.md "Phase 1"
   ```

2. **Observe and record**:
   - Were agents spawned?
   - Did reviews find issues?
   - Did E2E gates work?
   - Were root causes documented?

3. **Post-Phase 1 Analysis**:
   - Count metrics from session notes
   - Identify gaps in automation
   - Adjust prompts as needed

4. **Run Phase 2** (partial M9):
   ```
   /automate docs/milestones.md "M9"
   ```

5. **Compare results** to Phase 1

### Adjustment Signals

| Signal | Meaning | Adjustment |
|--------|---------|------------|
| Reviewer finds 0 issues | Prompt too weak | Strengthen reviewer.md |
| E2E fails repeatedly | Tests brittle or fixes incomplete | Improve test fixtures |
| Agent not spawned | Prompt not explicit | Add Task invocation syntax |
| Context lost | No handoff notes | Enforce session notes |
| Same bug twice | Root cause not fixed | Improve RCA process |

---

## File Reference

### Commands (Invocable Skills)

| File | Invocation | Purpose |
|------|------------|---------|
| `.claude/commands/automate.md` | `/automate {file} {group}` | Generic task automation |
| `.claude/commands/milestone.md` | `/milestone` | Milestone-specific automation |

### Prompts (Agent Guidelines)

| File | Purpose |
|------|---------|
| `.claude/prompts/developer.md` | Coding standards and patterns |
| `.claude/prompts/reviewer.md` | Adversarial review checklist |
| `.claude/prompts/qa.md` | QA and testing guidelines |
| `.claude/prompts/root-cause-analysis.md` | E2E failure debugging workflow |
| `.claude/prompts/session-notes.md` | Session tracking template |

### Configuration

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Permissions and auto-hooks |

---

## Troubleshooting

### Agent Not Spawned

**Symptom**: No Task tool invocation visible in transcript.

**Cause**: Prompt text describes agent but doesn't trigger spawn.

**Fix**: Ensure prompt includes explicit Task syntax:
```
Task({
  subagent_type: "code-reviewer",
  ...
})
```

### E2E Gate Bypassed

**Symptom**: Commit created despite E2E failures.

**Cause**: Automation didn't enforce stop condition.

**Fix**: Check automate.md Step 6 is being followed. E2E must pass before Step 7.

### Review Findings Ignored

**Symptom**: CRITICAL issues not fixed before proceeding.

**Cause**: Response handling not enforced.

**Fix**: Review Step 4 in automate.md. CRITICAL = STOP.

### Context Lost Between Tasks

**Symptom**: Same decisions remade, previous work unknown.

**Cause**: Session notes not maintained.

**Fix**: Ensure Step 9 (session notes) runs after each task.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-25 | Initial assessment and enhancements |

---

## Next Steps

1. **Run Phase 1-2 trial** with enhanced automation
2. **Collect metrics** in session notes
3. **Post-run analysis** - assess what worked
4. **Adjust prompts** based on findings
5. **Document learnings** in `docs/automation/07-phase1-trial-results.md`
6. **Proceed to Phase 3** with tuned automation
