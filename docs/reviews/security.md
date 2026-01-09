# Security Review - Nexus Dominion

## Executive Summary

The Nexus Dominion codebase demonstrates a **strong security posture** for an alpha-stage game application. The application implements proper input validation using Zod schemas, rate limiting on Server Actions, cookie-based session management with secure flags, and authorization checks via empire ownership verification. However, there are several areas requiring attention including missing CSRF protection, incomplete admin authentication, in-memory rate limiting limitations, and inconsistent authorization patterns across some Server Actions.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | Admin Authentication Incomplete | `src/app/actions/admin-actions.ts:23-39` | Critical | `verifyAdminAccess()` only checks for existence of ADMIN_SECRET env var but does NOT verify caller provides the secret. Any authenticated request bypasses admin checks. |
| 2 | Missing Ownership Verification | `src/app/actions/syndicate-actions.ts:64-131` | Critical | `getSyndicateTrustAction()` reads cookies but does NOT verify empire ownership before returning trust data. Missing `verifyEmpireOwnership()` call. |
| 3 | Raw SQL with sql.raw() | `src/app/actions/admin-actions.ts:386` | Critical | While table names are hardcoded (not user input), the use of `sql.raw()` pattern is dangerous. A future developer could accidentally introduce SQL injection by modifying the tablesToTruncate array source. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 4 | No CSRF Protection | All Server Actions | High | Next.js Server Actions lack built-in CSRF protection. While cookies use SameSite=strict, API routes (e.g., SSE stream) accept query parameters that could be exploited. |
| 5 | In-Memory Rate Limiting | `src/lib/security/rate-limiter.ts:1-320` | High | Rate limiting uses in-memory storage which does not work across multiple server instances. Documented but not addressed for production. |
| 6 | Missing Rate Limiting | Multiple Actions | High | Several Server Actions lack rate limiting: `triggerCasualMessagesAction`, `triggerRandomBroadcastAction`, `triggerEndgameMessagesAction`, all diplomacy actions. |
| 7 | Empire Cookie Manipulation | `src/app/actions/game-actions.ts:324-367` | High | `resumeCampaignAction()` allows resuming ANY campaign game by gameId. While it validates gameId exists, anyone could resume another player's campaign. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 8 | Missing Authorization | `src/app/actions/crafting-actions.ts:256-407` | Medium | `queueCraftingOrderAction()` does not call `verifyEmpireOwnership()` - relies only on cookie extraction. |
| 9 | Missing Authorization | `src/app/actions/syndicate-actions.ts:147-220` | Medium | `getAvailableContractsAction()` lacks explicit authorization check beyond cookie read. |
| 10 | Quantity Limit Inconsistency | Multiple Actions | Medium | Different max quantities across actions: 100 in syndicate (line 504), 1000 in crafting (line 273), 1M default in validation.ts (line 151). Should be standardized. |
| 11 | Error Message Leakage | `src/app/actions/combat-actions.ts:182-186` | Medium | Error messages pass raw error.message to client which could leak internal details. Other actions handle this better. |
| 12 | Game Session Expiration | `src/app/actions/game-actions.ts:23` | Medium | 30-day cookie expiration is very long. Stale sessions could persist with outdated game states. |
| 13 | No Request Origin Validation | `src/app/api/game/stream/route.ts:33-176` | Medium | SSE endpoint validates cookies but does not check request origin header, potentially allowing cross-origin requests. |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 14 | Console Logging Sensitive Data | `src/app/actions/admin-actions.ts:283-287` | Low | Admin functions log game counts and operation results to console. In production, this should go to secure logging. |
| 15 | Missing Input Length Validation | `src/app/actions/covert-actions.ts:173-216` | Low | `executeCovertOpAction()` validates UUID format but doesn't check operation type string length before checking enum. |
| 16 | Hardcoded Cookie Names | Multiple Files | Low | Cookie names like "gameId", "empireId" are duplicated across 15+ files. Should be centralized constants. |
| 17 | API Key Env Var Names Exposed | `src/lib/llm/constants.ts:67-137` | Low | Environment variable names for API keys are visible in client-bundled code. While values are safe, names reveal infrastructure. |

## Corrective Actions

1. **IMMEDIATE**: Fix admin authentication in `admin-actions.ts` to require a caller-provided secret that matches ADMIN_SECRET, not just check env var existence.

2. **IMMEDIATE**: Add `verifyEmpireOwnership()` calls to all syndicate-actions that read/modify trust data.

3. **HIGH PRIORITY**: Implement CSRF token validation for Server Actions, or ensure all state-changing actions use POST-only endpoints.

4. **HIGH PRIORITY**: Add rate limiting to diplomacy actions, message trigger actions, and session resumption.

5. **HIGH PRIORITY**: Implement session validation for campaign resumption - verify the game session belongs to the requesting user (perhaps via a player-specific token stored at game creation).

6. **MEDIUM**: Add `verifyEmpireOwnership()` to all crafting-actions before processing orders.

7. **MEDIUM**: Standardize quantity limits across all actions (recommend 10,000 as reasonable maximum).

8. **MEDIUM**: Add Origin header validation to SSE endpoint.

9. **LOW**: Centralize cookie names in a single constants file and import across all actions.

10. **LOW**: Reduce cookie expiration to 7 days for active games, with refresh-on-activity pattern.

## Visionary Recommendations

1. **Implement Redis-based rate limiting** - The current in-memory implementation explicitly documents its limitations. For production scaling, integrate Redis or Cloudflare rate limiting.

2. **Add request signing for sensitive operations** - Nuclear strikes, high-value trades, and admin operations should require signed payloads to prevent replay attacks.

3. **Implement audit logging** - Create a security audit log table for tracking: admin actions, nuclear launches, high-value trades, login/session events, and failed authentication attempts.

4. **Consider WebAuthn/Passkeys** - For campaign mode with multi-session persistence, implement WebAuthn to prevent session hijacking and provide stronger authentication than cookies alone.

5. **Add honeypot detection** - Create fake admin endpoints that log and block attackers probing for vulnerabilities.

6. **Implement Content Security Policy** - Add CSP headers to prevent XSS attacks (no `dangerouslySetInnerHTML` or `eval` found in current codebase - this is good).

7. **Database connection encryption** - Ensure DATABASE_URL uses SSL/TLS (`?sslmode=require`) for Neon PostgreSQL connections in production.

## Metrics

- **Files reviewed**: 24 Server Action files, 4 security modules, 2 API routes, 1 database schema
- **Issues found**: 17 (Critical: 3, High: 4, Medium: 6, Low: 4)
- **Compliance status**:
  - OWASP Top 10: 7/10 addressed (missing CSRF, broken auth in admin, security logging)
  - Input validation: Strong (Zod schemas, UUID validation)
  - Authorization: Moderate (verifyEmpireOwnership exists but inconsistently applied)
  - SQL Injection: Low risk (Drizzle ORM parameterized queries, one sql.raw() concern)
  - XSS: Low risk (no unsafe DOM manipulation patterns found)
  - Secrets Management: Good (.gitignore properly configured, env vars for secrets)

---

**Review Date**: 2026-01-08
**Reviewer**: Security Audit Agent
**Codebase Version**: c335f30 (main branch)
