# Project: [PROJECT_NAME]

## What This Is
[One-line description of the product. Replace this after running /init-product]

## Workflow Phases

Projects built from this template move through three phases. At session start, detect which phase the project is in (using the signals below) and orient the user accordingly. The progression is **advisory, not enforced** — earlier phases produce the inputs that later ones depend on, so skipping is rarely wise, but if the user wants to deviate, surface the trade-off and let them decide.

| Signal | Phase | What to recommend |
|--------|-------|-------------------|
| `[PROJECT_NAME]` placeholder above is unfilled, **or** @docs/product/PRD.md still says `Status: Draft` | **1 — Product discovery** | `/init-product` (runs in plan mode — interview captures the PRD before any code is written) |
| PRD is filled in, but @docs/architecture/database.md still says `Status: Draft` | **2 — Architecture design** | `/init-architecture` (designs schema, API contracts, security model from the PRD). Optional sub-step beforehand: `/init-design-system` to capture visual direction and interaction principles — informs component-library and design-token choices in architecture. Skip if the user prefers to decide design as they build. |
| PRD and architecture docs are populated | **3 — Feature development** | `/project-status` to orient, then `/new-feature F-XXX` for the next backlog item |

**Feature-development inner loop:** `project-status` → `new-feature` → develop → `validate` → `commit-feature` → push + PR. Hotfixes use `/hotfix` and skip `new-feature`.

## Tech Stack
The technology stack is **provided by the project's chosen stack**, not hard-coded here.
See @docs/architecture/tech-stack.md for the full stack, rationale, and swap guides.

## Key Commands
> **These become available after `/new-feature F-001` (project scaffolding).** Until F-001 is done, the project has no build tooling, so these commands will fail.

The exact commands depend on the stack — see the **Key Commands** section of @docs/architecture/tech-stack.md (it lists the concrete dev/build/lint/test/migrate commands for this project).

## Project Structure
> **This structure exists after F-001 scaffolds the project.** Before then, the only real folders are `docs/`, `.claude/`, and the root config files.

The directory layout depends on the stack — see the **Directory Structure** section of @docs/architecture/overview.md.

## Workflow Rules — READ THESE
1. **Always branch from main.** Never commit directly to main.
2. **Follow the phase workflow.** Use `/new-feature` to start work properly.
3. **Decision-making follows `.claude/rules/communication.md`.** By default that means presenting options with pros/cons and waiting for the human. (Templates that relax this — e.g. an auto-pilot variant — do so by overriding that rule file, not this one.)
4. **Update docs when you change things — especially `current-phase.md`.** Keep architecture and backlog current. And update @docs/development/current-phase.md at the **start** of a feature (what's now in progress + branch) and again when you **finish** it (what was done + what's next): it's the resume point a fresh session reads first, so a stale one means lost context. Don't end a work session without it reflecting reality.
5. **Validate before committing.** Run lint, type-check, and tests before any commit.
6. **Explain what you're doing.** Prefix actions with a short plain-English explanation.
7. **No AI attribution in commits.** Never include "Co-Authored-By" lines, Claude references, or any AI tool attribution in commit messages.

## Documentation (progressive disclosure — read only when needed)
- Tech stack & swap guides: @docs/architecture/tech-stack.md
- Product requirements: @docs/product/PRD.md
- Per-feature stories, acceptance criteria & plans: @docs/development/features/ (created per feature by `/new-feature`)
- Design system (optional): @docs/product/design-system.md
- Architecture overview: @docs/architecture/overview.md
- Architecture decisions: @docs/architecture/decisions/
- Database schema: @docs/architecture/database.md
- API contracts: @docs/architecture/api-contracts.md
- Security requirements: @docs/architecture/security.md
- Feature backlog: @docs/development/backlog.md
- Current phase plan: @docs/development/current-phase.md
- Git workflow: @docs/development/git-workflow.md
- Environment setup: @docs/development/environments.md
