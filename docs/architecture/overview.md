# Architecture Overview

> **Status:** Approved — designed during `/init-architecture` on 2026-08-28.
> This is the **`next-azure-postgres`** stack: Next.js in a container on Azure Container Apps,
> Azure Database for PostgreSQL Flexible Server via Prisma, Microsoft Entra ID auth.

## What This System Is

A change management system: users raise change requests, a single assigned approver decides on them,
and the requester drives approved work to completion. Comments and an append-only status history
hang off every request. A role-aware, filterable dashboard is the primary surface.

One entity type, one workflow, no external integrations. The architecture is deliberately small —
the complexity that exists is in **who may do what, when**, not in the data model.

## System Diagram

```
                    ┌──────────────────────────────────────────┐
                    │           Azure Container Apps            │
                    │  ┌────────────────────────────────────┐  │
   Browser  ─TLS─►  │  │        Next.js (container)          │  │
                    │  │  ┌────────┐ ┌────────┐ ┌─────────┐  │  │
                    │  │  │ app/   │ │ comps/ │ │ hooks/  │  │  │
                    │  │  └───┬────┘ └───┬────┘ └────┬────┘  │  │
                    │  │  ┌───┴──────────┴───────────┴────┐  │  │
                    │  │  │  middleware.ts (route auth)    │  │  │
                    │  │  │  — Edge runtime, JWT only —    │  │  │
                    │  │  ├────────────────────────────────┤  │  │
                    │  │  │  server actions                │  │  │
                    │  │  │      ↓ Zod validate            │  │  │
                    │  │  │  lib/transitions.ts (guard)    │  │  │
                    │  │  │      ↓                          │  │  │
                    │  │  │  src/lib/data/ (access checks) │  │  │
                    │  │  └───────────────┬────────────────┘  │  │
                    │  └──────────────────┼───────────────────┘  │
                    │   managed identity  │                       │
                    └──────┬──────────────┼───────────────────────┘
                           │              │
              ┌────────────▼────┐  ┌──────▼──────────────────────┐
              │  Azure Key      │  │  Azure DB for PostgreSQL     │
              │  Vault (secrets)│  │  Flexible Server (Prisma)    │
              └─────────────────┘  └──────────────────────────────┘

   Identity:  Microsoft Entra ID (OIDC)  ◄── Auth.js handles sessions/cookies
   Image:     built by Azure DevOps → pushed to Azure Container Registry → deployed to ACA
```

## Key Decisions

> For full technology choices, rationale, and swap guides, see [tech-stack.md](tech-stack.md).
> For the reasoning behind the decisions below, see [decisions/001-initial-stack.md](decisions/001-initial-stack.md).

| Decision | Choice | Migration Path |
|----------|--------|----------------|
| Framework | Next.js 14+ App Router | Standard React app |
| Database | Azure DB for PostgreSQL Flexible Server | Standard Postgres — any host |
| ORM | Prisma | Swap client in src/lib/data/ |
| Auth | Microsoft Entra ID via Auth.js | Any OIDC / JWT provider |
| **Session strategy** | **JWT (not database sessions)** | Switch to DB sessions if middleware moves off Edge |
| Authorization | App middleware + data-layer checks (NOT RLS) | Add RLS as defence-in-depth if needed |
| **Role storage** | **`role` column on `User`, admin-managed in-app** | Move to Entra ID app roles; read from token claims |
| **Approver assignment** | **Requester picks at submit time** | Category→approver mapping table |
| **State machine** | **Single guard fn, `src/lib/transitions.ts`** | Extract to a workflow engine if rules multiply |
| **UI primitives** | **shadcn/ui (copy-in, owned in-repo)** | Components are ours — restyle or replace piecemeal |
| Hosting | Azure Container Apps (container) | App Service / AKS / any container host |
| IaC | Terraform (azurerm + azuread) | Bicep |
| CI/CD | Azure DevOps Pipelines (from GitHub) | GitHub Actions |

## Directory Structure

```
src/
├── app/
│   ├── (auth)/                     # Requires a session — gated by middleware
│   │   ├── dashboard/              # Role-aware tabs (see Routes below)
│   │   ├── requests/
│   │   │   ├── new/                # Create form
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Detail: fields, comments, history, actions
│   │   │       └── edit/           # Draft editing (owner only)
│   │   └── admin/
│   │       └── users/              # ADMIN only — role assignment, activate/deactivate
│   ├── (public)/
│   │   └── signin/
│   ├── api/auth/[...nextauth]/     # Auth.js handler (Node runtime)
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn/ui primitives — owned in-repo
│   ├── requests/                   # RequestForm, RequestTable, StatusBadge, ActionBar
│   ├── comments/                   # CommentList, CommentForm
│   └── history/                    # HistoryTimeline
├── lib/
│   ├── data/                       # ALL Prisma access — every fn performs its access check
│   │   ├── change-requests.ts
│   │   ├── comments.ts
│   │   ├── status-history.ts
│   │   └── users.ts
│   ├── db/                         # Prisma client singleton
│   ├── transitions.ts              # canTransition() — the single state-machine authority
│   ├── validation/                 # Zod schemas, shared by forms and server actions
│   ├── types/
│   └── utils/
├── middleware.ts                   # Route + role gate (Edge runtime — JWT only, no Prisma)
├── auth.config.ts                  # Edge-safe Auth.js config, imported by middleware
├── auth.ts                         # Full Auth.js config: Entra provider + PrismaAdapter
└── styles/

prisma/
├── schema.prisma
└── migrations/

infra/                              # Terraform (ACA, Postgres, ACR, Key Vault, managed identity)
Dockerfile
azure-pipelines.yml
```

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Redirects: signed in → `/dashboard`, otherwise → `/signin` |
| `/signin` | Public | Entra ID sign-in |
| `/dashboard` | Authenticated | Role-aware tabs (below) |
| `/requests/new` | Authenticated | Create a request |
| `/requests/[id]` | Per-record check | Detail, comments, history, available actions |
| `/requests/[id]/edit` | Requester (owner), `DRAFT` only | Edit a draft |
| `/admin/users` | `ADMIN` | Manage roles, activate/deactivate |
| `/api/auth/*` | Public | Auth.js handler |

**Dashboard tabs** — one route, visibility driven by role:

| Tab | Shown to | Contents |
|-----|----------|----------|
| My Requests | Everyone | Requests where the user is the requester |
| Awaiting My Decision | `APPROVER` | `approverId = me` and status is `SUBMITTED` or `UNDER_REVIEW` |
| All Requests | `MANAGER`, `ADMIN` | Every request, org-wide |

All tabs share one filter bar: status, category, priority, date range, free-text on title.

> One dashboard with tabs rather than separate inbox/oversight routes: fewer surfaces to build and
> test, one filter implementation, and it matches the desktop-dense direction in the PRD.

## Data Flow

1. **Server components** call read functions from `src/lib/data/`, passing the current session user.
2. **Data layer** performs the per-record access check, queries via the Prisma singleton
   (`src/lib/db/`), and returns typed results. All functions are `async`.
3. **Components** receive data as props. Client components are used only where interaction demands
   it — filter controls, forms, dialogs.
4. **Mutations** go through server actions, which: resolve the session → validate input with Zod →
   consult `canTransition()` for any status change → call the data layer → `revalidatePath()`.

### The mutation path in full

```
server action
  ├─ auth()                        → session, or reject 401
  ├─ Zod parse                     → typed input, or reject 400
  ├─ load record via data layer    → runs the read access check
  ├─ canTransition(from,to,actor)  → allowed?, or reject 403
  └─ prisma.$transaction([
        update ChangeRequest.status,
        insert StatusHistory row      ← same transaction, always
     ])
```

A status change and its history entry are written **in one transaction**. A status change without
its history row is a defect, not an inconvenience — the audit trail is a product feature here, not
incidental logging.

## Authentication Flow

Auth.js (NextAuth v5) with the **Microsoft Entra ID** provider (OIDC, single-tenant). Handler at
`src/app/api/auth/[...nextauth]/route.ts`.

**There is no sign-up.** Users come from the org directory. On first successful sign-in the Prisma
adapter creates a `User` row with `role = REQUESTER`; an Admin promotes from there.

**Split config, because of the Edge runtime.** Next.js middleware runs on Edge, where Prisma cannot
run. So:

- `src/auth.config.ts` — Edge-safe. Providers and callbacks only, no adapter, no database. Imported
  by `middleware.ts`.
- `src/auth.ts` — the full config: spreads `auth.config.ts` and adds `PrismaAdapter`. Used by the
  route handler and by server actions via the `auth()` helper.

**Sessions are JWT, not database-backed.** Middleware needs the user's role to gate routes, and it
cannot query the database from Edge — so the role travels in the token, written by the `jwt`
callback at sign-in.

**The trade-off, stated plainly:** a role change made by an Admin does not take effect until the
user's token refreshes or they sign in again. Mitigated with a 24-hour session `maxAge`. If
immediate revocation becomes a requirement, that is a genuine architecture change — see
[decisions/001-initial-stack.md](decisions/001-initial-stack.md).

`isActive = false` has the same latency for route gating, but the **data layer re-checks it on every
call**, so a deactivated user is blocked from all reads and mutations immediately even while their
token remains technically valid.

## Authorization Model

**Application-level, not database RLS.** Three layers, all required:

1. **`src/middleware.ts`** — coarse route protection from the JWT: is there a session, is the user
   active, does their role permit this route group?
2. **`src/lib/data/`** — per-record ownership and role checks inside every function, before
   returning or mutating anything.
3. **`src/lib/transitions.ts`** — the state machine. Whether *this actor* may move *this request*
   from *this status* to *that one*.

Layer 1 is a convenience and a UX affordance. **Layers 2 and 3 are the actual security boundary** —
a request that bypasses middleware must still fail at the data layer. See [security.md](security.md).

### Role capability matrix

| Capability | Any user | Approver | Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| Create / edit / delete own draft | ✅ | ✅ | ✅ | ✅ |
| Submit own request | ✅ | ✅ | ✅ | ✅ |
| Read own requests | ✅ | ✅ | ✅ | ✅ |
| Comment on a readable request | ✅ | ✅ | ✅ | ✅ |
| Move own approved request to In Progress / Completed | ✅ | ✅ | ✅ | ✅ |
| Decide on requests assigned to them | — | ✅ | — | — |
| Read all requests org-wide | — | — | ✅ | ✅ |
| Manage users and roles | — | — | — | ✅ |

Creating and tracking your own requests is a **baseline capability of being signed in**, not a
role-gated one — so a Manager or Approver can raise a change without a second role. Roles gate only
deciding, oversight, and administration.

## Component Boundaries

- **Server components own data fetching.** Pages are server components that call `src/lib/data/`
  directly. No client-side fetching, no API layer for the app's own UI.
- **Client components are the exception, not the default** — used for the filter bar, forms,
  dialogs, and the action buttons. Each is a leaf; none fetches data.
- **Filter state lives in the URL** (search params), not React state. The dashboard is then
  shareable, bookmarkable, and server-rendered per filter with no client store.
- **The action bar is a pure function of state.** `RequestActionBar` receives the request and the
  session user, calls the same `canTransition()` the server uses, and renders only permitted
  actions. Shared logic means the UI can never offer a button the server would reject.
- **`StatusBadge` is the single renderer of a status** — one place maps status to label and colour.

## Testing Approach

Per `.claude/rules/testing.md`, every acceptance criterion gets a test. The shape here:

- **Unit (Vitest)** — `canTransition()` is the highest-value target: a table-driven test over every
  (from, to, actor) combination, asserting the allowed set exactly. Zod schemas likewise.
- **Integration (Vitest)** — data-layer access checks against a seeded test database. Each function
  tested for both the permitted and the denied caller. **A data-layer function without a
  denied-caller test is not done.**
- **E2E (Playwright)** — the three PRD user journeys end to end, one spec each.

## What This Architecture Deliberately Does Not Have

- **No API routes** beyond the Auth.js handler. Nothing external consumes this system, so no public
  HTTP surface is built. Adding one later is additive.
- **No client-side state manager.** Server components plus URL state cover it.
- **No background jobs / queues.** Nothing is asynchronous — no notifications, no SLA timers.
- **No file storage.** Attachments are out of scope (backlog F-016).
- **No caching layer.** Postgres at this scale is fast enough; adding Redis now would be
  infrastructure without a problem to solve.
