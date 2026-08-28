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
| — | Nothing in progress | — | — | Next up: **F-001** — run `/new-feature F-001` |

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

**What's next:**
- Run `/new-feature F-001` to scaffold the project (Next.js + TypeScript + Tailwind + Prisma + Docker).
- Then F-002 (Entra ID auth — **no sign-up**, split Auth.js config, JWT sessions) and F-003 (`Role` enum, `isActive`, middleware gate).
- F-005 creates the **entire** Prisma schema in one migration; F-006 delivers `canTransition()`, the keystone the rest of Phase 2 depends on.

**Open questions / blockers:**
- **`Category` enum values are placeholders** (`SOFTWARE`, `HARDWARE`, `PROCESS`, `POLICY`, `OTHER`) — never established during discovery. Confirm when F-005 starts.
- **Success metrics are qualitative only.** Quantitative targets recorded as an open item in the PRD; revisit before MVP launch.
- **Design system not defined** — `design-system.md` is still a draft. shadcn/ui was chosen as visually neutral so this can be settled later without rework. Run `/init-design-system` any time.
- **Azure prerequisites not yet confirmed** — Entra tenant ID, subscription access, and whether the Postgres server will be privately networked (it is not by default). Needed for F-001/F-004.

## Session History

> Keep the last 5 session summaries. Delete older ones to keep this file lean.

| Date | Summary | Key Decisions |
|------|---------|---------------|
| 2026-08-28 | `/init-product` + `/init-architecture` — PRD, backlog and all architecture docs written | General change management (not ITIL/CAB); JWT sessions; in-app role column; requester picks approver; shadcn/ui; no API routes; users deactivated not deleted. See ADR-001. |
