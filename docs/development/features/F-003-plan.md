# F-003 — Plan

> Source: derived from docs/product/PRD.md + docs/architecture/ on 2026-08-28. Backlog: F-003.
> Story + acceptance criteria: [F-003-user-stories.md](F-003-user-stories.md).

## Approach

Put every authorization rule in one pure module, `src/lib/authz.ts`, and have both middleware and the
data layer call it. Nothing decides access on its own.

This mirrors the `canTransition()` decision in ADR-001 for the same reason: rules duplicated across
call sites drift apart, and with no RLS backstop a drifted rule is a data leak rather than an
inconsistency. A pure module is also exhaustively testable without a database — which matters here,
because the database is blocked.

```
middleware.ts ─┐
               ├─► src/lib/authz.ts  (pure — no I/O, no Prisma, Edge-safe)
data/users.ts ─┘
```

### Key decision: `isActive` fails closed

`token.isActive` is set to `user.isActive === true` — an explicitly *true* value is required. A
missing or undefined `isActive` yields **inactive**, not active.

The trade-off, stated plainly:

| Choice | If the adapter omits `isActive` |
|---|---|
| Fail closed (chosen) | Nobody can use the app. Loud, immediate, no security hole. |
| Fail open | Deactivated users keep access for up to 24h, silently. |

Fail-closed wins: a total lockout is discovered in minutes, whereas a silent grant persists. The
risk is low in practice — Prisma returns all scalar columns, so the adapter should include it — but
the failure modes are not symmetric, so the safe one is chosen.

> **Expected on first real sign-in:** if `isActive` does *not* arrive from the adapter, users will be
> refused with "account is not active". That is this decision working, not a bug. It is the first
> thing to check when FN-7 and FN-8 are resolved.

### Wrong role vs wrong record

A non-admin visiting `/admin/*` is **redirected to `/dashboard`**. They already know the route
exists; hiding it achieves nothing. This deliberately differs from record access, where
`security.md` requires `NOT_FOUND` because the existence of a record is itself sensitive.

## Files to create / change

| File | Why |
|------|-----|
| `src/lib/authz.ts` | **New.** All authorization rules as pure functions (AC-5, AC-6, AC-7) |
| `src/lib/authz.test.ts` | **New.** Exhaustive table-driven tests over every role × route × state |
| `src/auth.config.ts` | Add `isActive` to the jwt and session callbacks (AC-1) |
| `src/types/next-auth.d.ts` | Type `isActive` on the session and token |
| `src/middleware.ts` | Delegate to `authz`; enforce `isActive` and `/admin/*` (AC-2, AC-3, AC-4) |
| `src/lib/data/users.ts` | **New.** Sole route to user records; own `isActive` check (AC-8, AC-10 ⛔) |
| `src/app/(public)/signin/page.tsx` | Explain the inactive-account case (AC-2) |
| `src/app/(auth)/admin/users/page.tsx` | Minimal ADMIN-only page, so AC-3 has something to protect |
| `src/edge-safety.test.ts` | Extend: `authz.ts` must stay free of database imports (AC-9) |
| `tests/e2e/authz.spec.ts` | **New.** Role-aware gating via signed session cookies |

## Tasks

- [ ] Create `src/lib/authz.ts` — roles, capabilities, route requirements, access resolution
- [ ] Test: exhaustive role × capability matrix, matching `overview.md` (AC-6)
- [ ] Test: unknown role, missing role and absent `isActive` all deny (AC-7)
- [ ] Test: route requirements for every documented path (AC-3, AC-4)
- [ ] Add `isActive` to the jwt/session callbacks and types (AC-1)
- [ ] Test: callbacks propagate `isActive`, defaulting closed (AC-1, AC-7)
- [ ] Rewrite `middleware.ts` to delegate to `authz` (AC-2, AC-3, AC-4)
- [ ] Add an ADMIN-only page at `/admin/users`
- [ ] Show an inactive-account message on `/signin` (AC-2)
- [ ] Create `src/lib/data/users.ts` with its access check (AC-8)
- [ ] Extend the Edge-safety test to cover `authz.ts` (AC-9)
- [ ] E2E: inactive user refused; each role against `/admin/*`; every role reaches `/dashboard`
- [ ] Verify: lint, typecheck, unit, build, E2E

## Criterion → test coverage

| Criterion | Test | Status |
|-----------|------|--------|
| AC-1 | `auth.config.test.ts` — 3 tests: isActive in token and session | ✅ |
| AC-2 | `authz.test.ts` (12 tests) + `authz.spec.ts` (8 E2E, all four roles) | ✅ |
| AC-3 | `authz.test.ts` (9 tests) + 4 E2E, one per role | ✅ |
| AC-4 | `authz.test.ts` (12 tests) + 4 E2E | ✅ |
| AC-5 | `edge-safety.test.ts` — `authz.ts` has **zero** imports | ✅ |
| AC-6 | `authz.test.ts` — full 4×4 role × capability matrix | ✅ |
| AC-7 | `authz.test.ts` (14 tests) + `auth.config.test.ts` (7 tests) | ✅ |
| AC-8 | `edge-safety.test.ts` — repo-wide scan of Prisma import sites | ✅ |
| AC-9 | `edge-safety.test.ts` — `authz.ts` transitive import graph | ✅ |
| AC-10 | ⛔ **Blocked by FN-7** — live `isActive` re-read needs a database | ⛔ |
| AC-11 | ⛔ **Blocked by FN-7** — denied-caller tests need a seeded database | ⛔ |

## Verification results

Run 2026-08-28 from a clean `.next`:

| Check | Command | Result |
|-------|---------|--------|
| Lint | `npm run lint` | ✅ exit 0 |
| Types | `npx tsc --noEmit` | ✅ exit 0 |
| Unit tests | `npm run test` | ✅ **149 passed**, 7 files (51 before) — **94 in `authz.test.ts` alone** |
| Build | `npm run build` | ✅ exit 0, no warnings. `/admin/users` added; middleware 79.1 kB |
| E2E | `npx playwright test` | ✅ **36 passed** (20 before) |

## Deviations from PRD / architecture

### 1. `listUsers()` and `listApproverOptions()` are NOT implemented here

`api-contracts.md` lists both under `src/lib/data/`. They stay with their consuming features:
`listUsers()` → F-011 (admin screen), `listApproverOptions()` → F-005/F-006 (submit form). Writing
them now would mean shipping untested, unused code paths in a security-critical layer.

### 2. `isPublicRoute()` was removed from `auth.config.ts`

F-002 put route classification there. `authz.ts` now owns it, and leaving both would have recreated
exactly the duplicate source of truth this feature exists to eliminate. Its tests moved to
`authz.test.ts`, where the coverage is far broader.

### 3. A minimal `/admin/users` page ships here

AC-3 requires proving `/admin/*` is ADMIN-only, which needs a route to protect. F-011 replaces the
contents; the route and its gate stay. Same pattern as `/dashboard` in F-002.

## Blocked work (FN-7)

**AC-10 and AC-11 remain open.** `src/lib/data/users.ts` is written and its access check is
implemented, but:

- The **live `isActive` re-read** cannot be verified without a database, so "deactivation is
  immediate" is currently a claim rather than a demonstrated behaviour.
- **Denied-caller integration tests** cannot run. `overview.md` states a data-layer function without
  one *is not done* — so by the project's own standard, `users.ts` is incomplete.

Unblocked by a working `DATABASE_URL` plus `npx prisma migrate dev --name init`.
