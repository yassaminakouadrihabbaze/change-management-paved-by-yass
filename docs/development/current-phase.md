# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 1 — Foundation (backlog), entering workflow phase 3 (feature development)
**Phase goal:** Project scaffolding, auth, and core data model. Nothing user-facing yet.

> Product discovery and architecture design are both complete. The repository is
> **documentation-only** — no `package.json`, no `src/`, no Prisma schema yet. F-001 changes that.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|-----------|---------|--------|--------|-------|
| F-001 | Project scaffolding | `feature/F-001` | ✅ Done | All 9 acceptance criteria verified. Branch not yet pushed/merged. |
| — | Next: **F-002** — Entra ID auth | — | 📋 | Run `/new-feature F-002` |

> **The app is now real and runnable.** `npm run dev` serves a placeholder page; typecheck, lint,
> 13 unit tests, 3 E2E tests and a standalone production build all pass.

## Last Session Summary

**Date:** 2026-08-28
**What was done:**
- `/init-product` — 11-question interview → [PRD.md](../product/PRD.md) and [backlog.md](backlog.md) populated. Scope set as a **general** change management system (not ITIL/CAB). Attachments and ISO 27001 removed from scope on review.
- `/init-architecture` — designed and documented the full architecture:
  - [overview.md](../architecture/overview.md) — routes, data flow, three-layer authorization, component boundaries
  - [database.md](../architecture/database.md) — 4 tables + 4 enums, indexes, status transition rules
  - [api-contracts.md](../architecture/api-contracts.md) — 13 server actions, each with its authorization check
  - [security.md](../architecture/security.md) — compliance framing removed, controls kept, pre-launch checklist added
  - [ADR-001](../architecture/decisions/001-initial-stack.md) — the reasoning behind the stack and core decisions
- `README.md` rewritten as a project README; `CLAUDE.md` project name and phase filled in.
- `tech-stack.md` — added shadcn/ui (the only stack addition; the stack itself is unchanged).

- **F-001 (project scaffolding) — complete and verified.** Next.js 14 + TypeScript strict + Tailwind + shadcn/ui tokens + Prisma + Vitest + Playwright, fitted around the template's existing Dockerfile, Terraform and pipeline. Verification: typecheck ✅, lint ✅, 13 unit tests ✅, `prisma generate` ✅, standalone build ✅, 3 E2E tests ✅.

**What's next:**
- **F-002** — Entra ID auth. **No sign-up.** Split Auth.js config (Edge-safe `auth.config.ts` for middleware, full `auth.ts` with `PrismaAdapter`), JWT sessions. Getting the split wrong is a rewrite, not a tweak.
- **F-003** — narrowed: initial migration, `isActive` enforcement, access-control policies, middleware route/role gate. The `User`/`Account` models and `Role` enum already shipped in F-001.
- **F-005** adds the three domain tables; **F-006** delivers `canTransition()`, the keystone the rest of Phase 2 depends on.

**Open questions / blockers:**
- **No database migration exists yet.** The schema is defined and the client generates, but `prisma migrate dev` needs a reachable database. Blocked until a connection string exists (F-004), then run in F-003.
- **Azure prerequisites still unconfirmed** — Entra tenant ID, app registration, subscription access, and whether the Postgres server will be privately networked (it is **not** by default). Needed for F-002 and F-004. This is the most likely thing to block progress.
- **`Category` enum values are placeholders** (`SOFTWARE`, `HARDWARE`, `PROCESS`, `POLICY`, `OTHER`) — never established during discovery. Confirm when F-005 starts.
- **Success metrics are qualitative only.** Quantitative targets recorded as an open item in the PRD; revisit before MVP launch.
- **Design system not defined** — `design-system.md` is still a draft. shadcn/ui was chosen as visually neutral so this can be settled later without rework. Run `/init-design-system` any time.
- **Other apps occupy ports 3000 and 3100** on this machine. The E2E suite uses 3456 (`E2E_PORT` to override); `npm run dev` will need `-- --port` too.
- **`feature/F-001` is committed but not pushed.** No PR yet.

## Session History

> Keep the last 5 session summaries. Delete older ones to keep this file lean.

| Date | Summary | Key Decisions |
|------|---------|---------------|
| 2026-08-28 | `/init-product` + `/init-architecture` — PRD, backlog and all architecture docs written | General change management (not ITIL/CAB); JWT sessions; in-app role column; requester picks approver; shadcn/ui; no API routes; users deactivated not deleted. See ADR-001. |
| 2026-08-28 | **F-001 scaffolding built and verified** — app now runs, builds and tests clean | `User`/`Account`/`Role` moved into F-001 (Prisma needs ≥1 model); Prettier skips Markdown; E2E on port 3456; `vite-tsconfig-paths` dropped. |
