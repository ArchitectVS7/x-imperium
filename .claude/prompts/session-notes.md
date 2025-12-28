# Session Notes Template

Use this template to track progress, findings, and metrics during automated development sessions.

---

## Session: {DATE}

**Milestone/Task Group**: {e.g., "Milestone 9", "Phase 1"}
**Started**: {timestamp}
**Ended**: {timestamp}

### Pre-Flight Status

```
Branch: {branch name}
Last Commit: {commit hash}
Uncommitted Changes: {yes/no}
```

---

## Tasks Completed

### Task 1: {Task Description}

**Status**: Complete | In Progress | Blocked

**Files Changed**:
- `path/to/file.ts` - {what changed}
- `path/to/file.ts` - {what changed}

**Review Findings**:
- CRITICAL: {count} - {list if any}
- HIGH: {count} - {list if any}
- MEDIUM: {count} - {list if any}

**E2E Result**: Pass | Fail (iteration {N})

**Root Causes Fixed** (if E2E failed):
1. {Description of issue and fix}

**Commit**: `{commit hash}` - {commit message}

---

### Task 2: {Task Description}

{same format...}

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Tasks Attempted | {count} |
| Tasks Completed | {count} |
| Agent Calls (code-reviewer) | {count} |
| Agent Calls (debugger) | {count} |
| Review Findings - CRITICAL | {count} |
| Review Findings - HIGH | {count} |
| Review Findings - MEDIUM | {count} |
| E2E Failures Encountered | {count} |
| E2E Iterations Total | {count} |
| Root Causes Documented | {count} |
| Commits Created | {count} |

---

## Review Findings Detail

### CRITICAL Issues

| Issue | File | Resolution |
|-------|------|------------|
| {description} | {file:line} | {how fixed} |

### HIGH Issues

| Issue | File | Resolution |
|-------|------|------------|
| {description} | {file:line} | {how fixed} |

### MEDIUM Issues (Deferred)

| Issue | File | Follow-up |
|-------|------|-----------|
| {description} | {file:line} | {ticket/note} |

---

## Root Cause Analysis Log

### RCA-1: {Test Name}

**Failure**: {what failed}

**Root Cause**: {actual cause}

**Category**: Code Bug | Test Bug | Race Condition | Infrastructure

**Fix Applied**:
- File: `{path}`
- Change: {description}

**Prevention**: {how to prevent similar issues}

---

## Blockers Encountered

| Blocker | Impact | Resolution/Workaround |
|---------|--------|----------------------|
| {description} | {what it blocked} | {how resolved} |

---

## Open Questions

- [ ] {Question needing human input}
- [ ] {Question needing human input}

---

## Handoff Notes

For the next session:

**Current State**:
- Last completed task: {description}
- Next task to work on: {description}
- Any in-progress work: {description}

**Context to Preserve**:
- {Important decisions made}
- {Patterns established}
- {Things to watch out for}

**Files to Review First**:
- `{path}` - {why}
- `{path}` - {why}

---

## Process Observations

### What Worked Well
- {observation}

### What Could Be Improved
- {observation}

### Suggested Automation Updates
- {suggestion for .claude/commands or .claude/prompts}

---

## Session End Status

```
Branch: {branch name}
Last Commit: {commit hash}
All Tests Passing: {yes/no}
Milestone Status: {X of Y tasks complete}
```
