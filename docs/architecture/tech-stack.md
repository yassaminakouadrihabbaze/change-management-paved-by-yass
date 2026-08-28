# Tech Stack

> **This is the single source of truth for technology choices.**
> All other docs reference this file. When swapping a technology, update HERE first, then follow the migration checklist at the bottom.

> **This is the `next-azure-postgres` stack** — a production-oriented Azure deployment: Next.js in a
> container on **Azure Container Apps**, **Azure Database for PostgreSQL Flexible Server** via
> **Prisma**, auth through **Microsoft Entra ID**, infrastructure as **Terraform**, and CI/CD via
> **Azure DevOps Pipelines** triggered from a **GitHub** repo. Unlike the local SQLite POC stack,
> this one carries the full security posture (see [security.md](security.md)).

## Current Stack

| Layer | Technology | Version | Purpose | Swap Difficulty |
|-------|-----------|---------|---------|-----------------|
| **Framework** | Next.js | 14+ (App Router) | React framework with SSR, routing, server actions | Medium |
| **Language** | TypeScript | 5+ (strict mode) | Type safety across frontend and backend | Low (config only) |
| **Database** | Azure Database for PostgreSQL Flexible Server | — | Managed, backed-up PostgreSQL | Medium (see guide) |
| **ORM / data access** | Prisma | Latest | Typed schema, client, and migrations | Medium |
| **Auth** | Microsoft Entra ID via Auth.js (NextAuth v5) | `next-auth@beta` | Workforce (single-tenant) sign-in + sessions | Medium |
| **Hosting** | Azure Container Apps (ACA) | — | Serverless containers, revisions, scale-to-zero, managed ingress | Medium |
| **Container** | Docker | — | Multi-stage build of the Next.js standalone output | Low |
| **Registry** | Azure Container Registry (ACR) | — | Stores the built image the pipeline deploys | Low |
| **Secrets** | Azure Key Vault | — | Runtime secrets, referenced by ACA via managed identity | Low |
| **IaC** | Terraform (`azurerm` + `azuread`) | `~> 4` / `~> 3` | Provisions all Azure + Entra resources | Medium |
| **CI/CD** | Azure DevOps Pipelines | — | Build → push to ACR → migrate → deploy, on merge to `main` (GitHub) | Medium |
| **Styling** | Tailwind CSS | 3+ | Utility-first CSS framework | Low |
| **Testing (unit)** | Vitest | Latest | Fast unit/integration tests | Low |
| **Testing (e2e)** | Playwright | Latest | Browser-based end-to-end tests | Low |
| **Validation** | Zod | Latest | Runtime validation for forms and inputs | Low |
| **Linting** | ESLint + Prettier | Latest | Code style and formatting | Low |

> **Auth.js / NextAuth v5 status:** v5 is still published under the `beta` tag (`npm i next-auth@beta`).
> It is widely used in production and is the forward path, but pin a specific beta version and re-check
> the [migration guide](https://authjs.dev/getting-started/migrating-to-v5) before upgrading.

> **Provider versions:** the `azurerm` provider's current major is v4. Pin a constraint (e.g.
> `~> 4`) and run `terraform init -upgrade` to resolve the latest compatible release; don't assume a
> specific patch version.

## Key Commands

> **Available after `/new-feature F-001` (project scaffolding).** Until F-001 is done, this template has no `package.json` — `npm` commands will fail.

```bash
npm run dev            # Local dev server (http://localhost:3000)
npm run build          # Production build (Next.js standalone output for the container)
npm run lint           # ESLint + Prettier
npm run test           # Vitest unit tests
npm run test:e2e       # Playwright end-to-end tests
npx prisma migrate dev      # Create + apply a migration locally
npx prisma migrate deploy   # Apply pending migrations (used by the pipeline against prod)
npx prisma generate         # Regenerate the Prisma client after schema changes
docker build -t <acr>.azurecr.io/<app>:<tag> .   # Build the container image
```

```bash
# Infrastructure (Phase-0 bootstrap, dev-led — see environments.md)
cd infra
terraform init        # after the remote-state backend exists (see infra/README.md)
terraform plan
terraform apply
```

## Why These Choices

**Azure Container Apps over App Service / AKS** — ACA runs the container with managed ingress,
revisions, and scale-to-zero, without the operational weight of Kubernetes. App Service is simpler
but gives less control over scaling and revisions; AKS is overkill for an MVP. The app is a plain
container, so moving to App Service or AKS later is contained.

**Azure Database for PostgreSQL Flexible Server** — managed, backed-up Postgres with VNet
integration and configurable compute. Standard PostgreSQL, so the schema and SQL are portable.

**Prisma** — typed schema (`schema.prisma`), generated client, and a first-class migration tool.
**All database access is isolated in `src/lib/data/`** so the client can be swapped without touching
UI code. Prisma parameterizes all queries by default.

**Microsoft Entra ID via Auth.js** — the organization standardizes on Entra for identity. Auth.js
(NextAuth v5) owns the session, cookies, CSRF, and route-protection helpers, with Entra as the OIDC
identity provider — far less code than wiring MSAL directly, and idiomatic for the App Router.
**Drop to MSAL only if** the app must acquire tokens for downstream Microsoft APIs (Graph),
on-behalf-of flows, or conditional-access scenarios that Auth.js abstracts away.

**Terraform over Bicep** — the organization already standardizes on Terraform (shared modules, state
conventions, reviewer familiarity). Consistency with existing practice beats Bicep's Azure-native
niceties here. The `azurerm` + `azuread` providers cover ACA, Postgres, ACR, Key Vault, managed
identity, and the Entra app registration.

**GitHub + Azure DevOps Pipelines** — the repo stays on GitHub (keeping the PR/merge workflow and a
future autonomous "vibe" variant intact), while Azure DevOps runs the pipeline. ADO triggers from
GitHub on merge to `main`.

**Next.js / TypeScript / Tailwind / Vitest / Playwright / Zod** — same rationale as the other
stacks: server components, type safety, utility CSS, fast tests, runtime validation.

## Swap Guides

### Swapping ACA → App Service or AKS
**Effort:** low–moderate. The app is a container.
1. Point the pipeline's deploy stage at the new target (App Service: deploy the image; AKS: apply a Deployment/Service).
2. Update the Terraform compute resource (`azurerm_container_app` → `azurerm_linux_web_app` or AKS resources).
3. Update `environments.md` and the pipeline. **No application code changes.**

### Swapping Prisma → another client (Drizzle, raw `pg`)
**Effort:** moderate, **contained to `src/lib/data/`**.
1. Replace the Prisma client in `src/lib/db/` and rewrite the data-access functions (keep their async signatures so callers don't change).
2. Re-express `schema.prisma` in the new tool (or hand-write SQL migrations).
3. Update this file and `database.md`. **UI, pages, hooks, and tests that mock the data layer don't change.**

### Swapping Entra/Auth.js → another provider
**Effort:** moderate. Replace the Auth.js provider (or library) and the app registration; route-protection structure in `src/middleware.ts` stays.

### Swapping Terraform → Bicep, or Azure DevOps → GitHub Actions
**Effort:** moderate. Re-express `infra/*.tf` as Bicep, or `azure-pipelines.yml` as a GitHub Actions workflow. No application code changes. (A GitHub Actions move also simplifies a future autonomous "vibe" variant.)

## Adding New Technologies
Before adding a dependency: check it isn't already covered, that it's maintained and typed, and that
it's worth the weight. Document significant additions here and create an ADR for significant choices.
