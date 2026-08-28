# ADR-001: Initial stack and core architecture

**Status:** Accepted
**Date:** 2026-08-28
**Deciders:** Product owner (Yassamina Habbaze), with Claude Code during `/init-architecture`

## Context

The PRD ([docs/product/PRD.md](../../product/PRD.md)) defines a general change management system:
one entity type (`ChangeRequest`), one workflow, four roles, and a filterable dashboard. No
notifications, no attachments, no reporting, no external integrations, and no compliance framework.

The repository ships with the `next-azure-postgres` paved-road stack already documented, and the PRD
records using it as a hard constraint. So the stack itself was not an open question — but several
architectural decisions that follow from it were, and they are hard to reverse once features are
built on them.

The forces at play:

- **The complexity is in authorization, not data.** Four tables is a trivial schema. The real
  substance is *who may do what, when* — which makes the authorization model and the state machine
  the decisions that matter.
- **`.claude/rules/data-access.md` mandates application-level authorization, no RLS.** There is no
  database backstop, so a missed check is a live vulnerability rather than a defaulted-deny.
- **The audit trail is a product requirement, not incidental logging.** It is specified in the PRD
  and rendered in the UI, so it must be structurally guaranteed rather than best-effort.
- **`design-system.md` is still a draft.** Visual direction was deliberately deferred, so any UI
  decision made now must not lock in an appearance.

## Options Considered

### Decision 1 — Session strategy: JWT vs database sessions

#### Option A: JWT sessions
- **Pros:** Works in Next.js middleware, which runs on the Edge runtime where Prisma cannot run. No
  database round-trip per request. The standard Auth.js v5 pattern for this setup.
- **Cons:** The role is baked into the token at sign-in, so a role change is not immediate.

#### Option B: Database sessions
- **Pros:** Role and revocation take effect instantly. Single source of truth.
- **Cons:** Middleware cannot query Postgres from Edge. Would force either moving route protection
  into every page (losing the central gate) or adding a Prisma driver adapter / Accelerate purely to
  make Edge queries possible — real infrastructure to solve a problem the product does not have.

### Decision 2 — Role storage: application column vs Entra ID app roles

#### Option A: `role` column on `User`, managed in-app
- **Pros:** Matches the approved backlog, which includes "basic user & role handling" as an in-app
  feature (F-011). No dependency on Entra admin access to change a role. Testable with seeded data.
- **Cons:** Roles live in two identity systems conceptually. Duplicates something Entra can do.

#### Option B: Entra ID app roles, read from token claims
- **Pros:** Centralised in the directory. No in-app user management to build. Role change is a
  directory operation with its own audit trail.
- **Cons:** Requires Entra admin access for every role change, which the team may not have. Makes
  F-011 largely redundant, contradicting approved scope. Harder to test locally.

### Decision 3 — Approver assignment

#### Option A: Requester picks at submit time
- **Pros:** Simplest. No configuration tables, no admin screens. Requester knows who should review.
- **Cons:** Permits approver-shopping — choosing a lenient colleague.

#### Option B: Derived from category
- **Pros:** Removes approver-shopping. No choice needed at submit.
- **Cons:** Needs a mapping table plus admin UI, expanding F-011 beyond the agreed "basic" scope.

#### Option C: Shared queue, any approver claims
- **Pros:** No assignment overhead at all.
- **Cons:** Contradicts PRD Flow 2 ("requests awaiting **their** decision"), and unclaimed requests
  have no owner to chase.

### Decision 4 — UI primitives

#### Option A: shadcn/ui
- **Pros:** Copy-in components owned in-repo, not a locked dependency. Provides accessible table,
  dialog, select and form primitives — most of a filterable dashboard. Visually neutral, so it
  restyles cleanly once `design-system.md` is filled.
- **Cons:** Adds Radix packages. More files in the repo from the start.

#### Option B: Hand-rolled primitives on Tailwind
- **Pros:** Zero new dependencies, total control.
- **Cons:** Accessible dropdowns, dialogs and data tables are genuinely hard to get right, and
  getting them subtly wrong is the common outcome. Significant effort spent on solved problems.

## Decision

**Stack:** the documented `next-azure-postgres` stack, unchanged. Next.js 14+ (App Router),
TypeScript strict, Prisma → Azure Database for PostgreSQL Flexible Server, Auth.js v5 with Microsoft
Entra ID, Tailwind, Vitest + Playwright, Zod, deployed as a container to Azure Container Apps via
Azure DevOps.

Adopted alongside it:

1. **JWT sessions** (Option A), with a split Auth.js config — an Edge-safe `auth.config.ts` for
   middleware and a full `auth.ts` with `PrismaAdapter` for the handler. Session `maxAge` 24 hours.
2. **`role` column on `User`** (Option A), admin-managed in-app, defaulting to `REQUESTER` on
   just-in-time provisioning at first sign-in.
3. **Requester picks the approver at submit** (Option A), with the approver-shopping weakness
   recorded as an accepted risk in [security.md](../security.md).
4. **shadcn/ui** (Option A) for UI primitives.

Two further decisions taken without formal options, because the alternatives were not credible:

5. **One transition guard.** All status changes go through `canTransition(from, to, actor, request)`
   in `src/lib/transitions.ts`. Scattering the rules across server actions would guarantee they
   drift apart, and the same function is reused by the UI so a button is never offered that the
   server would reject.
6. **Status change and history row are written in one transaction.** The audit trail is a product
   feature; a transition without its history entry is a defect.

Also decided: **no API routes** beyond the Auth.js handler, since nothing external consumes this
system; **no sign-up flow**, since single-tenant Entra ID provisions users from the directory; and
**users are deactivated, never deleted**, so attribution on historic requests survives.

## Consequences

**Positive:**
- Route protection stays in one middleware file with no per-request database cost.
- Roles are changeable without Entra admin involvement, and seedable in tests.
- The authorization model is uniform and auditable: every data-access function performs its own
  check, and every check is documented in [api-contracts.md](../api-contracts.md).
- The state machine is exhaustively unit-testable as a pure function — the highest-value tests in
  the system are also the cheapest to write.
- UI components are owned in-repo, so filling in `design-system.md` later is a restyle, not a
  migration.

**Negative:**
- A role change takes up to 24 hours (or a re-sign-in) to affect route gating. The admin UI must say
  so rather than implying immediacy.
- Authorization correctness rests entirely on developer discipline. There is no database backstop —
  hence the rule that every data-access function needs a denied-caller test.
- Approver-shopping is possible by design.
- `Category` ships as an enum with placeholder values; making it admin-editable later requires
  replacing it with a lookup table.

**Risks:**
- **A forgotten access check leaks data.** Mitigated by: all Prisma access confined to
  `src/lib/data/`, checks documented per function, and a denied-caller test required for each. This
  is the single largest risk in the system.
- **Scope-filtering in memory instead of in the query** would turn one oversight into a full leak.
  Prohibited explicitly in [security.md](../security.md).
- **Entra `issuer` left as `/common`** would let any Microsoft account sign in. It is a required
  configuration step, on the pre-launch checklist.
- **The database is publicly reachable by default** on Flexible Server. Private networking must be
  configured in Terraform, not assumed.

## Migration Path

| Decision | Reversal effort | What changes |
|---|---|---|
| JWT → database sessions | **Medium.** Move route protection out of Edge middleware into a server-side layout check or add a Prisma Edge adapter; add the `Session` table; change one Auth.js option. Roughly a day. | `auth.ts`, `middleware.ts`, `schema.prisma` |
| App role column → Entra app roles | **Medium.** Configure app roles in Entra, read from token claims in the `jwt` callback, retire F-011's admin screen. The `role` column can stay as a cache. | `auth.ts`, `src/app/admin/*`, Terraform (`azuread`) |
| Requester-picks → category-mapped approver | **Low.** Add a mapping table plus admin screen; `submitRequest` resolves the approver instead of accepting one. Existing requests keep their `approverId` and are unaffected. | `schema.prisma`, `src/lib/data/change-requests.ts`, submit form |
| shadcn/ui → something else | **Low, and incremental.** The components are ours; replace them one at a time behind the same props. | `src/components/ui/` |
| `Category` enum → lookup table | **Low-medium.** One table, one FK, a data migration mapping existing enum values to rows, and an admin screen. | `schema.prisma`, migration, filter components |
| Whole stack (Azure → elsewhere) | **High.** Prisma and Next.js are portable; Entra, ACA, Key Vault and Terraform are not. See the swap guides in [tech-stack.md](../tech-stack.md). | `infra/`, `azure-pipelines.yml`, `auth.ts` |
