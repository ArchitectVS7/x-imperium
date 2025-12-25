 # Full Auto: Milestone 7 - Market & Diplomacy

  ## Context
  This is X-Imperium, a turn-based space strategy game. You're implementing Milestone 7 autonomously.

  ## Key Files
  - `docs/milestones.md` - Task list and requirements
  - `docs/PRD.md` - Full specifications (Section 8 for diplomacy, Section 4 for market)
  - `.claude/prompts/` - Agent guidelines (developer.md, reviewer.md, qa.md)
  - `docs/AUTOMATION_KNOWLEDGE_BASE.md` - Log your learnings here

  ## Your Mission
  Implement all 8 M7 tasks autonomously:

  1. Global market (buy/sell resources)
  2. Dynamic pricing based on supply/demand
  3. Price range: 0.4× to 1.6× base price
  4. NAP treaty system
  5. Alliance treaty system
  6. Treaty UI (propose/accept/reject)
  7. Treaty enforcement (can't attack treaty partner)
  8. Treaty breaking penalties (reputation)

  ## Database Tables Needed
  Create in `src/lib/db/schema.ts`:
  - `market_prices`
  - `market_orders`
  - `treaties`
  - `reputation_log`

  ## Workflow Per Task
  1. Read the task from milestones.md
  2. Check PRD for exact specifications
  3. Implement following patterns in `src/lib/game/services/`
  4. Self-review using `.claude/prompts/reviewer.md` checklist
  5. Run: `npm run typecheck && npm run lint && npm run test`
  6. If tests pass, commit with format: `M7: {task description}`
  7. Move to next task

  ## Rules
  - Follow existing code patterns (check src/lib/game/services/ for examples)
  - Every UI element needs data-testid
  - PRD formulas are exact - don't approximate
  - If blocked, document in AUTOMATION_KNOWLEDGE_BASE.md and continue to next task
  - Commit after EACH task, not in batches

  ## Success Criteria
  - All 8 tasks implemented
  - `npm run typecheck` passes
  - `npm run lint` passes
  - `npm run test` passes
  - `npm run build` succeeds

  ## Start
  Run `npm run milestone:status` to confirm you're on M7, then begin with M7-1.

  GO.

  ---
  Usage: Copy this entire block into a new Claude Code session. It has everything needed to run M7 independently.

  Tip: After it completes, come back to this session and we can review the results together using git log --oneline -10 and update the knowledge base.
