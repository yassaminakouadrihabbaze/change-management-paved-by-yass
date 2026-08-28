# Architecture Overview

> **Status:** Draft — run `/init-architecture` to fill this out after completing the PRD.
> This is the **`next-azure-postgres`** stack: Next.js in a container on Azure Container Apps,
> Azure Database for PostgreSQL Flexible Server via Prisma, Microsoft Entra ID auth.

## System Diagram

```
                    ┌──────────────────────────────────────────┐
                    │           Azure Container Apps            │
                    │  ┌────────────────────────────────────┐  │
   Browser  ─TLS─►  │  │        Next.js (container)          │  │
                    │  │  ┌────────┐ ┌────────┐ ┌─────────┐  │  │
                    │  │  │ pages/ │ │ comps/ │ │ hooks/  │  │  │
                    │  │  └───┬────┘ └───┬────┘ └────┬────┘  │  │
                    │  │  ┌───┴──────────┴───────────┴────┐  │  │
                    │  │  │  middleware.ts (route auth)    │  │  │
                    │  │  ├────────────────────────────────┤  │  │
                    │  │  │  src/lib/ (data/ db/ types/…)  │  │  │
                    │  │  └───────────────┬────────────────┘  │  │
                    │  └──────────────────┼───────────────────┘  │
                    │   managed identity  │                       │
                    └──────┬──────────────┼───────────────────────┘
                           │              │
              ┌────────────▼───┐   ┌──────▼──────────────────────┐
              │  Azure Key     │   │  Azure DB for PostgreSQL     │
              │  Vault (secrets)│  │  Flexible Server (Prisma)    │
              └────────────────┘   └──────────────────────────────┘

   Identity:  Microsoft Entra ID (OIDC)  ◄── Auth.js handles sessions/cookies
   Image:     built by Azure DevOps → pushed to Azure Container Registry → deployed to ACA
```

## Key Decisions

> For full technology choices, rationale, and swap guides, see [tech-stack.md](tech-stack.md).
> For individual architectural decisions, see [decisions/](decisions/).

| Decision | Choice | Migration Path |
|----------|--------|----------------|
| Framework | Next.js 14+ App Router | Standard React app |
| Database | Azure DB for PostgreSQL Flexible Server | Standard Postgres — any host |
| ORM | Prisma | Swap client in src/lib/data/ |
| Auth | Microsoft Entra ID via Auth.js | Any OIDC / JWT provider |
| Authorization | App middleware + data-layer checks (NOT RLS) | Add RLS as defence-in-depth if needed |
| Hosting | Azure Container Apps (container) | App Service / AKS / any container host |
| IaC | Terraform (azurerm + azuread) | Bicep |
| CI/CD | Azure DevOps Pipelines (from GitHub) | GitHub Actions |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-required routes (grouped)
│   ├── (public)/          # Public routes
│   ├── api/               # API routes (incl. Auth.js handler at /api/auth/[...nextauth])
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Reusable UI primitives
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── data/              # Data access layer — ALL Prisma access lives here (async fns)
│   ├── db/                # Prisma client singleton
│   ├── types/             # Shared TypeScript types
│   └── utils/             # Pure utility functions
├── hooks/                 # Custom React hooks
├── middleware.ts          # Route protection (Auth.js) — the primary authorization gate
├── auth.ts                # Auth.js (NextAuth) config: Entra ID provider, callbacks
└── styles/                # Global CSS, Tailwind config

prisma/
├── schema.prisma          # Data model (source of truth for the DB)
└── migrations/            # Prisma-generated migrations

infra/                     # Terraform (ACA, Postgres, ACR, Key Vault, managed identity, Entra app)
Dockerfile                 # Multi-stage build of the Next.js standalone output
azure-pipelines.yml        # CI/CD: terraform → build → ACR → migrate → deploy
```

## Data Flow

1. **Pages / server actions** call functions from `src/lib/data/`
2. **Data layer** uses the Prisma client (`src/lib/db/`) and returns typed results. Functions are
   `async` (Prisma is async-native).
3. **Components** receive data as props or via hooks
4. **Server actions** handle mutations, calling data-layer functions after Zod validation

## Authentication Flow

Auth.js (NextAuth v5) with the **Microsoft Entra ID** provider (OIDC, single-tenant/workforce). The
Auth.js handler lives at `src/app/api/auth/[...nextauth]/route.ts`; config in `src/auth.ts`. Sessions
are HTTP-only cookies. `src/middleware.ts` protects routes by checking the session.
[Refine after `/init-architecture`: which routes are protected, role claims, sign-in/out UX.]

## Authorization Model

**Application-level, not database RLS.** Two layers:
1. **`src/middleware.ts`** — coarse route protection (authenticated? correct role?).
2. **`src/lib/data/`** — per-record ownership/role checks before returning or mutating data.

See [security.md](security.md). RLS is noted there only as optional defence-in-depth.

## Component Boundaries

[Describe after init-architecture: which components own which state, data-fetching boundaries.]
