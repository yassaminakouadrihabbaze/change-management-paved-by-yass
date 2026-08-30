# ADR-002: GitHub Actions for PR verification, alongside Azure DevOps for deployment

**Status:** Accepted
**Date:** 2026-08-28
**Deciders:** Product owner (Yassamina Habbaze), with Claude Code during F-004

## Context

[ADR-001](001-initial-stack.md) adopted Azure DevOps Pipelines as the stack's CI/CD. Seven pull
requests have since merged, and **every one of them merged with zero automated verification**. The
only evidence any of them worked came from a developer running commands locally.

Two separate causes, and the second is the one that matters:

1. **Azure DevOps is not connected to the GitHub repository.** It needs an ADO organisation and
   project, a service connection to the subscription, and the `next-azure-postgres-vars` variable
   group. `docs/development/environments.md` states this bootstrap requires elevated Azure and Entra
   privileges and **cannot be performed by an autonomous agent**.

2. **`azure-pipelines.yml` would not verify pull requests even if it were connected.** It triggers
   only on merge to `main`, and its stages are `Infra → Build → Migrate → Deploy`. **There is no
   lint, typecheck or test stage anywhere in it.** Connecting ADO tomorrow would leave PRs unverified
   *and* allow code to reach production without a single test having run.

So the gap is not "CI is not set up yet". The pipeline as designed never runs the test suite, and
the trunk has no automated gate at all. `docs/development/git-workflow.md` recommends branch
protection with "require status checks to pass" — which cannot be enabled, because no status checks
exist to require.

## Options Considered

### Option A: Wait for Azure DevOps, then add test stages there

- **Pros:** One CI/CD system. No deviation from ADR-001. Single place to look at results.
- **Cons:** Blocked on external provisioning of unknown duration — the same class of blocker already
  holding FN-7 and FN-8. Leaves the trunk unguarded meanwhile, and branch protection unachievable.
  Every PR merged in the interim continues to rest on one developer's local machine.

### Option B: GitHub Actions for PR verification, Azure DevOps for deployment

- **Pros:** Needs **nothing external** — GitHub-hosted runners, no subscription, no service
  connection, no secrets. Works on the next PR. Produces the status checks branch protection
  requires. Verification lives next to the code it verifies, and runs on the same platform the PRs
  do.
- **Cons:** Two CI systems to understand. A deviation from ADR-001. Duplicate definitions of "run the
  tests" in two files.

### Option C: Move CI/CD entirely to GitHub Actions

- **Pros:** One system. Removes the ADO bootstrap from the critical path altogether.
- **Cons:** Discards the paved road's deployment pipeline, which is written and reviewed. Would need
  federated credentials to Azure, ACR push rights and Terraform state access configured in GitHub —
  replacing one external prerequisite with a different, larger one. Contradicts the stack the PRD
  records as a hard constraint.

## Decision

**Option B.** The two systems own different jobs, and the split is along a real seam:

| System | Owns | Trigger |
|---|---|---|
| **GitHub Actions** | Verification — lint, typecheck, unit tests, build, E2E | Every pull request to `main` |
| **Azure DevOps** | Deployment — Terraform, image build, migrations, release | Merge to `main` |

A `Verify` stage is **also** added to `azure-pipelines.yml`, with `Infra` depending on it, so that
once ADO is connected a failing test blocks deployment. This is deliberate redundancy: the two
systems guard different moments — GitHub Actions guards the merge, Azure DevOps guards the deploy —
and a merge gate is not a substitute for a deploy gate when hotfixes, reverts and manual runs exist.

The GitHub Actions workflow **must require no repository secrets**. That is a constraint, not an
accident: the moment CI needs a credential, it inherits the provisioning blocker it exists to route
around.

## Consequences

**Positive:**
- Pull requests are verified from the next one onward, with no external dependency.
- Status checks exist, so branch protection becomes achievable — closing FN-2's prerequisite.
- Deployment can no longer proceed on failing tests once ADO is wired.
- Contributors see results on the platform where they raise the PR.

**Negative:**
- Two CI definitions to keep in step. If a new check is added to one and not the other, they drift.
- Two places to look when something fails.
- A deviation from ADR-001's single-CI/CD assumption, which `tech-stack.md` now records explicitly.

**Risks:**
- **Drift between the two definitions.** Mitigated by both invoking the same npm scripts
  (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`) rather than reimplementing
  the commands — the scripts are the shared contract.
- **A false sense of coverage.** GitHub Actions verifies what the test suite covers. It cannot verify
  what remains blocked: no database means the data layer is still untested (FN-9), and no tenant
  means real sign-in is still unproven (FN-8). CI going green does **not** mean the application
  works end to end.
- **Minutes cost** on private repositories. Negligible at this scale, but it grows with the suite.

## Migration Path

**If Azure DevOps should later own verification too:** move the `Verify` stage's steps into the
pipeline (they are already there), delete `.github/workflows/ci.yml`, and update the required status
checks in branch protection. Low effort — perhaps an hour — because both call the same npm scripts.

**If GitHub Actions should later own deployment too (Option C):** substantially larger. It requires
federated credentials from GitHub to Azure, ACR push permissions, Terraform remote-state access, and
a rewrite of four pipeline stages. Estimate days, not hours, and it would supersede ADR-001 rather
than amend it.

**To remove CI entirely:** delete the workflow file. Nothing depends on it except branch protection's
required-checks list, which would need updating first or merges would block.
