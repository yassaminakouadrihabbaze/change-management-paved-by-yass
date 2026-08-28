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

| Environment | Purpose | Database | Runs at |
|-------------|---------|----------|---------|
| **Local** | Development & debugging | Local Postgres or a dev Flexible Server | localhost:3000 |
| **Preview** | QA / demos | Preview Flexible Server | ACA preview revision/app |
| **Production** | Live users | Production Flexible Server | ACA production app |

> For an MVP you may start with just **Local + Production** and add Preview later. The Terraform
> skeleton provisions one environment; parameterize it (workspaces or `*.tfvars` per env) to add more.

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
