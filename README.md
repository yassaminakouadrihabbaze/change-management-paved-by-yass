# Change Management System

> Create, review, approve and track change requests — with role-based actions, comments, a full
> status history, and a filterable dashboard.

Replaces a manual process run on email, documents and spreadsheets, where approvals stall in
inboxes, nobody can answer "where is my request?", and there is no reliable record of who decided
what.

This is a **general** change management system. It is deliberately not an ITIL/CAB tool — no change
advisory board, no release windows, no risk-assessment or rollback-plan fields.

## What It Does

- **Raise a change request** — title, description, category, priority, target date. Save as a draft,
  submit when ready.
- **Review and decide** — the assigned approver approves, rejects, or sends the request back for
  changes, with a reason.
- **Track it through its lifecycle** — the current status is always visible, and the requester drives
  approved work to completion.
- **Discuss in place** — comments live on the request, not in an email thread.
- **See what happened** — an append-only status history records who did what, and when.
- **Find anything** — a role-aware dashboard filtered by status, category, priority and date.

### Lifecycle

```
Draft → Submitted → Under Review → Approved | Rejected | Changes Requested

Changes Requested → Draft              (requester edits and resubmits)
Approved → In Progress → Completed     (driven by the requester)
```

### Roles

| Role | Can do |
|------|--------|
| *(any signed-in user)* | Raise, edit, submit and track their own requests; comment; complete their approved work |
| **Approver** | Decide on requests **assigned to them** |
| **Manager** | Read every request org-wide; dashboard oversight |
| **Admin** | Manage users and role assignment |

Raising a request is a baseline capability of being signed in, not a role — so a Manager or Approver
can raise a change without needing a second role.

**Not in the MVP:** attachments, notifications, multi-step approval chains, SLA timers, reporting and
export, external integrations. See [the PRD](docs/product/PRD.md) for the full scope boundary.

## Tech Stack

Next.js 14+ (App Router, TypeScript) → Prisma → Azure Database for PostgreSQL Flexible Server.
Auth via Microsoft Entra ID (Auth.js v5). Tailwind + shadcn/ui. Deployed as a container to Azure
Container Apps, provisioned by Terraform, shipped by Azure DevOps Pipelines.

Full detail, versions and swap guides: [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md).

Two things worth knowing before you read the code:

- **Authorization is enforced in the application, not the database.** There is no Row-Level Security
  backstop, so every function in `src/lib/data/` performs its own ownership/role check. A missing
  check is a vulnerability, not a defaulted-deny. See [security.md](docs/architecture/security.md).
- **There is no sign-up.** Single-tenant Entra ID provisions users from the org directory on first
  sign-in, defaulting to the Requester role.

## Getting Started

> ⚠️ **The app is not scaffolded yet.** Backlog item **F-001 (project scaffolding)** has not been
> completed, so there is no `package.json`, no `src/`, and no Prisma schema in this repository yet —
> only documentation. **The commands below will not work until F-001 is done.**
>
> To scaffold it, open Claude Code in this folder and run `/new-feature F-001`.

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/) (LTS)
- **Git** — [git-scm.com](https://git-scm.com/)
- **Docker** — for building the container image locally
- Access to the **Azure subscription** and the **Entra ID tenant** for this project

### Once F-001 is complete

```bash
cp .env.example .env.local   # fill in per docs/development/environments.md
npm install
npm run dev                  # http://localhost:3000
```

### Key commands

```bash
npm run dev                  # Local dev server
npm run build                # Production build (Next.js standalone output)
npm run lint                 # ESLint + Prettier
npm run test                 # Vitest unit tests
npm run test:e2e             # Playwright end-to-end tests
npx prisma migrate dev       # Create + apply a migration locally
npx prisma generate          # Regenerate the Prisma client after schema changes
```

Environment setup, required accounts and per-environment configuration:
[docs/development/environments.md](docs/development/environments.md).

## Working with Claude Code

This project is set up for agentic development — Claude reads [CLAUDE.md](CLAUDE.md) at the start of
every session for context.

| Command | When to use |
|---------|-------------|
| `/project-status` | Start of any session — get oriented on what's in progress |
| `/new-feature [F-XXX]` | Begin a backlog item (creates a branch, derives the story + plan) |
| `/validate` | Check work against acceptance criteria, plus lint/types/tests/build |
| `/commit-feature` | Wrap up, update docs, and commit |
| `/hotfix [issue]` | Urgent production fix (skips the new-feature ceremony) |

**Per-feature loop:** `project-status` → `new-feature` → develop → `validate` → fix → `validate` →
`commit-feature` → push + PR.

## Documentation

| Doc | Purpose |
|-----|---------|
| [PRD](docs/product/PRD.md) | What we're building and why — scope, personas, user flows |
| [Backlog](docs/development/backlog.md) | Feature list with priorities, phases, dependencies |
| [Current Phase](docs/development/current-phase.md) | What's in progress and what's next |
| [Architecture Overview](docs/architecture/overview.md) | Routes, data flow, authorization model, component boundaries |
| [Database](docs/architecture/database.md) | Schema, indexes, and the status transition rules |
| [API Contracts](docs/architecture/api-contracts.md) | Every server action with its authorization check |
| [Security](docs/architecture/security.md) | Auth, authorization layers, data protection, pre-launch checklist |
| [ADR-001](docs/architecture/decisions/001-initial-stack.md) | Why the stack and core architecture are what they are |
| [Tech Stack](docs/architecture/tech-stack.md) | Technology choices, key commands, swap guides |
| [Design System](docs/product/design-system.md) | Visual direction — **not yet defined**, deferred to feature development |
| [Feature specs](docs/development/features/) | Per-feature stories + plans (created at `/new-feature`) |
| [Git Workflow](docs/development/git-workflow.md) | Branching, commits, and rollback |
| [Environments](docs/development/environments.md) | Setup, accounts, and environment configuration |
| [CLAUDE.md](CLAUDE.md) | Instructions Claude reads at the start of every session |

**The architecture docs are the source of truth.** Each feature's story and plan are derived from
them when the feature starts.

## License

[Choose a license]
