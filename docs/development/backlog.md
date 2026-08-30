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
| F-002 | Authentication — Entra ID sign in / sign out (**no sign-up**) | P0 | 📋 | F-001 | | |
| F-003 | Initial migration + access-control policies + middleware route/role gate | P0 | 📋 | F-002 | | |
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
> - **No migration exists yet.** `prisma/schema.prisma` is defined and the client generates, but
>   `prisma migrate dev` needs a live database. `prisma/migrations/` is deliberately absent until F-003.
> - **F-006's transition guard depends on the `Role` enum**, which now already exists.

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
