# F-004 — Plan

> Source: derived from docs/product/PRD.md + docs/architecture/ on 2026-08-28. Backlog: F-004.
> **Pure-infrastructure feature — no user story.** Per [features/README.md](README.md), scaffolding
> and configuration features have a plan only. Criteria are stated here and are
> verification-oriented.

## Approach

Four strands, ordered by value:

1. **PR verification via GitHub Actions** — closes FN-1, needs nothing external.
2. **Verification stages in `azure-pipelines.yml`** — closes a gap that FN-1 understated.
3. **Runtime environment validation** beyond the auth variables.
4. **Terraform parameterised per environment**, written but deliberately not applied.

### Why FN-1 was worse than recorded

`azure-pipelines.yml` triggers only on merge to `main`, and its stages are
`Infra → Build → Migrate → Deploy`. **There is no lint, typecheck or test stage anywhere in it.**

So even with Azure DevOps fully connected, pull requests would still receive zero verification, and
**code would reach production without a single test having run**. That is a design gap in the paved
road, not a configuration oversight.

Both halves are fixed: GitHub Actions verifies PRs now, and a `Verify` stage is added to the ADO
pipeline so that once it *is* wired up, a failing test blocks deployment rather than preceding it.

### Why GitHub Actions alongside Azure DevOps

Recorded in [ADR-002](../../architecture/decisions/002-ci-with-github-actions.md). In short: the two
do different jobs — **GitHub Actions verifies, Azure DevOps deploys** — and GHA needs no
subscription, service connection or variable group, so it works today rather than after a bootstrap
that `environments.md` says an agent cannot perform.

## Files to create / change

| File | Why |
|------|-----|
| `.github/workflows/ci.yml` | **New.** Lint, typecheck, unit tests, build, E2E on every PR (AC-1…AC-4) |
| `azure-pipelines.yml` | New `Verify` stage; `Infra` now depends on it (AC-5) |
| `src/lib/env.ts` | Extend validation to `DATABASE_URL`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_ENV` (AC-6) |
| `src/lib/env.test.ts` | Tests for the new schema (AC-6, AC-7) |
| `infra/variables.tf` | Variables for what genuinely differs per environment (AC-8) |
| `infra/main.tf` | Replace hard-coded sizing with those variables (AC-8) |
| `infra/backend.tf` | Per-environment state guidance — one state file per environment (AC-9) |
| `infra/envs/*.tfvars.example` | **New.** Worked examples for preview and prod (AC-9) |
| `infra/README.md` | Document the per-environment workflow |
| `docs/development/environments.md` | Document CI, and the environment matrix (AC-10) |
| `docs/architecture/decisions/002-ci-with-github-actions.md` | **New.** The ADR |
| `docs/architecture/tech-stack.md` | Record GitHub Actions alongside ADO |

## Acceptance criteria

- [ ] **AC-1:** A GitHub Actions workflow runs on every pull request targeting `main`.
- [ ] **AC-2:** It runs lint, typecheck, unit tests and build, and fails the check if any fails.
- [ ] **AC-3:** It runs the Playwright E2E suite.
- [ ] **AC-4:** It needs **no repository secrets** — no Azure, no ADO, no tenant credentials.
- [ ] **AC-5:** `azure-pipelines.yml` runs lint, typecheck, tests and build **before** any infrastructure or deployment stage, so a failing test cannot deploy.
- [ ] **AC-6:** Runtime validation covers `DATABASE_URL`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL` and `APP_ENV`, not only the auth variables.
- [ ] **AC-7:** Environment validation **fails closed** and reports every problem at once, consistent with the auth schema.
- [ ] **AC-8:** Resource sizing that differs between preview and production is a Terraform variable, not a literal.
- [ ] **AC-9:** Each environment gets its own Terraform state and its own tfvars, so applying preview cannot mutate production.
- [ ] **AC-10:** `environments.md` documents the CI layer and what each environment requires.

### ⛔ Explicitly out of scope

- **Applying Terraform** or provisioning any Azure resource — `environments.md` states Phase-0
  bootstrap cannot be performed by an agent, and neither `az` nor `terraform` is installed here.
- **Wiring Azure DevOps** — needs an ADO organisation, a service connection and a variable group.
- **Enabling branch protection** — settled after CI is merged and green, and only on explicit
  instruction. Recommended settings are reported at the end.

## Tasks

- [ ] Write ADR-002 recording GitHub Actions alongside Azure DevOps
- [ ] Create `.github/workflows/ci.yml` (AC-1 … AC-4)
- [ ] Add the `Verify` stage to `azure-pipelines.yml` (AC-5)
- [ ] Extend `src/lib/env.ts` with the application environment schema (AC-6)
- [ ] Test: valid config passes; each missing/malformed variable is reported (AC-6, AC-7)
- [ ] Parameterise Terraform sizing (AC-8)
- [ ] Add `infra/envs/preview.tfvars.example` and `prod.tfvars.example` (AC-9)
- [ ] Document per-environment state in `backend.tf` and `infra/README.md` (AC-9)
- [ ] Update `environments.md` and `tech-stack.md` (AC-10)
- [ ] Verify: lint, typecheck, unit tests, build, E2E
- [ ] Push, open a PR, and confirm the CI check actually runs green on GitHub

## Criterion → test coverage

| Criterion | Verification | Status |
|-----------|--------------|--------|
| AC-1 | The PR's own check run appears on GitHub | ⬜ *confirmed on the PR* |
| AC-2 | CI job result — `verify` job green | ⬜ *confirmed on the PR* |
| AC-3 | CI job result — `e2e` job green | ⬜ *confirmed on the PR* |
| AC-4 | No `${{ secrets.* }}` reference in the workflow — **verified, none** | ✅ |
| AC-5 | `azure-pipelines.yml` — `Verify` (line 35) precedes `Infra` (line 65), which declares `dependsOn: Verify` | ✅ |
| AC-6 | `src/lib/env.test.ts` — 14 new tests | ✅ |
| AC-7 | `src/lib/env.test.ts` — missing, malformed and fail-closed cases | ✅ |
| AC-8 | `infra/main.tf` — all six sizing literals replaced by variables | ✅ |
| AC-9 | `infra/envs/*.tfvars.example` exist; `backend.tf` documents per-env state keys | ✅ |
| AC-10 | `environments.md` — CI section, environment matrix, branch-protection guidance | ✅ |

> AC-1 … AC-3 can only be confirmed by a real CI run, so they are marked complete once the PR's
> checks report green — not before.

## Verification results

Run 2026-08-28 from a clean `.next`:

| Check | Command | Result |
|-------|---------|--------|
| Lint | `npm run lint` | ✅ exit 0 |
| Types | `npx tsc --noEmit` | ✅ exit 0 |
| Unit tests | `npm run test` | ✅ **173 passed** (149 before) |
| Build | `npm run build` | ✅ exit 0, no warnings |
| E2E | `npx playwright test` | ✅ **36 passed** |
| No CI secrets | grep for `${{ secrets.` | ✅ none |

> **Honest note:** AC-8, AC-9 and AC-10 are verified by inspection, not by tests. **The Terraform
> cannot be validated** — `terraform` is not installed and applying is out of scope. Changes are kept
> mechanical (literals replaced by variables whose defaults are those same literals) precisely
> because they are unvalidated.

## Deviations from PRD / architecture

### 1. GitHub Actions added alongside Azure DevOps — **ADR-002, tech-stack.md updated**

ADR-001 named Azure DevOps as CI/CD. GitHub Actions now handles PR verification while ADO retains
deployment. Recorded in [ADR-002](../../architecture/decisions/002-ci-with-github-actions.md), and
`tech-stack.md` splits the single **CI/CD** row into **CD (deploy)** and **CI (verify)**.

### 2. `NEXT_PUBLIC_APP_URL` validation is stricter than a plain `.url()`

Writing the tests surfaced a real weakness in my own validator: Zod's `.url()` delegates to
`new URL()`, which parses `localhost:3000` as scheme `localhost:` with path `3000` — precisely the
typo made when omitting the protocol, and it would have passed. An explicit `http(s)://` check was
added.

### 3. Key Vault SKU left as a literal

`sku_name = "standard"` in `main.tf` is unchanged. The only alternative is `premium` (HSM-backed
keys), which is a compliance decision rather than an environment-sizing one — parameterising it
would imply a choice nobody has made.

## Blocked / out of scope, as agreed

| Item | Why |
|------|-----|
| Applying Terraform | Not attempted, per instruction. Neither `az` nor `terraform` is installed |
| Wiring Azure DevOps | Needs an ADO organisation, service connection and variable group |
| Enabling branch protection | Deliberately deferred until CI is merged and green. Recommended settings are documented at the end of `environments.md` and reported on completion |

## New finding raised

**FN-10 — production would be publicly reachable.** `postgres_public_network_access_enabled`
defaults to `true`, and `envs/prod.tfvars.example` keeps it `true`. `security.md` recommends VNet
integration with a private endpoint, but the Terraform skeleton does not provision the VNet that
turning it off requires — flipping the flag alone would make the database unreachable, including by
the migration step. Recorded rather than silently left as a default.
