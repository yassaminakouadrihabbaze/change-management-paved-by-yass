# Current Phase

> **Updated at the end of every session.** This file helps any new session (human or AI) pick up where the last one left off.

## Active Phase

**Phase:** Phase 1 — Foundation (backlog), entering workflow phase 3 (feature development)
**Phase goal:** Project scaffolding, auth, and core data model. Nothing user-facing yet.

> Product discovery and architecture are complete, the app is scaffolded, and authentication is
> wired. Two features merged; F-002 is committed but **not fully complete** — see below.

## In Progress

| Feature ID | Feature | Branch | Status | Notes |
|-----------|---------|--------|--------|-------|
| F-001 | Project scaffolding | `feature/F-001` | ✅ Merged | PR #1. All 9 criteria verified. |
| — | Line-ending fix | `fix/line-endings` | ✅ Merged | PR #2. Post-merge defect: lint failed on Windows checkouts. |
| — | F-001 findings | `docs/f-001-findings` | ✅ Merged | PR #3. |
| **F-002** | **Authentication (Entra ID)** | `feature/F-002` | 🔨 **Partially complete** | 9 of 14 criteria met. **AC-10 blocked** (database password), **AC-11–AC-14 blocked** (no Entra tenant). Not merged. |

> **What works today:** lint, typecheck, **51 unit tests**, **20 E2E tests** and a clean production
> build. Route gating, session shape, role propagation and the sign-in page are implemented and
> genuinely verified using signed session cookies.
>
> ⛔ **What does not work:** nobody can actually sign in. Two independent blockers, both needing
> the repo owner — **FN-7** (local database password → no migration → the adapter cannot create a
> user) and **FN-8** (no Entra tenant credentials).
>
> ⚠️ Still no CI and no branch protection — **FN-1** and **FN-2** in [backlog.md](backlog.md).

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

- **F-002 (authentication) — implemented, partially verified, not merged.** Auth.js v5 beta.32 with
  the Microsoft Entra ID provider, split config (Edge-safe `auth.config.ts` for middleware, full
  `auth.ts` with `PrismaAdapter`), JWT sessions at 24h, `/signin`, a placeholder protected
  `/dashboard`, and a session-aware `/` redirect. Verification: lint ✅, typecheck ✅, **51 unit
  tests** ✅, build ✅, **20 E2E tests** ✅. **9 of 14 acceptance criteria met.**

**What's next:**

**First — unblock F-002. Both need you, not an agent:**
1. **Local database password (FN-7).** Put a working `DATABASE_URL` in `.env.local`, then
   `npx prisma migrate dev --name init`. Two minutes, and it must happen before any real sign-in.
2. **Entra app registration (FN-8).** Tenant ID, client ID, client secret, and redirect URI
   `{origin}/api/auth/callback/microsoft-entra-id`. Then AC-11…AC-14 can be attempted.

**Then:**
- **F-003** — narrowed again: access-control policies, role-aware route gate, `isActive`
  enforcement. The models shipped in F-001; the migration moved into F-002.
- **F-005** adds the three domain tables; **F-006** delivers `canTransition()`, the keystone the
  rest of Phase 2 depends on.

**Open questions / blockers:**
> Tracked formally as **Open Findings (FN-1 … FN-8)** in [backlog.md](backlog.md). The four that
> matter: **FN-7** and **FN-8** block sign-in entirely; **FN-1** (no CI) and **FN-2** (no branch
> protection) mean nothing but local discipline protects the trunk.

- **`Category` enum values are placeholders** (`SOFTWARE`, `HARDWARE`, `PROCESS`, `POLICY`, `OTHER`) — never established during discovery. Confirm when F-005 starts.
- **Success metrics are qualitative only.** Quantitative targets recorded as an open item in the PRD; revisit before MVP launch.
- **Design system not defined** — `design-system.md` is still a draft. shadcn/ui was chosen as visually neutral so this can be settled later without rework. Run `/init-design-system` any time.
- **Other apps occupy ports 3000 and 3100** on this machine. The E2E suite uses 3456 (`E2E_PORT` to override); `npm run dev` needs `-- --port 3456` to match `AUTH_URL` in `.env.local`.
- **`next-auth` is pinned to `5.0.0-beta.32`.** Provider names and APIs shift between betas; re-verify against the installed source before upgrading, as was done here.

## Session History

> Keep the last 5 session summaries. Delete older ones to keep this file lean.

| Date | Summary | Key Decisions |
|------|---------|---------------|
| 2026-08-28 | `/init-product` + `/init-architecture` — PRD, backlog and all architecture docs written | General change management (not ITIL/CAB); JWT sessions; in-app role column; requester picks approver; shadcn/ui; no API routes; users deactivated not deleted. See ADR-001. |
| 2026-08-28 | **F-001 scaffolding built and verified** — app now runs, builds and tests clean | `User`/`Account`/`Role` moved into F-001 (Prisma needs ≥1 model); Prettier skips Markdown; E2E on port 3456; `vite-tsconfig-paths` dropped. |
| 2026-08-28 | **F-002 authentication implemented** — 51 unit + 20 E2E tests pass; sign-in still blocked | Migration moved F-003→F-002 (then blocked on DB password); signed session cookies over a credentials provider; `/common` issuer rejected at config parse; minimal `/dashboard` ships now. |
