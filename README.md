# [PROJECT_NAME]

> [One-line product description — update after running `/init-product`]

## Prerequisites

Before you begin, make sure you have these installed on your machine:

1. **A code editor** — [VS Code](https://code.visualstudio.com/) recommended (has a Claude Code extension)
2. **Node.js 18+** — download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
   - To check: run `node --version` in your terminal
3. **Git** — download from [git-scm.com](https://git-scm.com/)
   - To check: run `git --version` in your terminal
4. **Claude Code** — install with `npm install -g @anthropic-ai/claude-code`
   - Requires a Claude Pro, Max, or API subscription

You'll also want a **[GitHub](https://github.com)** account for your repository. Depending on the
stack, you may need additional accounts (e.g. a database or hosting provider) — see
[docs/development/environments.md](docs/development/environments.md) for exactly what your stack requires.

## Getting Started (Step by Step)

> **About the template:** This repository is a **scaffolding kit**, not a runnable app. There's no `package.json`, no `src/`, and no database setup yet — those are created during scaffolding (Step 7). The technology stack is documented in [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md).

### Step 1: Get the template into a new repository

Pick **one** of the two approaches below. Approach A is recommended — it gives you a clean new repo on GitHub with no link to the template's history.

#### Approach A — GitHub "Use this template" _(recommended)_

1. On GitHub, open the template repository.
2. Click **"Use this template"** → **"Create a new repository"**, name it, set visibility, and create.
3. Clone *your new repo* (not the template) to your machine:
   ```bash
   git clone https://github.com/[your-username]/[your-repo].git
   cd [your-repo]
   ```

✅ You now have all the template files locally, in a fresh repo with one initial commit. **Skip to Step 2.**

#### Approach B — Clone and detach _(no GitHub, or you want a different host)_

```bash
# 1. Clone the template, 2. detach its history, 3. start fresh
git clone [template-url] my-project
cd my-project
rm -rf .git          # Windows PowerShell: Remove-Item -Recurse -Force .git
git init
git add -A
git commit -m "chore: initial project template"
# (Optional, when you have a remote ready):
# git remote add origin [your-repo-url] && git push -u origin main
```

✅ All the template files locally, in a fresh repo with one initial commit.

### Step 2: Open the project in VS Code

Open the project folder: `File → Open Folder…` (or run `code .` from the terminal).

> **💡 Tip — use VS Code's integrated terminal** (`` Ctrl+` `` / `` Cmd+` ``). Every command below can run inside it, so you stay in one window.

### Step 3: Open Claude Code

Two equivalent ways — both use the same slash commands:
- **VS Code panel (recommended):** `Ctrl/Cmd+Shift+P` → **"Claude Code: Open"**, or click the Claude Code icon in the activity bar.
- **Terminal:** run `claude` from the project folder.

Either way, Claude reads [CLAUDE.md](CLAUDE.md) at session start and knows your project context.

### Step 4: Define the product (~10 minutes)
```
/init-product
```
Plan-mode interview. Captures product overview, personas, user journeys, and success metrics. Generates [docs/product/PRD.md](docs/product/PRD.md) and [docs/development/backlog.md](docs/development/backlog.md). You review the drafts before any file is written. (User stories are created per feature later, at `/new-feature`.)

### Step 5: Capture design direction (optional, ~5 minutes)
```
/init-design-system
```
Plan-mode interview covering brand voice, visual direction, and interaction principles → [docs/product/design-system.md](docs/product/design-system.md). Skip it if you'd rather decide design as you build.

### Step 6: Design the architecture (~15 minutes)
```
/init-architecture
```
Designs the data model, API contracts, security model, and component-library choice from your PRD → docs under [docs/architecture/](docs/architecture/). The stack is the one documented in [tech-stack.md](docs/architecture/tech-stack.md); if you want to deviate, say so during this step and the docs will be updated.

### Step 7: Scaffold the project — `/new-feature F-001`
```
/new-feature F-001
```
The first backlog item, "Project scaffolding": Claude creates a branch and scaffolds the stack (`package.json`, `src/`, config, and any database/migration setup), then walks you through it.

**After F-001 is committed, the project is a real, runnable app.**

### Step 8: Set up your environment and run
Follow **[docs/development/environments.md](docs/development/environments.md)** for your stack's setup — which accounts (if any) you need, environment variables, and database/migrations. Then, typically:
```bash
cp .env.example .env.local   # fill in per environments.md (if your stack needs it)
npm install
npm run dev
```
(The exact commands for your stack are in [tech-stack.md](docs/architecture/tech-stack.md) under **Key Commands**.)

### Step 9: Build the rest of the backlog
```
/new-feature F-002
```
Continue with F-002, F-003, … via `/new-feature [F-XXX]`. See "Working with Claude Code" below.

## Working with Claude Code

This project is set up for agentic development. Every session, Claude reads `CLAUDE.md` and knows your project context. Commands are grouped by lifecycle phase:

### Setup (one-time, when starting a new project)
| Command | When to Use |
|---------|-------------|
| `/init-product` | Phase 1 — plan-mode interview that produces PRD and backlog |
| `/init-design-system` _(optional)_ | Between phase 1 and 2 — capture visual direction and interaction principles |
| `/init-architecture` | Phase 2 — design the data model, API contracts, security model from the PRD |

### Day-to-day (every feature)
| Command | When to Use |
|---------|-------------|
| `/project-status` | Start of any new session — get oriented |
| `/new-feature [F-XXX]` | Begin a backlog item (branch + derive the feature's story & plan) |
| `/validate` | Check work against the feature's acceptance criteria, plus lint/types/tests/build |
| `/commit-feature` | Wrap up, update docs, and commit |
| `/hotfix [issue]` | Urgent production fix (skips the new-feature ceremony) |

**The three-phase view:**

1. **Discovery** — `init-product` (and optionally `init-design-system`)
2. **Architecture** — `init-architecture`
3. **Feature development (per feature)** — `project-status` → `new-feature` → develop → `validate` → fix → `validate` → `commit-feature` → push + PR

## Documentation

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](CLAUDE.md) | Instructions Claude reads at the start of every session |
| [Tech Stack](docs/architecture/tech-stack.md) | Technology choices, key commands, and swap guides |
| [PRD](docs/product/PRD.md) | What we're building and why |
| [Feature specs](docs/development/features/) | Per-feature stories + plans with acceptance criteria (created at `/new-feature`) |
| [Design System](docs/product/design-system.md) | Visual direction, brand voice, interaction principles _(optional)_ |
| [Architecture](docs/architecture/overview.md) | How the system is designed |
| [Database](docs/architecture/database.md) | Data model and schema |
| [API Contracts](docs/architecture/api-contracts.md) | Endpoint specifications |
| [Security](docs/architecture/security.md) | Security requirements |
| [Backlog](docs/development/backlog.md) | Feature list with priorities, phases, dependencies |
| [Current Phase](docs/development/current-phase.md) | What's in progress and what's next |
| [Git Workflow](docs/development/git-workflow.md) | Branching, commits, and rollback |
| [Environments](docs/development/environments.md) | Setup, accounts, and environment configuration |

## Tech Stack

See [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) for the full stack, key commands, rationale, and swap guides.

## License

[Choose a license]
