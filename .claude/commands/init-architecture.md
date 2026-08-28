---
description: Design the technical architecture based on the PRD. Creates architecture docs, database schema, and API contracts.
---

# Initialize Architecture

Design the technical architecture. This must be done AFTER `/init-product`. Optionally also after `/init-design-system` — if the user ran it, the design intent will inform component-library and design-token decisions here.

> **User stories are not refined here.** Each feature's story + acceptance criteria are written
> just-in-time at `/new-feature`, derived from the PRD and these architecture docs (see
> `docs/development/features/README.md`). This command produces the durable architecture that those
> per-feature specs are derived from.

## Stack flexibility
This template ships with a stack already documented in @docs/architecture/tech-stack.md — **read it
there; don't assume a particular stack.** At step 2 the stack is a confirmation point (see the
**decision policy** below): confirm the documented stack fits, or capture a deviation. If the stack
changes from what `tech-stack.md` documents, also **update @docs/architecture/tech-stack.md** to
match in step 3, and **update @CLAUDE.md** if its stack reference now misrepresents reality.

## Decision policy for this command
Steps 2 is a confirmation point. Handle it per `.claude/rules/communication.md`:
- **Default:** present the proposed architecture (and the stack, or any proposed deviation) with trade-offs, and **wait for the user to decide** before documenting.
- **If an autonomy policy is in effect** (an `autonomy.md` rule is present): **don't ask** — use the stack as documented in @docs/architecture/tech-stack.md, make sensible conventional architecture choices, write the docs, and *inform* the user in plain language. If the product needs something the stack genuinely can't support, **escalate** per `.claude/rules/escalation.md` instead of improvising.

## Step 1: Load product context
Read @docs/product/PRD.md and @docs/development/backlog.md.

Also check @docs/product/design-system.md — if it has been populated (i.e. not still in `Status: Draft`), read it; the design intent will inform component-library and Tailwind theme decisions in step 2. If it's still a draft, that's fine — the user opted to defer; flag it as "design decisions to be made during feature development" and proceed.

Summarize: "I've reviewed the product requirements. Here's what I understand we're building: [summary]"

## Step 2: Propose the architecture (confirmation point — see decision policy above)
Based on the PRD (and design-system.md, if populated), determine:
- **Stack** (default or a deviation — record any deviations)
- **Pages/routes** needed (App Router structure or equivalent)
- **Data model** (entities, relationships)
- **API endpoints** (if any beyond framework-native server actions)
- **Auth approach** (provider, methods, roles)
- **Third-party integrations** (if any)
- **Component library / design tokens** (informed by design-system.md if present)

Per the decision policy: in the default flow, present this as a proposal with trade-offs and wait for approval; in autonomous mode, decide and inform.

## Step 3: Document the architecture
Generate/update these files:
- @docs/architecture/overview.md — component diagram, data flow, key decisions
- @docs/architecture/database.md — full schema with table definitions
- @docs/architecture/api-contracts.md — endpoint specs
- @docs/architecture/security.md — auth, authorization, data protection
- @docs/architecture/tech-stack.md — **only if the stack changed** from the default; update the table, rationale, and swap guides
- @CLAUDE.md — **only if the stack changed**; update the stack reference so it reflects reality

## Step 4: Create first ADR
Create @docs/architecture/decisions/001-initial-stack.md documenting the stack choice and the main architecture decisions, so any developer or AI agent can review the reasoning later. Follow the format in @docs/architecture/decisions/000-template.md (copy it; see @docs/architecture/decisions/README.md for the ADR conventions).

## Step 5: Refine the backlog
Update @docs/development/backlog.md: refine the phase breakdown and add technical dependencies discovered during architecture (e.g. "F-007 depends on F-005 because the comments table references posts"). Do **not** write per-feature stories here — those come at `/new-feature` time.

## Step 6: Rewrite the README as a project README
Until now `README.md` has been **template-onboarding** content (how to set up and use the template).
The product and architecture are now defined, so replace it so the repo's front door describes
*this app*, not the template:
- **Title + one-liner** from the PRD (product name + what it does).
- **What it does / core features** — a short summary from the PRD's core features.
- **Tech stack** — a brief summary (or link) from @docs/architecture/tech-stack.md.
- **Getting started / how to run** — the dev/build/test commands from the **Key Commands** section
  of @docs/architecture/tech-stack.md. These only work *after* scaffolding (`/new-feature F-001`);
  if F-001 isn't done yet, say so explicitly.
- **Documentation index** — keep links to the key docs.
- Keep a **brief** "Working with Claude Code" command reference for ongoing development, but **drop
  the one-time template-onboarding / getting-started steps** — setup is complete.

(Per the decision policy, this is part of the architecture documentation output — in the default
flow it's presented with the rest for approval; in autonomous mode, write it and summarize. The
README is then kept current at phase boundaries by `/commit-feature`.)

## Step 7: Handoff note
"✅ Architecture documented. Key files:
- Overview: docs/architecture/overview.md
- Database: docs/architecture/database.md
- API contracts: docs/architecture/api-contracts.md
- Security: docs/architecture/security.md

The README now describes your project (it was template-onboarding content until now).

**These docs are the source of truth.** Any human or AI agent can read them to understand how to build this system. Each feature's story and plan get derived from them when you start the feature.

**Next step: scaffold the project.** Run `/new-feature F-001` to pick up the first backlog item — this scaffolds the chosen stack. After F-001 is committed, the project is a real, runnable app."
