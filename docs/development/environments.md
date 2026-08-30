# Environment Setup

> Stack: **Azure Container Apps + PostgreSQL Flexible Server + Microsoft Entra ID**, infra in
> **Terraform**, CI/CD in **Azure DevOps** from a **GitHub** repo.
>
> This stack deploys to real Azure infrastructure, so it has a **one-time, dev-led bootstrap**
> (Phase 0) that provisions resources and wires the pipeline. After that, day-to-day development and
> shipping (Phase 1+) need no Azure credentials in the app workflow — code merges to `main` on GitHub
> and the pipeline deploys.

## Prerequisites

- **Node.js** 18+ and **npm**
- **Git** + a **GitHub** repository
- **Docker** (to build the image locally if needed)
- **Azure CLI** (`az login`) and an **Azure subscription** with rights to create resources
- **Terraform** 1.x
- **Microsoft Entra ID** tenant + permission to register an application (directory privileges)
- **Azure DevOps** organization/project (for the pipeline + service connection)

> Phase 0 requires elevated Azure + Entra privileges and **must be done by a developer/operator**.
> It cannot be performed by an autonomous agent — there are no Azure credentials in the app workflow.

## Environments

| Environment | Purpose | Database | Runs at | Provisioned? |
|-------------|---------|----------|---------|--------------|
| **Local** | Development & debugging | Local Postgres or a dev Flexible Server | localhost | ✅ Postgres 16 installed; ⛔ no migration yet (FN-7) |
| **Preview** | QA / demos | Preview Flexible Server | ACA preview revision/app | ⛔ Not provisioned |
| **Production** | Live users | Production Flexible Server | ACA production app | ⛔ Not provisioned |

> For an MVP you may start with just **Local + Production** and add Preview later.
> Terraform is parameterised per environment as of F-004 — see
> [`../../infra/README.md`](../../infra/README.md) for the state-key and tfvars workflow. **Nothing
> has been applied**; both cloud environments exist as configuration only.

> **Local ports:** other applications on the current development machine occupy 3000 and 3100. The
> E2E suite uses **3456** (`E2E_PORT` overrides), and `npm run dev -- --port 3456` matches the
> `AUTH_URL` in `.env.local`.

## Continuous Integration (F-004)

Two systems, doing different jobs. See
[ADR-002](../architecture/decisions/002-ci-with-github-actions.md).

| | GitHub Actions | Azure DevOps |
|---|---|---|
| **Owns** | Verification | Deployment |
| **Runs** | lint, typecheck, unit tests, build, E2E | Terraform → image → migrate → deploy |
| **Triggers on** | Every PR to `main`, and pushes to `main` | Merge to `main` |
| **Needs** | Nothing — no secrets, no subscription | ADO project, service connection, variable group |
| **Status** | ✅ Active | ⛔ Not connected |

`azure-pipelines.yml` also gained a **`Verify` stage** that all other stages depend on, so once it is
connected a failing test cannot deploy. Previously the pipeline ran no tests at all — it would have
released to production without executing the suite.

> **What CI does *not* prove.** It verifies what the test suite covers. The database-backed data
> layer is still untested (FN-9) and real Entra sign-in is still unverified (FN-8). **A green CI run
> does not mean the application works end to end.**

### Branch protection

Not yet enabled. `main` currently accepts direct pushes (FN-2). Recommended settings, now that
status checks exist, are listed at the end of this document.

## Phase 0 — Bootstrap (dev-led, once)

> All commands are run by an operator with Azure + Entra privileges. See `infra/README.md` for the
> exact order and the remote-state chicken-and-egg.

1. **Create the Terraform remote-state backend** (a Storage account + container). This must exist
   *before* `terraform init` can use it — bootstrap it with a small `az` script or a separate
   local-state config (documented in `infra/README.md`).
2. **Provision infrastructure:**
   ```bash
   cd infra
   terraform init
   terraform plan
   terraform apply
   ```
   This creates: resource group, ACR, Container App environment + app, PostgreSQL Flexible Server,
   Key Vault, a user-assigned managed identity, and the Entra app registration (`azuread`).
3. **Register / confirm the Entra app** (the Terraform `azuread_application` creates it): set the
   redirect URI to `https://<app-host>/api/auth/callback/microsoft-entra-id`, capture the client ID,
   and create a client secret (or federated credential).
4. **Seed Key Vault** with `DATABASE_URL`, `AUTH_SECRET`, and the Entra client secret.
5. **Wire Azure DevOps:** create a service connection to the subscription (prefer **workload-identity
   federation** — no stored secret), import the pipeline (`azure-pipelines.yml`), and connect it to
   the GitHub repo so merges to `main` trigger it.

## Local Development Setup

### 1. Clone and install
```bash
git clone [your-repo-url]
cd [project-name]
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.local
```
Fill in (see the reference below). For local dev you can point `DATABASE_URL` at a local Postgres
(e.g. Docker) or a dev Flexible Server. Generate `AUTH_SECRET` with `npx auth secret`.

### 3. Database
```bash
npx prisma migrate dev      # apply migrations to your local/dev database
npx prisma generate         # generate the client
```

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000.

## Environment Variable Reference

| Variable | Description | Where |
|----------|-------------|-------|
| `DATABASE_URL` | Postgres connection string (`sslmode=require` for Azure) | Server (Key Vault in prod) |
| `AUTH_SECRET` | Auth.js session encryption secret (`npx auth secret`) | Server (Key Vault in prod) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Entra application (client) ID | Server |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Entra client secret | Server (Key Vault in prod) |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/<tenant-id>/v2.0` | Server |
| `AUTH_URL` / `NEXTAUTH_URL` | App base URL (e.g. `https://<app-host>`) | Server |
| `NEXT_PUBLIC_APP_URL` | App base URL for client use | Client + Server |

> Variable names verified against the Auth.js Microsoft Entra ID provider docs. If you pin a
> different `next-auth` beta, re-check them.

## Phase 1+ — Promoting to Production

1. Open a PR on GitHub, merge to `main`.
2. The Azure DevOps pipeline triggers: `terraform plan/apply` (if infra changed) → build image →
   push to ACR → `npx prisma migrate deploy` → deploy a new ACA revision.
3. ACA shifts traffic to the new revision; roll back by reactivating the previous revision.

## Seed Data & Test Accounts

- Real users come from Entra ID — there are no app-managed passwords to seed.
- For non-prod, seed sample domain data (a small seed script). Use obviously fake data; never real
  personal data; never seed production.

## Troubleshooting

**"Can't reach database"** → check `DATABASE_URL` + `sslmode=require`, and the Flexible Server
firewall/VNet rules allow the client.
**"Sign-in redirect mismatch"** → the Entra app's redirect URI must exactly match
`https://<app-host>/api/auth/callback/microsoft-entra-id`.
**"Pipeline can't deploy"** → confirm the ADO service connection (workload-identity federation) has
rights on the subscription and ACR.
**"Migrations didn't run"** → the pipeline runs `prisma migrate deploy` before deploy; check that
stage's logs and that `DATABASE_URL` is resolved from Key Vault.

---

## Recommended branch protection for `main`

Not yet enabled — deliberately left until CI existed, because "require status checks to pass" is
meaningless without checks to require. Now that `.github/workflows/ci.yml` produces them, these are
the settings to apply (Settings → Branches → Add rule, or via the API):

| Setting | Recommended | Why |
|---------|-------------|-----|
| Require a pull request before merging | **On** | Makes `.claude/rules/git-workflow.md` rule 1 enforced rather than honoured by convention |
| Required approvals | **0** for a solo project | A self-approval requirement blocks a single maintainer entirely. Raise to 1 as soon as there is a second contributor |
| Require status checks to pass | **On** — `Lint, types, unit tests, build` and `End-to-end tests` | The whole point of F-004's CI |
| Require branches to be up to date before merging | **On** | Prevents a PR that passed against stale `main` from merging a semantic conflict |
| Require conversation resolution | **On** | Cheap; stops review comments being merged past |
| Block force pushes | **On** | `git-workflow.md` recommends it; force-push to `main` destroys history |
| Block deletions | **On** | Same reasoning |
| Include administrators | **Consider** | Strictest, but a solo owner can lock themselves out of an urgent hotfix. Leaving it off is defensible while the team is one person — decide deliberately rather than by default |

**Do not enable "Require status checks" until at least one CI run has completed on `main`** — GitHub
only offers checks it has actually observed, so the names will not appear in the picker before then.
