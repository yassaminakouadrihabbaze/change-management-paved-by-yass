---
description: Start a new feature from the backlog. Creates branch, derives the feature's story + plan, and walks you through the build.
argument-hint: [feature-name or backlog-item-id]
---

# New Feature Workflow

You are starting a new feature. Follow these steps, explaining each as you go. Confirmation points
defer to the **decision policy** in `.claude/rules/communication.md` (default: present and wait; if
an `autonomy.md` policy is in effect: proceed on sensible defaults and, when blocked, escalate per
`.claude/rules/escalation.md`).

## Step 1: Check git status
Run `git status` to make sure we're on main with a clean working tree.
If not, stop and explain the situation. (Confirmation point — per the decision policy.)

## Step 2: Pull latest
Run `git pull origin main`.

## Step 3: Identify the feature
If the user provided a backlog item ID, read @docs/development/backlog.md and find it. If they gave a name, search the backlog. If there's no match, treat "add it to the backlog vs. proceed ad-hoc" as a confirmation point (per the decision policy).

## Step 4: Check dependencies
Review the backlog entry for dependencies. If a dependency isn't complete, this is a confirmation point (per the decision policy): by default, warn and ask whether to work the prerequisite first or proceed anyway; in autonomous mode, build/sequence the prerequisite first and explain the order.

## Step 5: Create the branch and mark work started
`git checkout -b feature/$ARGUMENTS` and tell the user: "✅ Created branch feature/$ARGUMENTS from main."

Then record the **start-of-work resume point** so a returning session (human or AI) knows where
things stand even if work stops mid-build:
- **@docs/development/current-phase.md** — set **Active Phase** (from the backlog), add this feature
  to **In Progress** (ID + name + branch + status `🔨`), and note in plain terms what's next
  (deriving the story/plan, then building).
- **@docs/development/backlog.md** — mark this feature **🔨 In Progress** and record the branch.

(This is the companion to the end-of-feature update in `/commit-feature` — together they keep
`current-phase.md` a reliable "where are we right now" doc, not just an end-of-feature snapshot.)

## Step 6: Load context
Read the source docs the feature spec is derived from:
- @docs/product/PRD.md (the relevant feature + personas + scope)
- @docs/architecture/overview.md
- @docs/architecture/database.md (if data changes needed)
- @docs/architecture/api-contracts.md (if API changes needed)
- @docs/architecture/security.md (always skim for relevant constraints)
- @docs/product/design-system.md (skim if it exists and the feature has UI)

## Step 7: Derive the feature's story (the *what*)
Create **`docs/development/features/$ARGUMENTS-user-stories.md`** from the PRD + architecture, using the format in @docs/development/features/README.md: the user story plus **acceptance criteria, each ID'd `AC-1`, `AC-2`, …** (specific and testable).

- **Pure-infrastructure features** (scaffolding, env config — e.g. F-001, F-004): skip the story; go straight to the plan.
- Otherwise present the drafted story (confirmation point — per the decision policy): default, confirm with the user before continuing; autonomous, write it and proceed.

## Step 8: Derive the plan (the *how*)
Create **`docs/development/features/$ARGUMENTS-plan.md`** from the architecture docs, using the README format:
- **Approach** + **files to create/change**
- An **ordered task checklist**, with each task tagged to the criterion it serves (`(AC-1)`), including a **test task per criterion**
- The **criterion → test coverage table** (statuses start ⬜)
- A **Deviations** section (start "None")

Present the plan (confirmation point — per the decision policy): default, wait for approval before writing code; autonomous, proceed.

## Step 9: Build
Work the task checklist in `$ARGUMENTS-plan.md`, ticking tasks and updating the coverage table as tests are written and passing. Keep the story's acceptance criteria as the target. If the work reveals something the architecture/PRD didn't anticipate, note it in the plan's **Deviations** section (and in autonomous mode, escalate if it exceeds what the stack supports — per `.claude/rules/escalation.md`).

## Step 10: Remind
Tell the user: "When the feature works, run `/validate` (it checks every acceptance criterion has a passing test), then `/commit-feature` to finish."
