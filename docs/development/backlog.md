# Feature Backlog

> **Source of truth for what to build and in what order.**
> Updated after every completed feature. Dependencies determine build order within each phase.
> Run `/project-status` to see what's next.

## How to Read This

- **Priority:** P0 (must-have MVP), P1 (should-have MVP), P2 (post-MVP)
- **Status:** 📋 Backlog → 🔨 In Progress → ✅ Done → ❌ Cut
- **Dependencies:** Items that must be completed first (by ID)
- **Phase:** Which development phase this belongs to

---

## Phase 1: Foundation
> Goal: Project scaffolding, auth, and core data model. Nothing user-facing yet.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-001 | Project scaffolding (per architecture decisions / chosen stack) | P0 | ✅ | — | `feature/F-001` | 2026-08-28 |
| F-002 | Authentication — Entra ID sign in / sign out (**no sign-up**) | P0 | 🔨 | F-001 | `feature/F-002` (PR #4 **merged**) | — |
| F-003 | Access-control policies + role-aware route gate + `isActive` enforcement | P0 | 🔨 | F-002 | `feature/F-003` | |
| F-004 | Environment config (dev/preview/prod) | P0 | 📋 | F-001 | | |

> **Technical notes from `/init-architecture`:**
> - **F-002 has no sign-up step.** Single-tenant Entra ID provisions users just-in-time from the org
>   directory on first sign-in, with `role = REQUESTER`. There is no registration form to build.
>   Pin the Entra `issuer` to the tenant, not `/common`.
> - **F-002 must use the split Auth.js config** — Edge-safe `auth.config.ts` for middleware, full
>   `auth.ts` with `PrismaAdapter` for the handler. Sessions are JWT, not database-backed
>   (middleware runs on Edge and cannot reach Prisma). Getting this wrong is a rewrite, not a tweak.
> - **⚠️ The `User`/`Account` models and the `Role` enum shipped in F-001, not F-003.** Prisma refuses
>   to generate a client with no models defined, and the shipped `Dockerfile` runs `prisma generate` —
>   so a model-free schema would have broken the container build. They are implemented exactly as
>   specified in [database.md](../architecture/database.md). **F-003 is therefore narrowed to:** the
>   initial migration (needs a reachable database, hence after F-002/F-004), `isActive` enforcement in
>   the data layer, access-control policies, and the middleware route/role gate.
> - **⚠️ The initial migration moved from F-003 into F-002** (2026-08-28). `PrismaAdapter` writes
>   `User` and `Account` rows on first sign-in, so the tables must exist before authentication can
>   work at all — F-003 running *after* F-002 was an impossible ordering. **F-003 is therefore
>   narrowed again to:** access-control policies, the role-aware route gate, and `isActive`
>   enforcement in the data layer.
> - **⛔ The migration still does not exist.** It was in F-002's scope but is blocked on the local
>   PostgreSQL password (`scram-sha-256` required; credentials unknown). See **FN-7**.
> - **⚠️ F-002 is merged but deliberately NOT marked ✅ Done.** PR #4 merged to `main` on 2026-08-28
>   with **9 of 14 acceptance criteria met**. It stays 🔨 because **nobody can sign in yet** —
>   AC-10…AC-14 are blocked by **FN-7** (no database migration) and **FN-8** (no Entra tenant).
>   Marking it Done would misrepresent the state of the product. Move it to ✅ only once both
>   findings are closed and the blocked criteria actually pass.
> - **F-006's transition guard depends on the `Role` enum**, which now already exists.
> - **F-003 established `src/lib/authz.ts` as the single source of authorization truth.** All rules
>   are pure functions with **zero imports** — middleware, pages and the data layer all call them
>   rather than deciding for themselves. **F-005 onward must reuse these helpers, not re-implement
>   role checks.** `isPublicRoute()` was removed from `auth.config.ts` to avoid a second source.
> - **`isActive` fails closed.** `token.isActive` requires an explicitly `true` value; anything else
>   means inactive. **On the first real sign-in, if the adapter does not supply `isActive`, users
>   will be refused with "account is not active"** — that is the design working, and the first thing
>   to check when FN-7 and FN-8 clear.
> - **`listUsers()` stays with F-011 and `listApproverOptions()` with F-005/F-006**, deliberately.
>   They were not written in F-003 — shipping untested, unused code in a security-critical layer is
>   worse than shipping it later with its consumer.

## Phase 2: Core Features
> Goal: Build the primary user-facing features defined in the PRD.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-005 | Change request data model + create/edit draft | P0 | 📋 | F-003 | | |
| F-006 | Request lifecycle & status transitions (role-based guards) | P0 | 📋 | F-005 | | |
| F-007 | Approver review & decision (approve / reject / request changes) | P0 | 📋 | F-006 | | |
| F-008 | Status history & audit trail | P0 | 📋 | F-006 | | |
| F-009 | Comments on change requests | P0 | 📋 | F-005 | | |
| F-010 | Dashboard with filtering & search | P0 | 📋 | F-006 | | |
| F-011 | Basic user & role handling (admin) | P1 | 📋 | F-003 | | |

> **Technical notes from `/init-architecture`** — see [architecture/overview.md](../architecture/overview.md)
> and [ADR-001](../architecture/decisions/001-initial-stack.md).
>
> - **F-005 adds all three domain tables at once** — `ChangeRequest`, `Comment` and `StatusHistory`,
>   plus the `ChangeStatus`, `Priority` and `Category` enums, in a single migration. (`User`,
>   `Account` and `Role` already exist — they shipped in F-001; see the Phase 1 note.) F-008 and
>   F-009 then build UI on tables that already exist; neither adds a table mid-flight.
> - **F-006 is the keystone.** It delivers `canTransition()` in `src/lib/transitions.ts` — the single
>   authority for every status change. F-007, F-008 and the action bar all consume it. Build it as a
>   pure, exhaustively unit-tested function before any UI depends on it.
> - **F-006 must write the status change and its `StatusHistory` row in one `prisma.$transaction()`.**
>   The audit trail is a product requirement, so a transition without its history entry is a defect.
> - **F-008 is the timeline UI**, not the recording mechanism — recording is inherent to F-006. If
>   F-006 is done correctly, F-008 is a read-and-render feature.
> - **F-007 gates on assignment, not role.** Holding `APPROVER` does not permit deciding on an
>   arbitrary request; only `request.approverId === user.id` does.
> - **F-010 depends on F-006** because it filters by status. Filter state lives in URL search params,
>   not React state, so the dashboard is shareable and server-rendered.
> - **F-011's UI must state that a role change is not immediate** — up to 24h, or the user's next
>   sign-in, because sessions are JWT. Deactivation (`isActive`) *is* immediate and is the correct
>   lever for urgent access removal.
> - **Every data-access function needs a denied-caller test.** There is no database RLS backstop, so
>   a happy-path-only test does not count as covered. This applies across F-005 → F-011.
> - **Confirm the `Category` enum values when F-005 starts.** The schema ships with placeholders
>   (`SOFTWARE`, `HARDWARE`, `PROCESS`, `POLICY`, `OTHER`) that were never established in discovery.

## Phase 3: Polish & QA
> Goal: Error handling, edge cases, performance, and user experience refinement.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-012 | Error handling & loading states | P1 | 📋 | Phase 2 | | |
| F-013 | Form validation (client + server) | P1 | 📋 | Phase 2 | | |
| F-014 | Security hardening review | P1 | 📋 | Phase 2 | | |
| F-015 | Performance audit | P2 | 📋 | Phase 2 | | |

## Phase 4: Post-MVP
> Goal: Features that enhance but aren't critical for launch.

| ID | Feature | Priority | Status | Dependencies | Branch | Completed |
|----|---------|----------|--------|--------------|--------|-----------|
| F-016 | File attachments on change requests | P2 | 📋 | Phase 3 | | |
| F-017 | Notifications | P2 | 📋 | Phase 3 | | |
| F-018 | Multi-step approval chains & delegation | P2 | 📋 | Phase 3 | | |
| F-019 | Reporting, analytics & export | P2 | 📋 | Phase 3 | | |

---

## Bugs

> Track bugs found during development here. Prefix IDs with B-.

| ID | Bug | Severity | Status | Found In | Branch | Fixed |
|----|-----|----------|--------|----------|--------|-------|
| | | | | | | |

---

## Decisions Log

> Quick reference for decisions made during development that aren't big enough for an ADR.

| Date | Decision | Context |
|------|----------|---------|
| 2026-08-28 | General change management, **not** ITIL/CAB | Scope correction during `/init-product`. Dropped risk assessment, implementation plan and rollback plan fields. |
| 2026-08-28 | Single approver per request for the MVP | Keeps the state machine simple. Multi-step chains deferred to F-018. |
| 2026-08-28 | `Changes Requested` returns the request to `Draft` | Requester edits and resubmits; avoids a second editable state. |
| 2026-08-28 | Requester drives `In Progress` → `Completed` | The person who raised the change marks it done, not the approver. |
| 2026-08-28 | No notifications in the MVP | Status is tracked via the dashboard. Deferred to F-017. |
| 2026-08-28 | File attachments dropped from the MVP | Not part of the original exercise scope. Deferred to F-016. |
| 2026-08-28 | ISO 27001 removed as a hard constraint | Template boilerplate, not a stated requirement. No compliance requirement specified for the MVP. |
| 2026-08-28 | JWT sessions, not database sessions | Middleware runs on Edge and cannot reach Prisma. Cost: role changes lag up to 24h. See ADR-001. |
| 2026-08-28 | Roles in an app `role` column, not Entra app roles | Matches F-011's in-app scope and needs no Entra admin access to change a role. See ADR-001. |
| 2026-08-28 | Requester picks the approver at submit | Simplest option; approver-shopping accepted as a known risk, recorded in security.md. See ADR-001. |
| 2026-08-28 | shadcn/ui for UI primitives | Copy-in components owned in-repo; visually neutral so it restyles once design-system.md is filled. See ADR-001. |
| 2026-08-28 | No API routes beyond the Auth.js handler | Nothing external consumes this system; server actions cover all mutations. |
| 2026-08-28 | Users are deactivated, never deleted | `onDelete: Restrict` on all User FKs so attribution on historic requests survives. |
| 2026-08-28 | `CHANGES_REQUESTED` is a persisted status | Gives the requester a visible "needs attention" state; the *Edit* action moves it to `DRAFT`. |
| 2026-08-28 | `SUBMITTED → UNDER_REVIEW` is an explicit action | Auto-transitioning on view would write history on every glance and make the status meaningless. |
| 2026-08-28 | `User`/`Account`/`Role` shipped in F-001, not F-003 | Prisma cannot generate a client with zero models and the Dockerfile runs `prisma generate`. Implemented per database.md; F-003 narrowed accordingly. |
| 2026-08-28 | Prettier does not format Markdown | Hand-authored docs with deliberate table alignment; Prettier reflowed 19 files. `*.md` excluded in `.prettierignore`. |
| 2026-08-28 | E2E suite runs on port 3456, `reuseExistingServer: false` | Ports 3000 and 3100 host other Next.js apps on this machine; reuse would have tested the wrong application. |
| 2026-08-28 | `vite-tsconfig-paths` dropped for a manual Vitest alias | ESM-only, unloadable from a CJS config. One line beat a dependency (dependencies.md rule 6). |
| 2026-08-28 | Initial migration moved from F-003 into F-002 | `PrismaAdapter` needs `User`/`Account` to exist before any sign-in; F-003 running after F-002 was impossible. |
| 2026-08-28 | Auth-dependent E2E uses signed session cookies, **not** a dev credentials provider | A credentials path is a password backdoor in application code; one bad env var ships it. The test helper lives in `tests/` with no production code path. |
| 2026-08-28 | Env validation **rejects** a `/common` issuer rather than warning | The Auth.js provider defaults to `/common` when `issuer` is omitted, which admits any Microsoft account. It fails open and silently, so it is refused at config parse time. |
| 2026-08-28 | A minimal `/dashboard` ships in F-002 | Route protection needs something to protect. F-010 replaces the contents; the route and its gate remain. |
| 2026-08-28 | `@next/env` loads `.env.local` for Playwright | Playwright runs in its own process. Reuses Next's own loader rather than adding `dotenv`. |
| 2026-08-28 | All authorization rules live in `src/lib/authz.ts` as pure functions | Same reasoning as `canTransition()` in ADR-001: duplicated rules drift, and with no RLS backstop a drifted rule is a data leak. Zero imports keeps it Edge-safe and testable without infrastructure. |
| 2026-08-28 | `isActive` **fails closed** in the token | A missing value denies. Lockout is loud and fixed in minutes; a silent grant persists for the token's 24h life. The failure modes are not symmetric. |
| 2026-08-28 | Wrong role → redirect to `/dashboard`; wrong record → `NOT_FOUND` | An authenticated user already knows the route exists, so hiding it gains nothing. Record existence *is* sensitive, so that case still 404s per security.md. |
| 2026-08-28 | `isPublicRoute()` removed from `auth.config.ts` | Superseded by `routeRequirement()`. Two copies of route classification is the exact drift `authz.ts` exists to prevent. |
| 2026-08-28 | `.gitattributes` pins `eol=lf` for all text files | `core.autocrlf=true` rewrote checkouts to CRLF; Prettier (`endOfLine: "lf"`) then failed all 20 source files. Would have passed Linux CI while failing every Windows clone. Fixed in PR #2. |

---

## Open Findings

> Issues identified but deliberately not blocking. Each names who/what should resolve it.

| # | Finding | Severity | Raised | Owner / next step |
|---|---------|----------|--------|-------------------|
| FN-1 | **No CI runs on pull requests.** Zero check runs on PR #1 and PR #2. `azure-pipelines.yml` targets Azure DevOps, which is not connected to this GitHub repo — it needs an ADO project, a service connection, and the `next-azure-postgres-vars` variable group. Until then, the only verification is whatever a developer runs locally. | **High** | F-001 | F-004 (environment config), or add a GitHub Actions workflow running lint/typecheck/test/build |
| FN-2 | **No branch protection on `main`.** `docs/development/git-workflow.md` recommends four settings (require PR, require status checks, block force pushes, block deletion); none is configured, so `main` accepts direct pushes. This undercuts the "never commit directly to main" rule, which is currently honoured by convention alone. | **High** | F-001 | Repo owner, in GitHub settings. Best done *after* FN-1, since "require status checks" needs checks to exist |
| FN-3 | ~~No database migration exists~~ — **superseded by FN-7.** The migration moved into F-002 and is now blocked on credentials rather than on scheduling. | — | F-001 | Closed; see FN-7 |
| FN-7 | **⛔ Initial migration blocked on the local database password.** PostgreSQL 16 is running on port 5432, but `pg_hba.conf` requires `scram-sha-256` and the password is unknown; `postgres:postgres` returned `P1000`. **A real sign-in will fail until this is resolved** — `PrismaAdapter` cannot create the `User` row. Session/route tests are unaffected, as reading a JWT performs no query. | **High** | F-002 | Repo owner: supply a working `DATABASE_URL`, then `npx prisma migrate dev --name init` |
| FN-9 | **⛔ F-003 AC-10 / AC-11 blocked by FN-7.** `src/lib/data/users.ts` is written and its `isActive` check implemented, but the **live database re-read is unverified** and there are **no denied-caller integration tests**. `overview.md` states a data-access function without one *is not done* — so by the project's own standard `users.ts` is incomplete, and "deactivation is immediate" is a claim rather than a demonstrated behaviour. Route-level gating IS proven (36 E2E tests). | **High** | F-003 | Closes with FN-7 — same `DATABASE_URL` + migration |
| FN-8 | **⛔ Entra acceptance criteria AC-11…AC-14 remain open.** Tenant ID, client ID, client secret and a registered redirect URI are required. AC-14 (a non-tenant Microsoft account is refused) is the one that actually proves the access model. | **High** | F-002 | Repo owner / Entra admin — `environments.md` states this cannot be done by an agent |
| FN-4 | **Azure prerequisites unconfirmed** — Entra tenant ID, app registration, subscription access, and whether the Postgres server will be privately networked (it is **not** by default). | **High** | `/init-architecture` | Blocks F-002 (auth) and F-004. Needs the repo owner / Azure admin |
| FN-5 | **CSP allows `'unsafe-inline'` and `'unsafe-eval'` on `script-src`** — required by the Next.js dev overlay and inline bootstrap scripts. Should be tightened to a nonce-based policy once real auth and UI exist. | Low | F-001 | F-014 (security hardening review) |
| FN-6 | **Ports 3000 and 3100 are occupied by other apps** on the development machine. The E2E suite uses 3456 with `reuseExistingServer: false`; `npm run dev` needs `-- --port` locally. Not a repo defect, but it will confuse anyone cloning onto that machine. | Low | F-001 | None — documented in `playwright.config.ts` |
